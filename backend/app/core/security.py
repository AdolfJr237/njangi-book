from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Bundles the given claims (we only put {'sub': user_id} in) plus an
    expiry into a signed JWT. Signed, not encrypted -- anyone can read
    the payload, but only someone with SECRET_KEY can produce a token
    that verifies. That's why SECRET_KEY must never leak or be committed.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict:
    """Raises jose.JWTError if the token is invalid, tampered with, or expired."""
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
