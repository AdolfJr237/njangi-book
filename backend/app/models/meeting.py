from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import MeetingStatus


class Meeting(Base):
    """One scheduled cycle for a group. collector_membership_id is the
    pointer that drives 'whose turn' -- it advances to the next
    membership each time a cycle completes."""

    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    meeting_date = Column(Date, nullable=False)
    collector_membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=True)
    status = Column(SAEnum(MeetingStatus, native_enum=False), nullable=False, default=MeetingStatus.SCHEDULED)
    # Which full lap of the rotation this meeting belongs to. Stored
    # rather than inferred from collector history, because inference
    # breaks the moment membership changes between rounds (someone joins
    # or is removed) -- a counter that increments on wraparound doesn't
    # care about that.
    round_number = Column(Integer, nullable=False, default=1, server_default="1")
    # Python-side default, not just server_default -- see
    # Membership.joined_at for why: SQLite's CURRENT_TIMESTAMP only has
    # second resolution, which record_contribution and the outstanding
    # list both need finer than that when comparing this against
    # Membership.joined_at.
    created_at = Column(DateTime(), default=datetime.utcnow, server_default=func.now())

    group = relationship("Group")
    collector = relationship("Membership")
