import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.reward import Tier

Period = Literal["semana", "mes", "semestre", "ano"]


class GrantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    period: Period
    period_start: date
    tier: Tier
    granted_at: datetime
    # Ambos NULL enquanto o vale não foi usado.
    reward_id: uuid.UUID | None
    redeemed_at: datetime | None


class RedeemIn(BaseModel):
    reward_id: uuid.UUID
