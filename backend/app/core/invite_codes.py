import random
import string

from sqlalchemy.orm import Session

from app.models.group import Group


def _generate_code() -> str:
    """e.g. 'FBR-7X4K' -- three letters, a dash, four letters/digits."""
    letters = "".join(random.choices(string.ascii_uppercase, k=3))
    suffix_chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(suffix_chars, k=4))
    return f"{letters}-{suffix}"


def generate_unique_invite_code(db: Session) -> str:
    """
    A collision is astronomically unlikely (26^3 * 36^4 possible codes)
    but not impossible, and invite_code has a unique constraint in the
    database -- so we check first and retry rather than trusting
    randomness alone and risking a failed insert.
    """
    while True:
        code = _generate_code()
        exists = db.query(Group).filter(Group.invite_code == code).first()
        if not exists:
            return code
