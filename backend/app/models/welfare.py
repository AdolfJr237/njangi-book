from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import WelfareEntryType


class WelfareEntry(Base):
    """
    A separate ledger from Contribution on purpose. The welfare/trouble
    fund has its own balance and flows both ways (money in from members,
    payouts out to a member in need). Payouts need a reason (funeral,
    sickness, birth); contributions don't. Folding this into Contribution
    would mean nullable fields that only make sense half the time --
    a separate table keeps each shape honest.
    """

    __tablename__ = "welfare_entries"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=True)
    entry_type = Column(SAEnum(WelfareEntryType, native_enum=False), nullable=False)
    amount = Column(Float, nullable=False)
    reason = Column(String, nullable=True)
    entry_date = Column(Date, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(), server_default=func.now())
    updated_at = Column(DateTime(), server_default=func.now(), onupdate=func.now())

    group = relationship("Group")
    membership = relationship("Membership", foreign_keys=[membership_id])
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
