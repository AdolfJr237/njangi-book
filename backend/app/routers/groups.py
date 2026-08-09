from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.contribution_status import get_active_contributions_for_meetings
from app.core.dependencies import get_current_user, get_membership_for_group
from app.core.invite_codes import generate_unique_invite_code
from app.core.scheduling import advance_date_by_frequency
from app.database import get_db
from app.models.enums import MeetingStatus, MembershipRole
from app.models.group import Group
from app.models.meeting import Meeting
from app.models.membership import Membership
from app.models.user import User
from app.schemas.group import CreateGroupRequest, GroupHomeOut, GroupOut, GroupSummary, JoinGroupRequest

router = APIRouter(prefix="/groups", tags=["groups"])


@router.post("", response_model=GroupOut, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: CreateGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a group, makes the caller its treasurer, and opens the first
    meeting -- all three happen together because a group with no
    treasurer or no open cycle isn't a usable group. If any step failed
    partway, we'd rather the whole thing roll back than leave a broken
    half-created group in the database.
    """
    group = Group(
        name=payload.name,
        contribution_amount=payload.contribution_amount,
        meeting_frequency=payload.meeting_frequency,
        creator_id=current_user.id,
        start_date=payload.start_date,
        invite_code=generate_unique_invite_code(db),
    )
    db.add(group)
    # flush() sends the INSERT and gets group.id back from the database,
    # without ending the transaction -- we need that id for the rows
    # below, but everything still commits (or rolls back) together.
    db.flush()

    treasurer_membership = Membership(
        user_id=current_user.id,
        group_id=group.id,
        role=MembershipRole.TREASURER,
        rotation_position=1,
    )
    db.add(treasurer_membership)
    db.flush()

    # Cycle 1 opens immediately, collected by whoever holds rotation
    # position 1 -- for a brand new group, that's the creator. Rotation
    # Schedule and Contributions Ledger both read this meeting.
    first_meeting = Meeting(
        group_id=group.id,
        meeting_date=group.start_date,
        collector_membership_id=treasurer_membership.id,
        status=MeetingStatus.SCHEDULED,
    )
    db.add(first_meeting)

    db.commit()
    db.refresh(group)
    return GroupOut.model_validate(group)


@router.post("/join", response_model=GroupOut)
def join_group(
    payload: JoinGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds the caller to a group as an ordinary member. Invite codes are
    matched case-insensitively (normalized to uppercase) since a phone
    keyboard's autocapitalize can't always be trusted, and a code being
    rejected over casing alone would be a confusing dead end for someone
    just trying to join their family's njangi.
    """
    code = payload.invite_code.strip().upper()
    group = db.query(Group).filter(Group.invite_code == code).first()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    already_member = (
        db.query(Membership)
        .filter(Membership.group_id == group.id, Membership.user_id == current_user.id)
        .first()
    )
    if already_member is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You're already a member of this group",
        )

    # New members join at the end of the rotation order, per CLAUDE.md --
    # simple and fair for now. A treasurer-configurable rotation order is
    # a known future improvement, not built yet.
    last_position = (
        db.query(func.max(Membership.rotation_position))
        .filter(Membership.group_id == group.id)
        .scalar()
        or 0
    )

    membership = Membership(
        user_id=current_user.id,
        group_id=group.id,
        role=MembershipRole.MEMBER,
        rotation_position=last_position + 1,
    )
    db.add(membership)
    db.commit()
    db.refresh(group)
    return GroupOut.model_validate(group)


