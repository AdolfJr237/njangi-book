from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.contribution_status import filter_active
from app.core.dependencies import get_membership_for_group, get_treasurer_membership
from app.core.membership_history import memberships_as_of
from app.core.notifications import create_notification
from app.database import get_db
from app.models.contribution import Contribution
from app.models.enums import MeetingStatus, NotificationType
from app.models.group import Group
from app.models.membership import Membership
from app.models.meeting import Meeting
from app.schemas.contribution import (
    ContributionsLedgerOut,
    LedgerMemberStatus,
    MeetingSummary,
    MyContributionEntry,
    MyContributionsOut,
    OutstandingEntry,
    RecordContributionRequest,
    ReverseContributionRequest,
    ReverseContributionResult,
    ReversalEntry,
)

# Nested under /groups/{group_id}/contributions rather than its own
# /contributions prefix -- a contribution never makes sense outside the
# group it belongs to, and every query here needs group_id anyway to
# find the group's currently open meeting.
router = APIRouter(prefix="/groups/{group_id}/contributions", tags=["contributions"])


def _get_open_meeting(db: Session, group_id: int) -> Meeting | None:
    return (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status == MeetingStatus.SCHEDULED)
        .order_by(Meeting.meeting_date)
        .first()
    )


@router.get("", response_model=ContributionsLedgerOut)
def get_contributions_ledger(
    group_id: int,
    meeting_id: int | None = None,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Every member sees the same full ledger, not just their own row --
    the Security doc calls this out specifically: the group collectively
    auditing the treasurer is the main defense against under-recording
    or favoritism, so this is deliberately not scoped to "my contributions"
    (that's its own separate screen/endpoint).

    meeting_id is optional and defaults to the current open meeting --
    exactly today's behavior when omitted. Passing a past meeting's id
    (from GET .../meetings) browses that closed cycle's snapshot
    instead, which is what makes an unpaid contribution from Q1
    actually "visible in the ledger" rather than vanishing the moment
    the cycle closes.
    """
    group = db.query(Group).filter(Group.id == group_id).first()

    if meeting_id is not None:
        target_meeting = (
            db.query(Meeting).filter(Meeting.id == meeting_id, Meeting.group_id == group_id).first()
        )
        if target_meeting is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found in this group")
    else:
        target_meeting = _get_open_meeting(db, group_id)

    is_current_cycle = target_meeting is not None and target_meeting.status == MeetingStatus.SCHEDULED

    if target_meeting is None:
        all_memberships = []
    elif is_current_cycle:
        # Today's roster -- the open meeting is happening NOW, so
        # who's expected to pay is simply who's active right now.
        all_memberships = (
            db.query(Membership)
            .options(joinedload(Membership.user))
            .filter(Membership.group_id == group_id, Membership.is_active.is_(True))
            .order_by(Membership.rotation_position)
            .all()
        )
    else:
        # A past cycle -- who was a member back THEN, not today's
        # roster (Q2/Q3: a since-removed member's row and expected
        # share must not vanish from history they were part of, and a
        # since-joined member must not appear in cycles that predate
        # them).
        #
        # "Back then" means at the moment this cycle was superseded --
        # the NEXT meeting's created_at, not this meeting's OWN
        # created_at. The group's first meeting is created in the same
        # instant as the group itself, before any invited member could
        # possibly have joined, so using its own created_at here wrongly
        # erased every non-founding member from cycle 1's history the
        # moment it closed. Falls back to this meeting's own created_at
        # only if there's genuinely no later meeting (a VOIDED meeting
        # with nothing after it -- not reachable through the UI's cycle
        # picker, which already excludes VOIDED meetings, but kept safe
        # rather than crashing).
        next_meeting = (
            db.query(Meeting)
            .filter(Meeting.group_id == group_id, Meeting.id > target_meeting.id)
            .order_by(Meeting.id)
            .first()
        )
        as_of = next_meeting.created_at if next_meeting else target_meeting.created_at
        all_memberships = memberships_as_of(db, group_id, as_of)

    contributions_by_payer = {}
    reversals: list[ReversalEntry] = []
    if target_meeting:
        # ALL rows for this meeting -- originals AND their reversals --
        # loaded once. filter_active() below is what turns this into
        # "what currently counts"; the unfiltered list is what lets the
        # reversals themselves be shown (a treasurer or member browsing
        # this cycle needs to see the correction happened, not just the
        # corrected result).
        all_contributions = (
            db.query(Contribution)
            .options(
                joinedload(Contribution.recorded_by),
                joinedload(Contribution.reverses).joinedload(Contribution.payer).joinedload(Membership.user),
            )
            .filter(Contribution.meeting_id == target_meeting.id)
            .all()
        )
        active_contributions = filter_active(all_contributions)
        contributions_by_payer = {c.payer_membership_id: c for c in active_contributions}

        for c in all_contributions:
            if c.is_reversal:
                original = c.reverses
                reversals.append(
                    ReversalEntry(
                        original_contribution_id=original.id,
                        member_name=original.payer.user.full_name,
                        amount=original.amount,
                        original_paid_date=original.paid_date,
                        reversed_by_name=c.recorded_by.full_name,
                        reversed_at=c.created_at,
                        reason=c.reversal_reason,
                    )
                )

    members = []
    for m in all_memberships:
        contribution = contributions_by_payer.get(m.id)
        members.append(
            LedgerMemberStatus(
                membership_id=m.id,
                name=m.user.full_name,
                has_paid=contribution is not None,
                paid_date=contribution.paid_date if contribution else None,
                amount=contribution.amount if contribution else None,
                contribution_id=contribution.id if contribution else None,
            )
        )

    # Built from contributions_by_payer, which is already filtered to
    # ACTIVE contributions only -- a reversed payment's amount never
    # reaches this sum, and the member it belonged to is simply absent
    # from this dict, so paid_count doesn't count them either. This is
    # the whole mechanic: nothing here needs to know about reversals
    # specifically, because the reversed row was already excluded
    # upstream, once, in one place.
    total_collected = sum(c.amount for c in contributions_by_payer.values())
    paid_count = len(contributions_by_payer)
    member_count = len(all_memberships)

    return ContributionsLedgerOut(
        meeting_id=target_meeting.id if target_meeting else None,
        meeting_date=target_meeting.meeting_date if target_meeting else None,
        round_number=target_meeting.round_number if target_meeting else 1,
        is_current_cycle=is_current_cycle,
        contribution_amount=group.contribution_amount,
        total_expected=group.contribution_amount * member_count,
        total_collected=total_collected,
        paid_count=paid_count,
        member_count=member_count,
        ready_to_close=is_current_cycle and member_count > 0 and paid_count == member_count,
        members=members,
        reversals=reversals,
        my_role=membership.role,
    )


@router.get("/meetings", response_model=list[MeetingSummary])
def list_meetings(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Powers the Ledger's cycle picker -- every real meeting this group
    has ever had, oldest first, numbered by its position in that
    sequence. VOIDED meetings are excluded entirely: an accidental
    close that got undone via cycle/reopen was never a real cycle.
    """
    meetings = (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status != MeetingStatus.VOIDED)
        .order_by(Meeting.id)
        .all()
    )
    return [
        MeetingSummary(
            id=m.id,
            cycle_number=index + 1,
            round_number=m.round_number,
            meeting_date=m.meeting_date,
            status=m.status.value,
        )
        for index, m in enumerate(meetings)
    ]


def _build_contributions_summary(
    db: Session, group_id: int, target_membership: Membership, viewer_role
) -> MyContributionsOut:
    """
    Shared by /mine and /member/{id} -- same computation, different
    whose-history-is-this target. target_membership is who the history
    belongs to; viewer_role is the CALLER's own role (only equal to
    target_membership.role when viewing your own history), since
    my_role on the response always means "can the viewer act here," not
    "what role does the target hold."
    """
    all_meetings = (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status != MeetingStatus.VOIDED)
        .order_by(Meeting.id)
        .all()
    )
    cycle_number_by_meeting_id = {m.id: index + 1 for index, m in enumerate(all_meetings)}
    meeting_by_id = {m.id: m for m in all_meetings}

    contributions = (
        db.query(Contribution)
        .options(joinedload(Contribution.recorded_by))
        .filter(Contribution.group_id == group_id, Contribution.payer_membership_id == target_membership.id)
        .order_by(Contribution.paid_date.desc())
        .all()
    )
    # Both the reversal row and the original it points at are always
    # among these rows (both share this same payer_membership_id), so
    # filter_active() has everything it needs to work out which ones
    # still count.
    active_contributions = filter_active(contributions)
    reversed_ids = {c.reverses_contribution_id for c in contributions if c.reverses_contribution_id is not None}

    # History shows EVERY row, reversals included -- this is the
    # "stays permanently visible" half of additive correction. Each
    # entry is tagged so the frontend can render a reversed original
    # struck through and its reversal labeled distinctly, rather than
    # either one silently disappearing.
    history = [
        MyContributionEntry(
            id=c.id,
            cycle_number=cycle_number_by_meeting_id.get(c.meeting_id, 0),
            meeting_date=meeting_by_id[c.meeting_id].meeting_date,
            amount=c.amount,
            paid_date=c.paid_date,
            recorded_by_name=c.recorded_by.full_name,
            is_reversal=c.is_reversal,
            reversed=c.id in reversed_ids,
        )
        for c in contributions
    ]

    group = db.query(Group).filter(Group.id == group_id).first()
    # Outstanding is built from ACTIVE contributions only -- this is the
    # "undoes its effect on every total" half. A meeting whose only
    # contribution was reversed has no active row anymore, so it's
    # exactly as if it were never paid: it reappears here, tied to its
    # own meeting, the same as any other unpaid cycle.
    paid_meeting_ids = {c.meeting_id for c in active_contributions}

    # A member could have participated in meeting m if they joined
    # before the NEXT meeting opened -- not before m's own created_at.
    # The group's first meeting is created in the same instant as the
    # group itself, before any invited member could possibly have
    # joined, so using its own created_at as the cutoff wrongly excluded
    # cycle 1 from every founding member's own outstanding list the
    # moment they joined. The current open meeting has no "next" yet,
    # so it's always in-range for any currently active member.
    cutoff_by_meeting_id = {
        m.id: (all_meetings[i + 1].created_at if i + 1 < len(all_meetings) else None)
        for i, m in enumerate(all_meetings)
    }

    # Every meeting this member could have participated in (Q3: a
    # meeting that closed before they joined never counted against
    # them) where they have no ACTIVE Contribution -- current cycle if
    # still unpaid, plus any past closed cycle they never settled (or
    # settled, then had that settlement reversed). Each stays tied to
    # its own meeting rather than folded into one lump number.
    outstanding = [
        OutstandingEntry(
            meeting_id=m.id,
            cycle_number=cycle_number_by_meeting_id[m.id],
            round_number=m.round_number,
            meeting_date=m.meeting_date,
            amount=group.contribution_amount,
        )
        for m in all_meetings
        if m.id not in paid_meeting_ids
        and (cutoff_by_meeting_id[m.id] is None or target_membership.joined_at < cutoff_by_meeting_id[m.id])
    ]

    return MyContributionsOut(
        payments_count=len(active_contributions),
        total_paid=sum(c.amount for c in active_contributions),
        outstanding_amount=sum(o.amount for o in outstanding),
        outstanding=outstanding,
        history=history,
        my_role=viewer_role,
    )


