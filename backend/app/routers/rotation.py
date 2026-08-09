from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_membership_for_group
from app.database import get_db
from app.models.enums import MeetingStatus
from app.models.group import Group
from app.models.meeting import Meeting
from app.models.membership import Membership
from app.schemas.rotation import RotationMemberStatus, RotationScheduleOut

# Nested under /groups/{group_id} like contributions -- rotation only
# ever makes sense in the context of one group's own membership order.
router = APIRouter(prefix="/groups/{group_id}", tags=["rotation"])


@router.get("/rotation", response_model=RotationScheduleOut)
def get_rotation_schedule(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Whose turn it is, in order. Visible to every member, not just the
    treasurer -- same full-ledger-transparency principle as the
    Contributions Ledger.
    """
    group = db.query(Group).filter(Group.id == group_id).first()

    all_memberships = (
        db.query(Membership)
        .options(joinedload(Membership.user))
        .filter(Membership.group_id == group_id, Membership.is_active.is_(True))
        .order_by(Membership.rotation_position)
        .all()
    )

    current_meeting = (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status == MeetingStatus.SCHEDULED)
        .order_by(Meeting.meeting_date)
        .first()
    )
    current_collector_id = current_meeting.collector_membership_id if current_meeting else None
    current_round = current_meeting.round_number if current_meeting else None

    # "done" means collected THIS round, not "ever collected" -- once
    # cycle advancement wraps back to the first member, everyone would
    # otherwise show "done" forever, which defeats the point of this
    # screen (showing who's still waiting THIS lap). Scoping to
    # round_number is what makes it reset each round.
    completed_this_round = (
        db.query(Meeting)
        .filter(
            Meeting.group_id == group_id,
            Meeting.status == MeetingStatus.COMPLETED,
            Meeting.round_number == current_round,
        )
        .all()
        if current_round is not None
        else []
    )
    collected_date_by_membership_id = {
        m.collector_membership_id: m.meeting_date for m in completed_this_round if m.collector_membership_id
    }

    # Excludes VOIDED meetings (an accidental close that got undone via
    # cycle/reopen never happened, cycle-numbering-wise).
    cycle_number = (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status != MeetingStatus.VOIDED)
        .count()
    )

    members = []
    for m in all_memberships:
        if m.id in collected_date_by_membership_id:
            member_status = "done"
        elif m.id == current_collector_id:
            member_status = "current"
        else:
            member_status = "pending"

        members.append(
            RotationMemberStatus(
                membership_id=m.id,
                name=m.user.full_name,
                rotation_position=m.rotation_position,
                status=member_status,
                collected_date=collected_date_by_membership_id.get(m.id),
            )
        )

    return RotationScheduleOut(
        cycle_number=cycle_number,
        round_number=current_round if current_round is not None else 1,
        member_count=len(all_memberships),
        pot_amount=group.contribution_amount * len(all_memberships),
        members=members,
    )
