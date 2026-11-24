import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class WeekReview(Base):
    """O fechamento de domingo: o resultado da semana, congelado.

    Guardar o resultado (em vez de recalcular sempre) é o que permite a
    escada mês/semestre/ano: se você mudar a rotina em março, as semanas de
    janeiro continuam valendo pelo que eram na época.
    """

    __tablename__ = "week_reviews"
    __table_args__ = (
        # Cada semana fecha uma vez só. Também serve de índice para
        # "semanas fechadas deste usuário neste mês".
        UniqueConstraint(
            "user_id", "week_start", name="uq_week_reviews_user_id_week_start"
        ),
        # A semana começa sempre na segunda (isodow: segunda = 1).
        CheckConstraint(
            "extract(isodow from week_start) = 1", name="week_start_monday"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    week_start: Mapped[date] = mapped_column(Date)
    # True = a semana valeu (bateu WEEK_GOAL_PERCENT, ver services/schedule).
    complete: Mapped[bool]
    closed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
