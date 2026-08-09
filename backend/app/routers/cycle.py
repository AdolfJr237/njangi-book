from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.contribution_status import filter_active
from app.core.dependencies import get_treasurer_membership
from app.core.notifications import create_notification
from app.core.scheduling import advance_date_by_frequency
from app.database import get_db
from app.models.contribution import Contribution
from app.models.enums import MeetingStatus, NotificationType
from app.models.group import Group
from app.models.meeting import Meeting
from app.models.membership import Membership
from app.schemas.cycle import CloseCycleResult, ReopenCycleResult

router = APIRouter(prefix="/groups/{group_id}/cycle", tags=["cycle"])


def _get_open_meeting(db: Session, group_id: int) -> Meeting | None:
    return (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status == MeetingStatus.SCHEDULED)
        .order_by(Meeting.meeting_date)
        .first()
    )


@router.post("/close", response_model=CloseCycleResult)
def close_cycle(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Treasurer-confirmed advancement, never automatic -- a single late
    payer must not freeze the group forever, so unpaid members simply
    carry their unpaid contribution forward (no row is written for
    them; the absence of a Contribution against the now-COMPLETED
    meeting IS the permanent record that they owed for this cycle).

    Next collector is picked from the ACTIVE-only membership list,
    ordered by rotation_position, by INDEX in that list -- never by
    arithmetic on the raw position number. That's what makes a removed
    member's gap in the numbering harmless: they're simply not in this
    list, so there's nothing to skip incorrectly. This depends on the
    current collector always being active, which Members already
    guarantees by blocking removal of whoever is collecting.
    """
    group = db.query(Group).filter(Group.id == group_id).first()

    current_meeting = _get_open_meeting(db, group_id)
    if current_meeting is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No open cycle to close")

    active_memberships = (
        db.query(Membership)
        .options(joinedload(Membership.user))
        .filter(Membership.group_id == group_id, Membership.is_active.is_(True))
        .order_by(Membership.rotation_position)
        .all()
    )
    if not active_memberships:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active members in this group")

    current_index = next(
        (i for i, m in enumerate(active_memberships) if m.id == current_meeting.collector_membership_id),
        -1,
    )
    started_new_round = current_index == len(active_memberships) - 1
    next_collector = active_memberships[(current_index + 1) % len(active_memberships)]

    # Named explicitly rather than left as a count -- the treasurer
    # should see exactly who's carrying forward an unpaid contribution.
    # filter_active() here matters: without it, a member whose only
    # contribution this cycle got reversed would still show as "paid"
    # (their reversed row still exists, it's just excluded), and would
    # wrongly NOT carry forward as owing.
    all_contributions_this_meeting = db.query(Contribution).filter(
        Contribution.meeting_id == current_meeting.id
    ).all()
    paid_membership_ids = {row.payer_membership_id for row in filter_active(all_contributions_this_meeting)}
    unpaid_names = [m.user.full_name for m in active_memberships if m.id not in paid_membership_ids]

    current_meeting.status = MeetingStatus.COMPLETED

    new_meeting = Meeting(
        group_id=group_id,
        meeting_date=advance_date_by_frequency(current_meeting.meeting_date, group.meeting_frequency),
        collector_membership_id=next_collector.id,
        status=MeetingStatus.SCHEDULED,
        round_number=current_meeting.round_number + 1 if started_new_round else current_meeting.round_number,
    )
    db.add(new_meeting)
    # flush, not commit yet -- need new_meeting.id for related_meeting_id
    # on the notifications below, but everything still lands in one
    # transaction together.
    db.flush()

    # Exactly ONE notification per active member for this close -- never
    # a personal one stacked on top of the generic group announcement.
    # Each member's own facts (are they the new collector? did they not
    # pay?) get combined into a single personal message when either is
    # true; only a member with NEITHER fact gets the generic "cycle
    # closed, X is now collecting" announcement instead. A member who is
    # BOTH the new collector AND was left owing gets one message
    # mentioning both, never two separate notifications.
    for m in active_memberships:
        is_new_collector = m.id == next_collector.id
        is_owing = m.id not in paid_membership_ids

        personal_facts = []
        if is_new_collector:
            personal_facts.append(f"It's your turn to collect this cycle, due {new_meeting.meeting_date}.")
        if is_owing:
            personal_facts.append(
                f"You're owing {group.contribution_amount:,.0f} XAF for the cycle that closed on "
                f"{current_meeting.meeting_date}."
            )

        if personal_facts:
            notif_type = NotificationType.YOUR_TURN_TO_COLLECT if is_new_collector else NotificationType.CYCLE_CLOSED_OWING
            message = " ".join(personal_facts)
        else:
            notif_type = NotificationType.CYCLE_CLOSED_ANNOUNCEMENT
            message = f"Cycle closed. {next_collector.user.full_name} is now collecting."

        create_notification(
            db,
            user_id=m.user_id,
            group_id=group_id,
            type=notif_type,
            message=message,
            related_meeting_id=new_meeting.id if is_new_collector else current_meeting.id,
        )

    db.commit()
    db.refresh(new_meeting)

    return CloseCycleResult(
        previous_meeting_date=current_meeting.meeting_date,
        new_meeting_date=new_meeting.meeting_date,
        new_collector_name=next_collector.user.full_name,
        started_new_round=started_new_round,
        round_number=new_meeting.round_number,
        unpaid_member_names=unpaid_names,
    )


@router.post("/reopen", response_model=ReopenCycleResult)
def reopen_cycle(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Undo for an accidental close -- deliberately NOT a deletion. The
    meeting that was mistakenly opened is marked VOIDED (never removed
    from the database), and the meeting it closed goes back to
    SCHEDULED. This leaves a permanent, visible trail that a cycle was
    closed and then undone, rather than erasing the mistake as if it
    never happened.

    Only allowed while the mistakenly-opened meeting has ZERO
    Contributions recorded against it -- the moment a real payment has
    landed in the new cycle, the close reflected something that
    actually happened, and reopening would risk destroying real data.
    No separate time limit on top of this: "nothing of consequence has
    happened yet" is the meaningful gate, not a guessed clock.

    This can only ever undo the SINGLE most recent close -- there's no
    "reopen" for a cycle two closes back.
    """
    current_meeting = _get_open_meeting(db, group_id)
    if current_meeting is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No open cycle to reopen")

    has_contributions = (
        db.query(Contribution).filter(Contribution.meeting_id == current_meeting.id).first() is not None
    )
    if has_contributions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This cycle already has contributions recorded and can't be undone this way",
        )

    previous_meeting = (
        db.query(Meeting)
        .options(joinedload(Meeting.collector).joinedload(Membership.user))
        .filter(Meeting.group_id == group_id, Meeting.status == MeetingStatus.COMPLETED)
        .order_by(Meeting.id.desc())
        .first()
    )
    if previous_meeting is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="There's no previous cycle to reopen")

    current_meeting.status = MeetingStatus.VOIDED
    previous_meeting.status = MeetingStatus.SCHEDULED
    db.commit()

    return ReopenCycleResult(
        reopened_meeting_date=previous_meeting.meeting_date,
        collector_name=previous_meeting.collector.user.full_name if previous_meeting.collector else None,
    )