@router.get("", response_model=list[GroupSummary])
def list_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Powers the Dashboard. Scoped implicitly by construction: it only
    ever queries Membership rows for current_user.id, so there's no way
    to get another user's groups back from this endpoint -- there's
    nothing to accidentally leak here regardless of what any group_id
    looks like, because no group_id is ever taken as input.

    Written as two queries total, not one query per group. Looping and
    running a separate "what's this group's open meeting" query per
    membership is exactly the N+1 pattern the Security/Scalability doc
    calls out as the most common performance killer -- fine at 2 groups,
    real once someone has 20.
    """
    memberships = (
        db.query(Membership)
        .options(joinedload(Membership.group))
        .filter(Membership.user_id == current_user.id, Membership.is_active.is_(True))
        .all()
    )
    if not memberships:
        return []

    group_ids = [m.group_id for m in memberships]
    open_meetings = (
        db.query(Meeting)
        .options(joinedload(Meeting.collector).joinedload(Membership.user))
        .filter(Meeting.group_id.in_(group_ids), Meeting.status == MeetingStatus.SCHEDULED)
        .all()
    )
    # Assumes one open meeting per group at a time -- true today since
    # nothing advances a cycle yet (that's a later session).
    meeting_by_group_id = {meeting.group_id: meeting for meeting in open_meetings}

    # Whether the CALLER SPECIFICALLY has already paid into each open
    # meeting -- one query, not one per group. A contribution row here
    # can only belong to the caller because payer_membership_id is always
    # one of their own membership ids (each Membership row is one
    # user-in-one-group, so this can't leak another member's payment).
    meeting_ids = [meeting.id for meeting in open_meetings]
    membership_ids = set(m.id for m in memberships)
    # get_active_contributions_for_meetings excludes reversal rows AND
    # any original a reversal points at -- if this caller's only
    # contribution to a meeting was later reversed, that meeting must
    # NOT count as paid here, or their due date would stay advanced
    # even though they're back to owing.
    active_contributions = get_active_contributions_for_meetings(db, meeting_ids)
    paid_meeting_ids = {
        c.meeting_id for c in active_contributions if c.payer_membership_id in membership_ids
    }

    summaries = []
    for membership in memberships:
        group = membership.group
        meeting = meeting_by_group_id.get(group.id)
        collector_name = meeting.collector.user.full_name if meeting and meeting.collector else None

        next_due_date = None
        if meeting:
            # Per CLAUDE.md/Adolf: this is personal to the caller, not a
            # group-wide cycle advance. Once THIS user has paid for the
            # open meeting, their own due date jumps forward one
            # frequency interval; until then it stays on the current
            # meeting's date, because they still owe for it. Other
            # members paying (or not) doesn't move this user's date --
            # collector rotation and Meeting rows are untouched here.
            has_paid = meeting.id in paid_meeting_ids
            next_due_date = (
                advance_date_by_frequency(meeting.meeting_date, group.meeting_frequency)
                if has_paid
                else meeting.meeting_date
            )

        summaries.append(
            GroupSummary(
                id=group.id,
                name=group.name,
                contribution_amount=group.contribution_amount,
                invite_code=group.invite_code,
                collector_name=collector_name,
                next_due_date=next_due_date,
                my_role=membership.role,
            )
        )
    return summaries


@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    One group's own details -- currently just used to re-display the
    invite code (e.g. from the More tab) after the one-time creation
    alert is gone. get_membership_for_group already confirmed the caller
    belongs to this group before this function body even runs; a group
    you're not a member of 404s here the same as one that doesn't exist.
    """
    group = db.query(Group).filter(Group.id == membership.group_id).first()
    return GroupOut.model_validate(group)


@router.get("/{group_id}/home", response_model=GroupHomeOut)
def get_group_home(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Powers the Group Home hub: whose turn, this cycle's real pot, and
    whether the caller themselves has paid yet. No welfare balance field
    -- Welfare stays "Coming soon" this session, and putting a number
    for it here would be exactly the fake-financial-data problem this
    whole pass exists to remove.
    """
    group = db.query(Group).filter(Group.id == membership.group_id).first()

    # Counts real meetings only -- a VOIDED meeting (an accidental close
    # that got undone via cycle/reopen) never happened as far as cycle
    # numbering is concerned, so it's excluded rather than leaving a
    # confusing gap in the count.
    cycle_number = (
        db.query(Meeting)
        .filter(Meeting.group_id == group.id, Meeting.status != MeetingStatus.VOIDED)
        .count()
    )

    current_meeting = (
        db.query(Meeting)
        .options(joinedload(Meeting.collector).joinedload(Membership.user))
        .filter(Meeting.group_id == group.id, Meeting.status == MeetingStatus.SCHEDULED)
        .order_by(Meeting.meeting_date)
        .first()
    )

    collecting_date = None
    collector_name = None
    collector_position = None
    total_pot = 0.0
    has_paid = False

    if current_meeting:
        collecting_date = current_meeting.meeting_date
        if current_meeting.collector:
            collector_name = current_meeting.collector.user.full_name
            collector_position = current_meeting.collector.rotation_position

        # Same active-only filter as everywhere else -- a reversed
        # contribution must not still swell the pot or make its payer
        # look paid. filter_active excludes both the reversal row and
        # the original it cancels, so the sum/membership-check below
        # never has to know about reversals specifically.
        active_contributions = get_active_contributions_for_meetings(db, [current_meeting.id])
        total_pot = sum(c.amount for c in active_contributions)
        has_paid = any(c.payer_membership_id == membership.id for c in active_contributions)

    return GroupHomeOut(
        id=group.id,
        name=group.name,
        contribution_amount=group.contribution_amount,
        cycle_number=cycle_number,
        collecting_date=collecting_date,
        collector_name=collector_name,
        collector_position=collector_position,
        total_pot_this_cycle=float(total_pot),
        has_paid_this_cycle=has_paid,
        my_role=membership.role,
    )