@router.get("/mine", response_model=MyContributionsOut)
def get_my_contributions(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    The caller's OWN payment history in this group -- scoped by
    payer_membership_id == membership.id, so there's no query shape here
    that could return anyone else's payments. Distinct from the full
    Ledger, which deliberately shows everyone's status for transparency.
    """
    return _build_contributions_summary(db, group_id, membership, membership.role)


@router.get("/member/{membership_id}", response_model=MyContributionsOut)
def get_member_contributions(
    group_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Same shape as /mine, but for any OTHER member of this group --
    full-ledger transparency means any member can see this, the same
    way the Ledger already shows everyone's current-cycle status.
    Powers Member Detail's outstanding list and the treasurer's
    "Record now" action for a late settlement.
    """
    target = (
        db.query(Membership).filter(Membership.id == membership_id, Membership.group_id == group_id).first()
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this group")

    return _build_contributions_summary(db, group_id, target, membership.role)


@router.post("", status_code=status.HTTP_201_CREATED)
def record_contribution(
    group_id: int,
    payload: RecordContributionRequest,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Treasurer-only (get_treasurer_membership 403s anyone else before this
    body even runs). amount, paid_date, and recorded_by are all set here
    from server-side state -- amount always equals the group's own
    contribution_amount, never a client-supplied number; recorded_by is
    the authenticated treasurer, never trusted from the request body.

    payload.meeting_id lets this record a LATE settlement against a
    past closed cycle, not just the current open one -- this is an
    addition (a new Contribution row), never an edit to the closed
    meeting itself, which is why it doesn't violate "a closed meeting's
    record never changes."
    """
    if payload.meeting_id is not None:
        target_meeting = (
            db.query(Meeting).filter(Meeting.id == payload.meeting_id, Meeting.group_id == group_id).first()
        )
        if target_meeting is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found in this group")
        if target_meeting.status == MeetingStatus.VOIDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This cycle was voided and never happened",
            )
    else:
        target_meeting = _get_open_meeting(db, group_id)
        if target_meeting is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No open meeting for this group")

    payer = (
        db.query(Membership)
        .filter(
            Membership.id == payload.payer_membership_id,
            Membership.group_id == group_id,
            Membership.is_active.is_(True),
        )
        .first()
    )
    if payer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this group")

    # Backend never trusts that a meeting_id passed from a client
    # actually belongs to this member's own history, even though the
    # only UI path here already only offers a member's own outstanding
    # cycles -- the API itself must still reject it directly.
    #
    # Only checked for a genuinely PAST (already-closed) cycle -- the
    # CURRENT open meeting has no comparable cutoff, so any currently
    # active member can always pay into it. Comparing against the
    # meeting's OWN created_at was wrong even for that: a group's very
    # first meeting is created in the same instant as the group itself,
    # before any invited member could possibly have joined, so this
    # guard rejected every ordinary member's very first payment into
    # cycle 1 -- fixed by simply not applying it to the open meeting.
    if target_meeting.status != MeetingStatus.SCHEDULED and payer.joined_at > target_meeting.created_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This member hadn't joined the group yet for that cycle",
        )

    # Active-only, not "any row exists" -- otherwise reversing a wrong
    # entry would permanently block ever recording the correct one for
    # that member/cycle, which defeats the entire point of "reverse the
    # wrong one, record the right one."
    existing_for_meeting = (
        db.query(Contribution)
        .filter(Contribution.meeting_id == target_meeting.id, Contribution.payer_membership_id == payer.id)
        .all()
    )
    if filter_active(existing_for_meeting):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A contribution is already recorded for this member this cycle",
        )

    group = db.query(Group).filter(Group.id == group_id).first()
    contribution = Contribution(
        group_id=group_id,
        meeting_id=target_meeting.id,
        payer_membership_id=payer.id,
        amount=group.contribution_amount,
        paid_date=date.today(),
        recorded_by_id=membership.user_id,
    )
    db.add(contribution)
    # flush, not commit yet -- need contribution.id for
    # related_contribution_id below, but this still all lands in one
    # transaction with the notification.
    db.flush()

    create_notification(
        db,
        user_id=payer.user_id,
        group_id=group_id,
        type=NotificationType.CONTRIBUTION_RECORDED,
        message=(
            f"{membership.user.full_name} recorded your {group.contribution_amount:,.0f} XAF "
            f"contribution for the cycle due {target_meeting.meeting_date}."
        ),
        related_contribution_id=contribution.id,
    )
    db.commit()
    return {"status": "recorded"}


@router.post("/{contribution_id}/reverse", response_model=ReverseContributionResult)
def reverse_contribution(
    group_id: int,
    contribution_id: int,
    payload: ReverseContributionRequest,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Additive correction, never an edit or a delete -- the original row
    named by contribution_id is never touched. This adds a SECOND row:
    same meeting, same payer, amount negated, is_reversal=True,
    reverses_contribution_id pointing back at the original. Both rows
    exist in the table forever after this. recorded_by/created_at on
    THIS row already capture who reversed it and when, so no separate
    "reversed_at" column was needed on the original -- see
    ReversalEntry, which reads those straight off the reversal row.

    Works on a contribution from an ALREADY-CLOSED cycle, on purpose,
    the same way late settlement (POST here with meeting_id) already
    does -- reversing never edits the meeting it belongs to, only adds
    a row, so "a closed meeting's record never changes" still holds.
    Nothing here touches Meeting.status, Meeting.collector_membership_id,
    or round_number, so a rotation that already advanced past this
    meeting is completely undisturbed; the member just goes back to
    owing for that specific past cycle (filter_active() picks this up
    everywhere automatically, including in that member's outstanding
    list).

    Guard rails: treasurer-only (get_treasurer_membership, same as
    recording). Reversing a reversal is rejected outright -- if a
    reversal itself needs undoing, the correct move is recording a
    fresh normal contribution, not a second reversal layered on top,
    which would just be confusing. Reversing something already reversed
    is rejected too (checked by looking for any OTHER row whose
    reverses_contribution_id already points at this one).
    """
    original = (
        db.query(Contribution)
        .options(joinedload(Contribution.payer).joinedload(Membership.user))
        .filter(Contribution.id == contribution_id, Contribution.group_id == group_id)
        .first()
    )
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found in this group")

    if original.is_reversal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This is a reversal entry itself -- record a new contribution instead of reversing it",
        )

    already_reversed = (
        db.query(Contribution).filter(Contribution.reverses_contribution_id == original.id).first()
    )
    if already_reversed is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This contribution has already been reversed",
        )

    meeting = db.query(Meeting).filter(Meeting.id == original.meeting_id).first()
    if meeting is not None and meeting.status == MeetingStatus.VOIDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This cycle was voided and never happened",
        )

    reversal = Contribution(
        group_id=group_id,
        meeting_id=original.meeting_id,
        payer_membership_id=original.payer_membership_id,
        amount=-original.amount,
        paid_date=date.today(),
        recorded_by_id=membership.user_id,
        is_reversal=True,
        reverses_contribution_id=original.id,
        reversal_reason=payload.reason,
    )
    db.add(reversal)
    db.flush()

    reason_suffix = f" Reason: {payload.reason}" if payload.reason else ""
    create_notification(
        db,
        user_id=original.payer.user_id,
        group_id=group_id,
        type=NotificationType.CONTRIBUTION_REVERSED,
        message=(
            f"Your {original.amount:,.0f} XAF contribution ({original.paid_date}) was reversed by "
            f"{membership.user.full_name}.{reason_suffix}"
        ),
        related_contribution_id=original.id,
    )
    db.commit()
    db.refresh(reversal)

    return ReverseContributionResult(
        reversal_contribution_id=reversal.id,
        member_name=original.payer.user.full_name,
        amount=original.amount,
    )
