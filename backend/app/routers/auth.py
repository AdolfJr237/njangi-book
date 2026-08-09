from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, LoginRequest, SignupRequest, TokenResponse
from app.schemas.user import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    user = User(
        full_name=payload.full_name,
        phone_number=payload.phone_number,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "tv": user.token_version})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    token = create_access_token(data={"sub": str(user.id), "tv": user.token_version})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Proves the protected-route dependency works end to end -- call
    this with a valid token and it echoes back who you are."""
    return current_user


@router.post("/change-password", response_model=TokenResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Different from /request-reset + /verify-reset on purpose. Reset (OTP)
    exists for someone who's LOCKED OUT and has no other way to prove
    they're really the account owner -- a code sent to their phone is
    the identity proof, standing in for the password they can't provide.

    This endpoint is for someone who's already logged in and already
    knows their password, just wants to change it. Proving you know the
    CURRENT password is at least as strong an identity check as an OTP
    (arguably stronger -- it doesn't depend on SMS delivery, and it's the
    same credential the account is actually protected by), so routing
    this through the phone network would add cost and failure points for
    no real security benefit. get_current_user has already confirmed
    who's asking; this only additionally confirms they still know their
    own password before letting them replace it.
    """
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(payload.new_password)
    # Bumping this invalidates every token issued before now -- including
    # this request's own token. That's fine: the fresh token returned
    # below replaces it immediately, so THIS device stays logged in with
    # no re-entry needed, while any OTHER device still holding the old
    # token gets logged out the next time it makes a request.
    current_user.token_version += 1
    db.commit()
    db.refresh(current_user)

    token = create_access_token(data={"sub": str(current_user.id), "tv": current_user.token_version})
    return TokenResponse(access_token=token, user=UserOut.model_validate(current_user))
