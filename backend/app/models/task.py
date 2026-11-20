import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Task(Base):
    """Tarefa recorrente da semana-modelo (ex.: Jiu Jitsu seg/ter/qua)."""

    __tablename__ = "tasks"
    __table_args__ = (
        # Alvo da FK composta em task_completions: garante no banco que uma
        # conclusão só referencia tarefas do mesmo usuário.
        UniqueConstraint("id", "user_id", name="uq_tasks_id_user_id"),
        # Pelo menos um dia, e só dias válidos. 0 = segunda ... 6 = domingo,
        # a mesma convenção do date.weekday() do Python.
        CheckConstraint(
            "cardinality(weekdays) >= 1"
            " AND weekdays <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]",
            name="weekdays_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    category: Mapped[str | None] = mapped_column(String(50))
    # Array em vez de 7 colunas booleanas: "a tarefa cai na quarta?" vira
    # `2 = ANY(weekdays)`, e a API recebe/devolve a mesma lista.
    weekdays: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger))
    # A partir de quando a tarefa passa a contar. Sem isso, uma tarefa criada
    # no domingo para a semana seguinte já "faltaria" no domingo atual.
    starts_on: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
