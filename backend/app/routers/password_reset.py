from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.firebase_auth import (
    FirebasePhoneVerificationError,
    revoke_firebase_sessions,
    verify_phone_id_token,
)
from app.core.security import hash_password
from app.database import get_db
from app.models.user import User
from app.schemas.password_reset import FirebasePasswordResetRequest, FirebasePasswordResetResponse

router = APIRouter(prefix="/auth", tags=["password-reset"])


@router.post("/firebase-reset", response_model=FirebasePasswordResetResponse)
def reset_password_with_firebase(
    payload: FirebasePasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Reset only after Firebase proves control of the registered phone number."""
    try:
        firebase_uid, verified_phone = verify_phone_id_token(payload.firebase_id_token)
    except FirebasePhoneVerificationError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone verification is invalid or has expired. Request a new code.",
        ) from error

    # The number comes from Firebase's signed token, not from the mobile
    # request. This prevents someone proving one phone but resetting another
    # member's account by changing a JSON field.
    user = db.query(User).filter(User.phone_number == verified_phone).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No NjangiBook account matches this verified phone number.",
        )

    try:
        # Revoke Firebase refresh tokens before committing. If the external
        # call fails, no password change is committed; if it succeeds, the
        # proof cannot later be refreshed and reused for another reset.
        revoke_firebase_sessions(firebase_uid)
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not securely finish password recovery. Please try again.",
        ) from error

    user.password_hash = hash_password(payload.new_password)
    # Invalidates all existing NjangiBook JWTs, including sessions on other
    # devices. Firebase only proves phone control; FastAPI owns this session
    # policy and the application's password record.
    user.token_version += 1
    db.commit()

    return FirebasePasswordResetResponse(
        message="Password reset successfully. Please log in with your new password."
    )
