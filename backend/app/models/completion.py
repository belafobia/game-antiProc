import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TaskCompletion(Base):
    """O check de uma tarefa em um dia da semana."""

    __tablename__ = "task_completions"
    __table_args__ = (
        # FK composta: o par (task_id, user_id) precisa existir em tasks.
        # Impede, no banco, concluir a tarefa de outro usuário.
        ForeignKeyConstraint(
            ["task_id", "user_id"],
            ["tasks.id", "tasks.user_id"],
            name="fk_task_completions_task_id_user_id_tasks",
        ),
        # Um check por tarefa por dia: marcar duas vezes não conta em dobro.
        UniqueConstraint("task_id", "day", name="uq_task_completions_task_id_day"),
        # Montar a semana: "checks deste usuário entre segunda e domingo".
        Index("ix_task_completions_user_day", "user_id", "day"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    task_id: Mapped[uuid.UUID]
    # O dia (São Paulo) a que o check se refere. Separado de completed_at
    # porque dá para marcar depois: esqueci de dar check ontem, marco hoje.
    day: Mapped[date] = mapped_column(Date)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
