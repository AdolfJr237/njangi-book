from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    type: str
    message: str
    group_id: int
    group_name: str
    is_read: bool
    # None for every type except CONTRIBUTION_RECORDED -- the frontend
    # shows the confirm/dispute buttons only when this isn't null.
    confirmation_status: str | None
    dispute_reason: str | None
    created_at: datetime


class UnreadCountOut(BaseModel):
    unread_count: int


class DisputeNotificationRequest(BaseModel):
    reason: str | None = None
