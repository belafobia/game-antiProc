"""Quais tarefas caem em cada dia, e quanto da semana já foi feito.

Sem banco: recebe as tarefas e os checks já carregados. Isso deixa a regra
"a semana valeu" testável sem Postgres.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date
from typing import Protocol

from app.services.periods import week_days, week_sunday
from app.services.progress import percent

# A semana vale (dá vale básico e conta para mês/semestre/ano) a partir desta
# porcentagem de tarefas feitas. 90 inclui os 90% exatos.
# Se mudar, mude também WEEK_GOAL_PERCENT no front (frontend/src/lib/labels.ts).
WEEK_GOAL_PERCENT = 90


class ScheduledTask(Protocol):
    id: uuid.UUID
    name: str
    category: str | None
    weekdays: list[int]
    starts_on: date
    active: bool


def is_scheduled(task: ScheduledTask, day: date) -> bool:
    return task.active and day >= task.starts_on and day.weekday() in task.weekdays


@dataclass
class Occurrence:
    task_id: uuid.UUID
    task_name: str
    category: str | None
    completion_id: uuid.UUID | None

    @property
    def done(self) -> bool:
        return self.completion_id is not None


@dataclass
class Day:
    day: date
    items: list[Occurrence] = field(default_factory=list)


@dataclass
class Week:
    start: date
    days: list[Day]
    closed: bool = False
    # Resultado gravado no fechamento. Semana fechada mostra o que valeu na
    # época, mesmo que a rotina (ou a regra dos 90%) tenha mudado depois.
    closed_complete: bool | None = None

    @property
    def end(self) -> date:
        return week_sunday(self.start)

    @property
    def total(self) -> int:
        return sum(len(d.items) for d in self.days)

    @property
    def done(self) -> int:
        return sum(1 for d in self.days for item in d.items if item.done)

    @property
    def percent(self) -> int:
        return percent(self.done, self.total)

    @property
    def complete(self) -> bool:
        """A semana valeu: fez pelo menos WEEK_GOAL_PERCENT% das tarefas.

        O nome ficou "complete" (é o da coluna week_reviews.complete); hoje
        quer dizer "bateu a meta da semana", não necessariamente 100%.
        """
        if self.closed_complete is not None:
            return self.closed_complete
        # Semana sem nenhuma tarefa não vale: não dá recompensa à toa.
        # Conta só com inteiros (done/total >= 90/100, multiplicado em
        # cruz): sem divisão, não tem arredondamento mexendo na regra.
        return self.total > 0 and self.done * 100 >= WEEK_GOAL_PERCENT * self.total


def build_week(
    start: date,
    tasks: list[ScheduledTask],
    checks: dict[tuple[uuid.UUID, date], uuid.UUID],
) -> Week:
    """Monta a semana: para cada dia, as tarefas que caem nele e se têm check.

    `checks` mapeia (task_id, dia) -> id da conclusão.
    """
    days = []
    for day in week_days(start):
        items = [
            Occurrence(
                task_id=task.id,
                task_name=task.name,
                category=task.category,
                completion_id=checks.get((task.id, day)),
            )
            for task in tasks
            if is_scheduled(task, day)
        ]
        days.append(Day(day=day, items=items))
    return Week(start=start, days=days)
