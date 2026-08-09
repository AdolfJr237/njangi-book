from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_membership_for_group, get_treasurer_membership
from app.database import get_db
from app.models.enums import MeetingStatus, MembershipRole
from app.models.group import Group
from app.models.meeting import Meeting
from app.models.membership import Membership
from app.schemas.member import (
    MemberRow,
    MembersListOut,
    TransferTreasurerRequest,
    TransferTreasurerResult,
)

router = APIRouter(prefix="/groups/{group_id}/members", tags=["members"])


@router.get("", response_model=MembersListOut)
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_membership_for_group),
):
    """
    Every active member, in rotation order -- visible to any member, not
    just the treasurer. No "add member" here on purpose: the only way
    into a group is the invite code (join_group), so there's nothing to
    fabricate a form for.
    """
    group = db.query(Group).filter(Group.id == group_id).first()

    all_memberships = (
        db.query(Membership)
        .options(joinedload(Membership.user))
        .filter(Membership.group_id == group_id, Membership.is_active.is_(True))
        .order_by(Membership.rotation_position)
        .all()
    )

    members = [
        MemberRow(
            membership_id=m.id,
            name=m.user.full_name,
            phone_number=m.user.phone_number,
            role=m.role,
            rotation_position=m.rotation_position,
            is_self=m.id == membership.id,
        )
        for m in all_memberships
    ]

    return MembersListOut(
        member_count=len(members),
        contribution_amount=group.contribution_amount,
        meeting_frequency=group.meeting_frequency,
        members=members,
        my_role=membership.role,
    )


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    group_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Soft delete only, per NjangiBook_Security_Scalability.md -- flips
    is_active to False rather than deleting the row, so every past
    Contribution this member ever made stays exactly where it is. They
    disappear from the Members list, Rotation Schedule, and Ledger going
    forward (all filtered on is_active), but the historical record isn't
    touched.

    removed_at is also stamped here -- it's what lets a PAST cycle's
    member list and expected pot be reconstructed as "who was a member
    back then" rather than today's roster, once cycle advancement makes
    past cycles a thing that can be revisited.

    Two things this deliberately blocks rather than trying to handle:
    removing yourself (a group can't be left treasurer-less this way --
    handover is its own future feature per the Security doc), and
    removing whoever is collecting the CURRENT open cycle (their
    Meeting.collector_membership_id would then point at a removed
    member -- reassigning it is part of cycle-advancement, not built
    yet).
    """
    if membership_id == membership.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can't remove yourself from the group",
        )

    target = (
        db.query(Membership)
        .filter(
            Membership.id == membership_id,
            Membership.group_id == group_id,
            Membership.is_active.is_(True),
        )
        .first()
    )
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this group")

    open_meeting = (
        db.query(Meeting)
        .filter(Meeting.group_id == group_id, Meeting.status == MeetingStatus.SCHEDULED)
        .order_by(Meeting.meeting_date)
        .first()
    )
    if open_meeting and open_meeting.collector_membership_id == target.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This member is collecting the current cycle and can't be removed yet",
        )

    target.is_active = False
    # Naive UTC, not datetime.now(timezone.utc) -- every other timestamp
    # in this app stays naive throughout (see password_reset.py's
    # comments for why), and Postgres's DateTime columns are now
    # deliberately declared WITHOUT timezone=True to match, so mixing in
    # one aware value here would be the one inconsistent write in the
    # whole codebase.
    target.removed_at = datetime.utcnow()
    db.commit()


@router.post("/transfer-treasurer", response_model=TransferTreasurerResult)
def transfer_treasurer(
    group_id: int,
    payload: TransferTreasurerRequest,
    db: Session = Depends(get_db),
    membership: Membership = Depends(get_treasurer_membership),
):
    """
    Deliberate, treasurer-initiated handover only -- no automatic or
    timer-based transfer, no member vote. Per
    NjangiBook_Security_Scalability.md, an absent treasurer with nobody
    able to name a successor is a known limitation handled outside the
    app for now; this endpoint only ever runs at the current treasurer's
    own initiative.

    Atomicity: this is two role assignments on two already-loaded
    Membership rows, committed together in ONE transaction -- never
    "remove old, then add new" as separate steps. SQLite (and Postgres
    later) only ever expose the last COMMITTED state to any other
    request; there is no window where a concurrent read could see two
    treasurers, zero treasurers, or this group in any state that never
    actually existed. If anything below db.commit() ever raised, the
    whole transaction rolls back and neither role changes -- there's no
    partial-failure state to guard against separately.

    Deliberately untouched: rotation_position and every Meeting's
    collector_membership_id. Role and "whose turn to collect" are
    separate fields on separate tables, and nothing about a role swap
    needs to move the rotation. Handing the role to whoever is CURRENTLY
    collecting is explicitly fine, not a special case -- it recreates
    exactly the state every group starts in (the creator is both
    treasurer and the first collector at position 1).
    """
    if payload.successor_membership_id == membership.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You're already the treasurer",
        )

    successor = (
        db.query(Membership)
        .options(joinedload(Membership.user))
        .filter(
            Membership.id == payload.successor_membership_id,
            Membership.group_id == group_id,
            Membership.is_active.is_(True),
        )
        .first()
    )
    if successor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in this group")

    former_treasurer_name = membership.user.full_name
    membership.role = MembershipRole.MEMBER
    successor.role = MembershipRole.TREASURER
    db.commit()

    return TransferTreasurerResult(
        new_treasurer_name=successor.user.full_name,
        former_treasurer_name=former_treasurer_name,
    )
