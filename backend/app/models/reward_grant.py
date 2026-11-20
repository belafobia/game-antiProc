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
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.goal import Goal

# Período completo -> nível da recompensa que ele dá.
PERIOD_TIER = {
    "semana": "basica",
    "mes": "media",
    "semestre": "boa",
    "ano": "muito_boa",
}

# Dificuldade da meta concluída no prazo -> nível do vale.
GOAL_TIER = {
    "facil": "basica",
    "media": "media",
    "dificil": "boa",
    "muito_dificil": "muito_boa",
}


class RewardGrant(Base):
    """Vale ganho. Usar o vale = escolher uma recompensa do mesmo nível.

    Duas origens:
    - período completo (semana/mês/semestre/ano): goal_id NULL;
    - meta concluída no prazo (period = 'meta'): goal_id aponta para a meta.

    O nível (tier) é gravado na criação: mudar a dificuldade da meta depois
    não muda um vale que já foi ganho.
    """

    __tablename__ = "reward_grants"
    __table_args__ = (
        # Um vale por período: fechar a mesma semana/mês duas vezes não paga
        # duas vezes, mesmo se o código tiver um bug. Parcial (só períodos):
        # duas metas concluídas no mesmo dia são vales diferentes.
        Index(
            "uq_reward_grants_user_id_period_period_start",
            "user_id",
            "period",
            "period_start",
            unique=True,
            postgresql_where=text("goal_id IS NULL"),
        ),
        # Um vale por meta.
        UniqueConstraint("goal_id", name="uq_reward_grants_goal_id"),
        # FK composta: o vale só pode ser usado com recompensa do mesmo
        # usuário. Com reward_id NULL (vale ainda não usado) o Postgres não
        # checa a FK.
        ForeignKeyConstraint(
            ["reward_id", "user_id"],
            ["rewards.id", "rewards.user_id"],
            name="fk_reward_grants_reward_id_user_id_rewards",
        ),
        # Mesma ideia para a meta: só metas do mesmo usuário.
        ForeignKeyConstraint(
            ["goal_id", "user_id"],
            ["goals.id", "goals.user_id"],
            name="fk_reward_grants_goal_id_user_id_goals",
        ),
        CheckConstraint(
            "period IN ('semana', 'mes', 'semestre', 'ano', 'meta')",
            name="period_valid",
        ),
        CheckConstraint(
            "tier IN ('basica', 'media', 'boa', 'muito_boa')", name="tier_valid"
        ),
        # Vale de meta tem meta; vale de período não tem.
        CheckConstraint(
            "(period = 'meta') = (goal_id IS NOT NULL)", name="goal_consistent"
        ),
        # Usado = tem recompensa E data. Nunca uma coisa sem a outra.
        CheckConstraint(
            "(reward_id IS NULL) = (redeemed_at IS NULL)", name="redeemed_consistent"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    period: Mapped[str] = mapped_column(String(10))
    # Segunda da semana, dia 1 do mês, 1/jan ou 1/jul do semestre, 1/jan do
    # ano. Para metas: o dia em que foi concluída.
    period_start: Mapped[date] = mapped_column(Date)
    tier: Mapped[str] = mapped_column(String(10))
    goal_id: Mapped[uuid.UUID | None]
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reward_id: Mapped[uuid.UUID | None]
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Só leitura: para mostrar o nome da meta junto do vale.
    goal: Mapped[Goal | None] = relationship(
        primaryjoin="RewardGrant.goal_id == Goal.id",
        foreign_keys="RewardGrant.goal_id",
        viewonly=True,
        lazy="selectin",
    )

    @property
    def goal_name(self) -> str | None:
        return self.goal.name if self.goal else None
