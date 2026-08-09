from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class PasswordResetOTP(Base):
    """
    One row per reset code ever generated. Keyed by phone_number, not by
    a user_id foreign key -- a code gets created and its rate-limit
    bookkeeping happens the same way whether or not that phone number
    actually belongs to an account, which is what makes it possible for
    the request-reset endpoint to behave identically either way (see
    that endpoint's docstring).

    code_hash, never the raw code: this is exactly the same reasoning as
    password_hash on User. If the database is ever read by someone who
    shouldn't (a backup leak, a compromised admin, a bug that logs a
    query) a plaintext table of currently-valid reset codes would let
    them reset any pending account within the 10-minute window, no
    guessing required. Hashing it means they'd need to break the hash,
    same as a password -- for a 10-minute-lived value that's overkill in
    theory, but it costs nothing to do and removes the risk entirely.
    """

    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, index=True, nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime(), nullable=False)
    attempt_count = Column(Integer, nullable=False, default=0)
    consumed = Column(Boolean, nullable=False, default=False)
    # Powers per-IP rate limiting alongside the per-phone limit -- an
    # attacker spreading requests across many phone numbers from one
    # machine is still caught by this even though no single phone number
    # looks abused on its own.
    requested_ip = Column(String, nullable=True)
    created_at = Column(DateTime(), server_default=func.now())
