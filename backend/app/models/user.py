from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    """
    A person's login identity. Notice this is NOT where role lives --
    role (treasurer/member) is per-group, so it lives on Membership
    instead. A user can be treasurer in one njangi and an ordinary
    member in another.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)
    # Stamped into every JWT issued for this user (see create_access_token).
    # Bumped whenever the password is reset, which is what invalidates
    # every token issued before that moment -- a stateless equivalent of
    # "log out all other sessions" with no server-side session table.
    token_version = Column(Integer, nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(), server_default=func.now())

    memberships = relationship("Membership", back_populates="user")
