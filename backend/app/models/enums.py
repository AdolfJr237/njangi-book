import enum


# Inheriting from (str, enum.Enum) means these serialize as plain strings
# in JSON responses instead of ugly "MembershipRole.TREASURER" -- FastAPI
# and Pydantic both understand this pattern natively.


class MembershipRole(str, enum.Enum):
    TREASURER = "treasurer"
    MEMBER = "member"


class MeetingFrequency(str, enum.Enum):
    EVERY_TWO_DAYS = "every_two_days"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    # Only reachable via the cycle-reopen (undo) path. Never deleted --
    # a voided meeting stays in the database forever as visible proof a
    # cycle was closed by mistake and then undone, per the
    # additive-corrections rule in NjangiBook_Security_Scalability.md.
    VOIDED = "voided"


class WelfareEntryType(str, enum.Enum):
    CONTRIBUTION = "contribution"
    PAYOUT = "payout"


class FineStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PAID = "paid"


class NotificationType(str, enum.Enum):
    # New event types get added here, plus one call to
    # app.core.notifications.create_notification wherever that event
    # happens in the backend -- nothing else about the model or API
    # needs to change.
    CONTRIBUTION_RECORDED = "contribution_recorded"
    CONTRIBUTION_REVERSED = "contribution_reversed"
    YOUR_TURN_TO_COLLECT = "your_turn_to_collect"
    CYCLE_CLOSED_OWING = "cycle_closed_owing"
    DISPUTE_RAISED = "dispute_raised"
    # The group-wide "cycle closed, X is now collecting" fallback --
    # only ever sent to a member who has NEITHER a YOUR_TURN_TO_COLLECT
    # nor a CYCLE_CLOSED_OWING fact of their own for this same close.
    # See close_cycle in app/routers/cycle.py for the one-notice-per-
    # member logic that guarantees this.
    CYCLE_CLOSED_ANNOUNCEMENT = "cycle_closed_announcement"


class NotificationConfirmationStatus(str, enum.Enum):
    """
    Only ever set on a CONTRIBUTION_RECORDED notification -- that's the
    one type with a confirm/dispute loop, per CLAUDE.md ("Member...
    Receives notifications when their payment is recorded and can
    confirm or dispute"). Every other notification type leaves this
    column null; there's nothing to confirm or dispute about a turn
    reminder or an owing notice.
    """

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISPUTED = "disputed"
