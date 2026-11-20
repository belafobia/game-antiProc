import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# básica: um fim de semana (amigos, cinema, namorada)
# média: comprar algo até R$200
# boa: comprar algo até R$500
# muito boa: comprar algo acima de R$500 ou viajar
Tier = Literal["basica", "media", "boa", "muito_boa"]


class RewardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    tier: Tier


class RewardUpdate(BaseModel):
    """PATCH: só os campos enviados são alterados. `active=false` arquiva."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    tier: Tier | None = None
    active: bool | None = None


class RewardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    tier: Tier
    active: bool
    created_at: datetime
