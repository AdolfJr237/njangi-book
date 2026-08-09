from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    """
    What we send back to the client when describing a user. Notice
    password_hash isn't here -- this schema is the allowlist of fields
    that are safe to expose. Even if someone passes a full User DB
    object to a response, Pydantic only serializes what's listed here.
    """

    id: int
    full_name: str
    phone_number: str
    photo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)
