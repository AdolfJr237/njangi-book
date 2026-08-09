from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.membership import Membership


def memberships_as_of(db: Session, group_id: int, as_of: datetime) -> list[Membership]:
    """
    Reconstructs "who was actually a member of this group at a given
    point in time" -- used when viewing a PAST meeting's ledger, so a
    since-removed member's row and their share of the expected pot
    don't silently vanish from history they were genuinely part of, and
    a since-joined member doesn't appear in cycles that predate them.

    For the CURRENT open meeting, callers should keep using is_active
    directly (today's roster) rather than this -- it's only needed once
    a meeting is in the past.
    """
    return (
        db.query(Membership)
        .options(joinedload(Membership.user))
        .filter(
            Membership.group_id == group_id,
            Membership.joined_at <= as_of,
            or_(Membership.removed_at.is_(None), Membership.removed_at > as_of),
        )
        .order_by(Membership.rotation_position)
        .all()
    )
