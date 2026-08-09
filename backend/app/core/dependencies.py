from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.enums import MembershipRole
from app.models.membership import Membership
from app.models.user import User

# tokenUrl just tells FastAPI's auto-generated docs (/docs) which endpoint
# issues tokens, for the "Authorize" button. It doesn't affect real
# requests -- those just need a valid "Authorization: Bearer <token>"
# header, sent from wherever.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    The protected-route dependency. Any router function that adds
    `current_user: User = Depends(get_current_user)` as a parameter
    automatically requires a valid Bearer token -- FastAPI resolves this
    dependency before the route body runs, and a bad/missing/expired
    token means the request never reaches your code; it gets a 401.

    This is also where role checks for treasurer-only actions will hook
    in later (e.g. a get_current_treasurer dependency that calls this
    one first, then checks the Membership row for the group in the URL).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    # Missing "tv" claim (a token issued before this feature existed)
    # is treated as version 0, matching every existing user's default --
    # so this doesn't retroactively log out sessions that were already
    # valid before password reset existed. Once ANY reset happens for a
    # user, their token_version moves off 0 and old tokens stop matching.
    token_version = payload.get("tv", 0)
    if token_version != user.token_version:
        raise credentials_exception
    return user


def get_membership_for_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Membership:
    """
    The data-scoping dependency (Security doc: "a user may only ever
    access data for groups they belong to"). Any route with a
    `group_id` path parameter can add
    `membership: Membership = Depends(get_membership_for_group)` and get
    two things for free: proof the caller actually belongs to this
    group, and their Membership row for it (which is where role checks
    read from -- see get_treasurer_membership below).

    Returns 404, not 403, when there's no membership. 403 would confirm
    "this group exists, you just can't see it" -- 404 says "not found"
    whether the group doesn't exist or you don't have access, so a
    caller can't walk group IDs to learn which ones are real.

    Filtering on is_active here means a soft-removed member is treated
    as "not a member" everywhere in the app automatically -- every route
    that depends on this one (directly or via get_treasurer_membership)
    inherits the same 404 for free, with no per-route change needed.
    """
    membership = (
        db.query(Membership)
        .filter(
            Membership.group_id == group_id,
            Membership.user_id == current_user.id,
            Membership.is_active.is_(True),
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return membership


def get_treasurer_membership(
    membership: Membership = Depends(get_membership_for_group),
) -> Membership:
    """
    Layers on top of get_membership_for_group: confirms membership first
    (so a non-member gets the same 404 as above, not a 403 that would
    reveal the group exists), then checks role. A member calling a
    treasurer-only endpoint directly -- bypassing the UI entirely --
    gets rejected here regardless of what the app's buttons show.
    """
    if membership.role != MembershipRole.TREASURER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group's treasurer can do this",
        )
    return membership
