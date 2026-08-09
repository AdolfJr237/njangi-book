from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1)
    phone_number: str = Field(min_length=1)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    phone_number: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    # Same min_length=8 as SignupRequest and VerifyPasswordResetRequest --
    # one rule, applied everywhere a password gets set, not three copies
    # that could quietly drift apart.
    new_password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    """
    Sent back after a successful signup or login. The mobile app stores
    access_token and attaches it as 'Authorization: Bearer <token>' on
    every request that needs to know who's asking. Sending the user
    object alongside the token saves the app an extra round trip to
    fetch profile info right after login.
    """

    access_token: str
    token_type: str = "bearer"
    user: UserOut
