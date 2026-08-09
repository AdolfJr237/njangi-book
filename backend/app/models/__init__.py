# Importing every model here means `Base.metadata` (in database.py) knows
# about all of them as soon as this package is imported once, anywhere.
# Without this, SQLAlchemy would only know about whichever model file
# happened to get imported directly, and create_all() would silently
# skip the rest.

from app.models.contribution import Contribution
from app.models.fine import Fine
from app.models.group import Group
from app.models.loan import Loan
from app.models.meeting import Meeting
from app.models.membership import Membership
from app.models.notification import Notification
from app.models.password_reset_otp import PasswordResetOTP
from app.models.repayment import Repayment
from app.models.user import User
from app.models.welfare import WelfareEntry

__all__ = [
    "Contribution",
    "Fine",
    "Group",
    "Loan",
    "Meeting",
    "Membership",
    "Notification",
    "PasswordResetOTP",
    "Repayment",
    "User",
    "WelfareEntry",
]
