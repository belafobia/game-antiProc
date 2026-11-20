import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

# Período completo -> nível da recompensa que ele dá.
PERIOD_TIER = {
    "semana": "basica",
    "mes": "media",
    "semestre": "boa",
    "ano": "muito_boa",
}


class RewardGrant(Base):
    """Vale ganho por completar um período. Usar o vale = escolher a recompensa.

    O nível não é uma coluna: ele sai do período (PERIOD_TIER), então não tem
    como existir um vale "semana" com nível "muito_boa".
    """

    __tablename__ = "reward_grants"
    __table_args__ = (
        # Um vale por período: fechar a mesma semana/mês duas vezes não paga
        # duas vezes, mesmo se o código tiver um bug.
        UniqueConstraint(
            "user_id",
            "period",
            "period_start",
            name="uq_reward_grants_user_id_period_period_start",
        ),
        # FK composta: o vale só pode ser usado com recompensa do mesmo
        # usuário. Com reward_id NULL (vale ainda não usado) o Postgres não
        # checa a FK.
        ForeignKeyConstraint(
            ["reward_id", "user_id"],
            ["rewards.id", "rewards.user_id"],
            name="fk_reward_grants_reward_id_user_id_rewards",
        ),
        CheckConstraint(
            "period IN ('semana', 'mes', 'semestre', 'ano')", name="period_valid"
        ),
        # Usado = tem recompensa E data. Nunca uma coisa sem a outra.
        CheckConstraint(
            "(reward_id IS NULL) = (redeemed_at IS NULL)", name="redeemed_consistent"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    period: Mapped[str] = mapped_column(String(10))
    # Segunda da semana, dia 1 do mês, 1/jan ou 1/jul do semestre, 1/jan do ano.
    period_start: Mapped[date] = mapped_column(Date)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reward_id: Mapped[uuid.UUID | None]
    redeemed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @property
    def tier(self) -> str:
        return PERIOD_TIER[self.period]
