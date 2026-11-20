import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Goal(Base):
    """Meta de longo prazo (ex.: Tirar CNH até dez/2028)."""

    __tablename__ = "goals"
    __table_args__ = (
        # Alvo da FK composta em goal_subtasks.
        UniqueConstraint("id", "user_id", name="uq_goals_id_user_id"),
        CheckConstraint(
            "category IN ('financeira', 'saude', 'educacao', 'profissional',"
            " 'pessoal', 'relacionamentos', 'lazer', 'outra')",
            name="category_valid",
        ),
        CheckConstraint(
            "difficulty IN ('facil', 'media', 'dificil', 'muito_dificil')",
            name="difficulty_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[str] = mapped_column(String(15))
    deadline: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class GoalSubtask(Base):
    """Passo de uma meta (ex.: um livro da meta de leitura).

    Não existe coluna "progresso" na meta: a porcentagem é sempre
    feitas / total das subtarefas, então nunca fica dessincronizada.
    """

    __tablename__ = "goal_subtasks"
    __table_args__ = (
        # FK composta: impede, no banco, pendurar uma subtarefa na meta de
        # outro usuário.
        ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["goals.id", "goals.user_id"],
            name="fk_goal_subtasks_goal_id_user_id_goals",
            ondelete="CASCADE",
        ),
        Index("ix_goal_subtasks_goal_id", "goal_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    goal_id: Mapped[uuid.UUID]
    name: Mapped[str] = mapped_column(String(200))
    # NULL = pendente. Guardar a data (em vez de um booleano) diz também
    # quando foi feita, de graça.
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
