from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Loan(Base):
    """
    Remaining balance is deliberately NOT a stored column. It's always
    principal + interest minus the sum of this loan's repayments,
    computed when read. If we stored a running balance, every repayment
    write would have to keep it in sync -- two sources of truth that can
    drift apart. Deriving it means it's always correct by construction.
    """

    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    borrower_membership_id = Column(Integer, ForeignKey("memberships.id"), nullable=False)
    principal = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False, default=0)
    date_taken = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(), server_default=func.now())
    updated_at = Column(DateTime(), server_default=func.now(), onupdate=func.now())

    group = relationship("Group")
    borrower = relationship("Membership")
    recorded_by = relationship("User")
    repayments = relationship("Repayment", back_populates="loan")
