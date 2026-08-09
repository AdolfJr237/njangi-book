from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import MeetingFrequency


class Group(Base):
    """One njangi. The person who creates it becomes its treasurer --
    that assignment happens in the router/service layer, not here."""

    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contribution_amount = Column(Float, nullable=False)
    meeting_frequency = Column(SAEnum(MeetingFrequency, native_enum=False), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(Date, nullable=False)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(), server_default=func.now())

    creator = relationship("User")
    memberships = relationship("Membership", back_populates="group")
