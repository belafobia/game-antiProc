import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Reward(Base):
    """Opção do catálogo de recompensas (ex.: cinema, nível básica)."""

    __tablename__ = "rewards"
    __table_args__ = (
        # Alvo da FK composta em reward_grants: garante no banco que um vale
        # só é usado com recompensas do mesmo usuário.
        UniqueConstraint("id", "user_id", name="uq_rewards_id_user_id"),
        CheckConstraint(
            "tier IN ('basica', 'media', 'boa', 'muito_boa')",
            name="tier_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    tier: Mapped[str] = mapped_column(String(10))
    active: Mapped[bool] = mapped_column(default=True, server_default=true())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
