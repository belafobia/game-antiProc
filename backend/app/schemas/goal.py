import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.grant import GrantOut
from app.schemas.reward import Tier

# Os mesmos valores das CHECK constraints do banco.
Category = Literal[
    "financeira",
    "saude",
    "educacao",
    "profissional",
    "pessoal",
    "relacionamentos",
    "lazer",
    "outra",
]
Difficulty = Literal["facil", "media", "dificil", "muito_dificil"]


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    category: Category
    difficulty: Difficulty
    deadline: date
    # Opcional: já criar a meta com os passos (ex.: os livros da lista).
    subtasks: list[Annotated[str, Field(min_length=1, max_length=200)]] = Field(
        default_factory=list, max_length=200
    )


class GoalUpdate(BaseModel):
    """PATCH: só os campos enviados são alterados. `active=false` arquiva."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2000)
    category: Category | None = None
    difficulty: Difficulty | None = None
    deadline: date | None = None
    active: bool | None = None


class SubtaskCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class SubtaskUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    # true = marcar como feita, false = voltar para pendente.
    done: bool | None = None


class SubtaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    done_at: datetime | None
    created_at: datetime

    @computed_field
    @property
    def done(self) -> bool:
        return self.done_at is not None


class GoalOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    category: Category
    difficulty: Difficulty
    deadline: date
    active: bool
    created_at: datetime
    subtasks_total: int
    subtasks_done: int
    # 0 a 100, arredondado para baixo.
    progress: int
    completed: bool
    # Vale da meta: existe se foi concluída no prazo. NULL = sem vale
    # (ainda não concluída, ou concluída depois do prazo).
    grant_id: uuid.UUID | None
    grant_tier: Tier | None
    grant_redeemed: bool


class GoalDetailOut(GoalOut):
    subtasks: list[SubtaskOut]


class GoalChangeOut(BaseModel):
    """Resposta das mudanças nos passos: a meta atualizada e, se a mudança
    concluiu a meta no prazo, o vale que acabou de sair."""

    goal: GoalDetailOut
    new_grant: GrantOut | None
