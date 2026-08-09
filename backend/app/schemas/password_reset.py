from pydantic import BaseModel, Field


class FirebasePasswordResetRequest(BaseModel):
    # This is a short-lived signed Firebase ID token obtained only after
    # Firebase Phone Auth verifies the user's SMS code. The caller never
    # supplies a phone number for the backend to trust.
    firebase_id_token: str = Field(min_length=1)
    new_password: str = Field(min_length=8)


class FirebasePasswordResetResponse(BaseModel):
    message: str
