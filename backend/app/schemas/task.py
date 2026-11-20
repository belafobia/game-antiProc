import uuid
from datetime import date, datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field


def _normalize_weekdays(days: list[int]) -> list[int]:
    # [2, 0, 0] -> [0, 2]: sem repetição e sempre na ordem da semana.
    return sorted(set(days))


# 0 = segunda ... 6 = domingo (mesma convenção do banco e do Python).
# Os limites repetem a CHECK constraint: o erro vira um 422 claro, não um 500.
Weekdays = Annotated[
    list[Annotated[int, Field(ge=0, le=6)]],
    Field(min_length=1, max_length=7),
    AfterValidator(_normalize_weekdays),
]


class TaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    weekdays: Weekdays
    # Padrão: hoje. No domingo, para planejar a semana seguinte, mande a
    # segunda-feira, e a tarefa não conta no domingo atual.
    starts_on: date | None = None


class TaskUpdate(BaseModel):
    """PATCH: só os campos enviados são alterados. `active=false` arquiva."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    weekdays: Weekdays | None = None
    starts_on: date | None = None
    active: bool | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str | None
    weekdays: list[int]
    starts_on: date
    active: bool
    created_at: datetime


class CompletionIn(BaseModel):
    # Padrão: hoje. Dá para marcar um dia anterior da semana (esqueci de
    # dar check ontem), desde que a semana ainda não tenha sido fechada.
    day: date | None = None


class CompletionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    task_id: uuid.UUID
    day: date
    completed_at: datetime
