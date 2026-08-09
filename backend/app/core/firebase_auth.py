"""Backend-only verification of Firebase Phone Authentication proofs."""

import json
from pathlib import Path

import firebase_admin
from firebase_admin import auth, credentials
from firebase_admin.exceptions import FirebaseError

from app.config import settings


class FirebasePhoneVerificationError(ValueError):
    """The client did not provide a valid, current Firebase phone proof."""


def _get_firebase_app():
    """Initialise Firebase Admin once, only when password recovery needs it."""
    try:
        return firebase_admin.get_app()
    except ValueError:
        # No default app exists yet, so initialise it below. Avoiding the
        # package's private _apps registry keeps this compatible with future
        # Firebase Admin releases.
        pass

    try:
        if settings.firebase_service_account_json:
            credential_data = json.loads(settings.firebase_service_account_json)
            credential = credentials.Certificate(credential_data)
        elif settings.firebase_service_account_path:
            credential_path = Path(settings.firebase_service_account_path)
            if not credential_path.is_file():
                raise FileNotFoundError(credential_path)
            credential = credentials.Certificate(str(credential_path))
        else:
            raise RuntimeError("Firebase Admin credentials are not configured")
        return firebase_admin.initialize_app(credential)
    except (OSError, ValueError, FirebaseError) as error:
        raise RuntimeError("Firebase Admin is not configured correctly") from error


def verify_phone_id_token(id_token: str) -> tuple[str, str]:
    """Return Firebase UID and verified E.164 phone number, never client input."""
    try:
        decoded = auth.verify_id_token(id_token, app=_get_firebase_app(), check_revoked=True)
    except (FirebaseError, ValueError) as error:
        raise FirebasePhoneVerificationError from error

    provider = decoded.get("firebase", {}).get("sign_in_provider")
    phone_number = decoded.get("phone_number")
    uid = decoded.get("uid")
    if provider != "phone" or not isinstance(phone_number, str) or not isinstance(uid, str):
        raise FirebasePhoneVerificationError

    return uid, phone_number


def revoke_firebase_sessions(uid: str) -> None:
    """Make the proof used for recovery non-reusable after a successful reset."""
    try:
        auth.revoke_refresh_tokens(uid, app=_get_firebase_app())
    except FirebaseError as error:
        raise RuntimeError("Could not complete secure Firebase session invalidation") from error
