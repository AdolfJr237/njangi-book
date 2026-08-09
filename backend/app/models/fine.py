from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import FineStatus


class Fine(Base):
    __tablename__ = "fines"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(SAEnum(FineStatus, native_enum=False), nullable=False, default=FineStatus.UNPAID)
    fine_date = Column(Date, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(), server_default=func.now())
    updated_at = Column(DateTime(), server_default=func.now(), onupdate=func.now())

    group = relationship("Group")
    membership = relationship("Membership")
    recorded_by = relationship("User")
