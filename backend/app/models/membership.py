from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import MembershipRole


class Membership(Base):
    """
    The join table between User and Group. This is the piece that makes
    "treasurer in one group, ordinary member in another" possible: role
    and rotation_position are attributes of the (user, group) pair, not
    of the user alone. Almost every other ledger table points at a
    Membership rather than a User directly, for the same reason -- it
    ties a record to "this person, in this specific group."
    """

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "group_id", name="uq_user_group"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    role = Column(SAEnum(MembershipRole, native_enum=False), nullable=False, default=MembershipRole.MEMBER)
    rotation_position = Column(Integer, nullable=True)
    # Python-side default (datetime.utcnow, naive -- matches how every
    # other timestamp comparison in this app already has to work around
    # SQLite returning naive datetimes regardless of timezone=True),
    # not just server_default: SQLite's CURRENT_TIMESTAMP only has
    # SECOND resolution, which isn't fine enough for record_contribution
    # and the outstanding-list logic that compare this against
    # Meeting.created_at to decide "was this member here yet" -- two
    # events landing in the same second (an automated test, or in
    # principle a very fast real signup-then-join) would otherwise be
    # unorderable. server_default stays as a fallback for any insert
    # that bypasses the ORM.
    joined_at = Column(DateTime(), default=datetime.utcnow, server_default=func.now())
    # Soft delete only, per NjangiBook_Security_Scalability.md -- removing
    # a member must not erase their history. Every query that lists a
    # group's members filters on this; the row and everything it's
    # foreign-keyed from (Contributions, etc.) stays in the database
    # untouched.
    is_active = Column(Boolean, nullable=False, default=True, server_default="1")
    # Set only when is_active flips to False. Lets a PAST meeting's
    # member list and expected pot be reconstructed as "who was actually
    # a member as of that meeting" instead of today's roster -- without
    # this, viewing an old cycle after someone's been removed would
    # silently shrink the expected total and erase their row from
    # history they were genuinely part of.
    removed_at = Column(DateTime(), nullable=True)

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="memberships")
