import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.grant import GrantOut


class OccurrenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: uuid.UUID
    task_name: str
    category: str | None
    done: bool
    # Para desfazer: DELETE /completions/{completion_id}
    completion_id: uuid.UUID | None


class DayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day: date
    items: list[OccurrenceOut]


class WeekOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start: date
    end: date
    total: int
    done: int
    percent: int
    complete: bool
    closed: bool
    days: list[DayOut]


class WeekCloseOut(BaseModel):
    week_start: date
    complete: bool
    closed_at: datetime
    # Vales ganhos neste fechamento: vazio, só o da semana, ou a escada
    # inteira (semana + mês + semestre + ano) no último domingo do ano.
    grants: list[GrantOut]
