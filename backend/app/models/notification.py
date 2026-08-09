from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import NotificationConfirmationStatus, NotificationType


class Notification(Base):
    """
    Not a ledger table -- it's a message, not a financial record, so it
    doesn't carry recorded_by. It carries its own read/unread and
    confirm/dispute state instead.

    user_id is who this notification is FOR -- every query in
    app/routers/notifications.py filters on it, which is the entire
    data-scoping mechanism (a person only ever sees their own
    notifications; there's no separate permission check needed beyond
    "does this row's user_id match the caller").

    related_contribution_id / related_meeting_id point at whatever
    triggered this notification, so the confirm/dispute actions and any
    future "jump to this record" navigation have something concrete to
    act on, without re-parsing the message text.
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    type = Column(SAEnum(NotificationType, native_enum=False), nullable=False)
    message = Column(String, nullable=False)
    related_contribution_id = Column(Integer, ForeignKey("contributions.id"), nullable=True)
    related_meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    # Null for every type except CONTRIBUTION_RECORDED (see
    # NotificationConfirmationStatus). Reversing to PENDING happens only
    # at creation time, in create_notification -- never edited except by
    # the confirm/dispute endpoints themselves.
    confirmation_status = Column(SAEnum(NotificationConfirmationStatus, native_enum=False), nullable=True)
    dispute_reason = Column(String, nullable=True)
    created_at = Column(DateTime(), default=datetime.utcnow, server_default=func.now())

    user = relationship("User")
    group = relationship("Group")
