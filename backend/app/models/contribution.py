from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Contribution(Base):
    """
    One row per member per meeting. This is the core ledger and the
    audit trail a treasurer or member points to when settling a dispute.

    recorded_by_id vs payer_membership_id: these are deliberately
    different columns. payer is who the money is about; recorded_by is
    who typed the entry in (always the treasurer). created_at/updated_at
    exist because we never hard-delete or silently edit a ledger row --
    if a correction is needed, it should be visible that something
    changed and when.
    """

    __tablename__ = "contributions"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    payer_membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    amount = Column(Float, nullable=False)
    paid_date = Column(Date, nullable=False)
    momo_screenshot_url = Column(String, nullable=True)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(), server_default=func.now())
    updated_at = Column(DateTime(), server_default=func.now(), onupdate=func.now())

    # Additive correction fields. A wrong entry is NEVER edited or
    # deleted -- reversing it adds a second row here that cancels the
    # first, and both stay in the table forever. is_reversal is True
    # only on that second, correcting row; reverses_contribution_id
    # (set only on the reversal row) points back at the original it
    # cancels. amount on a reversal row is stored NEGATIVE (equal and
    # opposite) so a raw SUM(amount) over this table -- even outside the
    # app's own filtered queries, e.g. a manual audit query -- always
    # nets to the true total on its own. The app's own "does this still
    # count" logic doesn't rely on that cancellation, though -- see
    # app/core/contribution_status.py for why.
    is_reversal = Column(Boolean, nullable=False, default=False)
    reverses_contribution_id = Column(Integer, ForeignKey("contributions.id"), nullable=True, index=True)
    reversal_reason = Column(String, nullable=True)

    group = relationship("Group")
    meeting = relationship("Meeting")
    payer = relationship("Membership", foreign_keys=[payer_membership_id])
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    reverses = relationship("Contribution", remote_side=[id])
