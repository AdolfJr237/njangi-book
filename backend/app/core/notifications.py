from sqlalchemy.orm import Session

from app.models.enums import NotificationConfirmationStatus, NotificationType
from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    group_id: int,
    type: NotificationType,
    message: str,
    related_contribution_id: int | None = None,
    related_meeting_id: int | None = None,
) -> Notification:
    """
    The ONE place a Notification row ever gets created. Every trigger
    point in the app (record_contribution, reverse_contribution,
    close_cycle, dispute_notification) calls this rather than
    constructing a Notification directly -- adding a new event type
    later means calling this from wherever that event happens, with a
    new NotificationType and a message, and nothing else needs to
    change.

    Deliberately does NOT call db.commit() -- it db.add()s and returns,
    so the notification is created in the SAME transaction as whatever
    action triggered it (the caller's own existing commit covers both).
    That matters: if the triggering action ever rolled back, the
    notification about it should never have existed either.

    confirmation_status is set to PENDING here, once, only for
    CONTRIBUTION_RECORDED -- that's the only type with a confirm/dispute
    loop. Every other type leaves it null and stays purely informational.
    """
    notification = Notification(
        user_id=user_id,
        group_id=group_id,
        type=type,
        message=message,
        related_contribution_id=related_contribution_id,
        related_meeting_id=related_meeting_id,
        confirmation_status=(
            NotificationConfirmationStatus.PENDING if type == NotificationType.CONTRIBUTION_RECORDED else None
        ),
    )
    db.add(notification)
    return notification
