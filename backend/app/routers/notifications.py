from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.dependencies import get_current_user
from app.core.notifications import create_notification
from app.database import get_db
from app.models.contribution import Contribution
from app.models.enums import MembershipRole, NotificationConfirmationStatus, NotificationType
from app.models.membership import Membership
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import DisputeNotificationRequest, NotificationOut, UnreadCountOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_out(n: Notification) -> NotificationOut:
    return NotificationOut(
        id=n.id,
        type=n.type.value,
        message=n.message,
        group_id=n.group_id,
        group_name=n.group.name,
        is_read=n.is_read,
        confirmation_status=n.confirmation_status.value if n.confirmation_status else None,
        dispute_reason=n.dispute_reason,
        created_at=n.created_at,
    )


def _get_owned_notification(db: Session, notification_id: int, user_id: int) -> Notification:
    """
    The entire data-scoping mechanism for this feature: filtering on
    user_id == the CALLER's own id, straight from their token, never a
    client-supplied value. A notification belonging to someone else
    simply isn't found -- 404, not 403, same reasoning as
    get_membership_for_group: it doesn't confirm "this notification
    exists, it's just not yours."
    """
    notification = (
        db.query(Notification)
        .options(joinedload(Notification.group))
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Newest first. Scoped implicitly by construction, same as
    list_my_groups -- it only ever queries rows for current_user.id, so
    there's no group_id or other input that could leak someone else's."""
    notifications = (
        db.query(Notification)
        .options(joinedload(Notification.group))
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [_to_out(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountOut)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Powers the bell badge -- deliberately a separate, lightweight
    endpoint so the top-level bell can poll just a count without pulling
    the full notification list every time."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .count()
    )
    return UnreadCountOut(unread_count=count)


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """For the three purely-informational types (reversed, your turn,
    left owing) -- tapping the row marks it read. Confirm/dispute
    already mark CONTRIBUTION_RECORDED read as part of that action, so
    this is never needed for that type, but calling it on one anyway is
    harmless (it just sets the same flag)."""
    notification = _get_owned_notification(db, notification_id, current_user.id)
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _to_out(notification)


@router.post("/{notification_id}/confirm", response_model=NotificationOut)
def confirm_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    The member confirms their recorded payment is correct. Only ever
    valid on a CONTRIBUTION_RECORDED notification (confirmation_status
    is null on every other type) and only once -- PENDING is the only
    state this can fire from, so a confirmed or disputed notification
    can't be flipped again afterward.
    """
    notification = _get_owned_notification(db, notification_id, current_user.id)
    if notification.confirmation_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This notification doesn't have anything to confirm",
        )
    if notification.confirmation_status != NotificationConfirmationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This was already {notification.confirmation_status.value}",
        )

    notification.confirmation_status = NotificationConfirmationStatus.CONFIRMED
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return _to_out(notification)


@router.post("/{notification_id}/dispute", response_model=NotificationOut)
def dispute_notification(
    notification_id: int,
    payload: DisputeNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Raises a flag. That is the entire action. Per
    NjangiBook_Security_Scalability.md's "disputes surface, humans
    resolve": this endpoint does not touch the Contribution row the
    notification points at in any way -- no edit, no reversal, nothing.
    It only sets THIS notification's own confirmation_status and
    dispute_reason. If the dispute turns out to be legitimate, the
    treasurer settles it the normal way, through the entirely separate
    reverse_contribution endpoint, as their own deliberate decision --
    disputing never triggers that automatically. A member disputing
    their own payment can never unilaterally change the ledger; all
    they can ever do is raise their hand.

    The one thing this DOES do beyond flagging: notifies the group's
    treasurer that a dispute was raised, so the disagreement actually
    reaches the person positioned to resolve it rather than sitting
    invisible on the disputing member's own screen.
    """
    notification = _get_owned_notification(db, notification_id, current_user.id)
    if notification.confirmation_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This notification doesn't have anything to dispute",
        )
    if notification.confirmation_status != NotificationConfirmationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This was already {notification.confirmation_status.value}",
        )

    notification.confirmation_status = NotificationConfirmationStatus.DISPUTED
    notification.dispute_reason = payload.reason
    notification.is_read = True

    contribution = (
        db.query(Contribution).filter(Contribution.id == notification.related_contribution_id).first()
    )
    treasurer_membership = (
        db.query(Membership)
        .filter(
            Membership.group_id == notification.group_id,
            Membership.role == MembershipRole.TREASURER,
            Membership.is_active.is_(True),
        )
        .first()
    )
    if treasurer_membership and contribution:
        reason_suffix = f" Reason: {payload.reason}" if payload.reason else ""
        create_notification(
            db,
            user_id=treasurer_membership.user_id,
            group_id=notification.group_id,
            type=NotificationType.DISPUTE_RAISED,
            message=(
                f"{current_user.full_name} disputed their {contribution.amount:,.0f} XAF "
                f"contribution recorded on {contribution.paid_date}.{reason_suffix}"
            ),
            related_contribution_id=contribution.id,
        )

    db.commit()
    db.refresh(notification)
    return _to_out(notification)
