import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Goal, GoalSubtask
from app.services.errors import NotFoundError
from app.services.progress import percent


@dataclass
class GoalProgress:
    goal: Goal
    total: int
    done: int

    @property
    def percent(self) -> int:
        return percent(self.done, self.total)

    @property
    def completed(self) -> bool:
        return self.total > 0 and self.done == self.total


def list_goals(
    db: Session,
    user_id: uuid.UUID,
    include_archived: bool = False,
    goal_id: uuid.UUID | None = None,
) -> list[GoalProgress]:
    """Metas com a contagem de subtarefas, numa query só.

    LEFT JOIN + GROUP BY: o Postgres conta as subtarefas de todas as metas de
    uma vez, em vez de uma query por meta (N+1). count(done_at) ignora NULL,
    então conta só as feitas.
    """
    query = (
        select(
            Goal,
            func.count(GoalSubtask.id).label("total"),
            func.count(GoalSubtask.done_at).label("done"),
        )
        .outerjoin(GoalSubtask, GoalSubtask.goal_id == Goal.id)
        .where(Goal.user_id == user_id)
        .group_by(Goal.id)
        .order_by(Goal.deadline, Goal.created_at)
    )
    if goal_id is not None:
        query = query.where(Goal.id == goal_id)
    elif not include_archived:
        query = query.where(Goal.active.is_(True))
    return [GoalProgress(goal, total, done) for goal, total, done in db.execute(query)]


def get_goal_progress(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> GoalProgress:
    found = list_goals(db, user_id, goal_id=goal_id)
    if not found:
        raise NotFoundError("Meta não encontrada")
    return found[0]


def get_goal(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> Goal:
    goal = db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    if goal is None:
        raise NotFoundError("Meta não encontrada")
    return goal


def list_subtasks(db: Session, goal_id: uuid.UUID) -> list[GoalSubtask]:
    return list(
        db.scalars(
            select(GoalSubtask)
            .where(GoalSubtask.goal_id == goal_id)
            .order_by(GoalSubtask.created_at)
        )
    )


def get_subtask(
    db: Session, user_id: uuid.UUID, goal_id: uuid.UUID, subtask_id: uuid.UUID
) -> GoalSubtask:
    subtask = db.scalar(
        select(GoalSubtask).where(
            GoalSubtask.id == subtask_id,
            GoalSubtask.goal_id == goal_id,
            GoalSubtask.user_id == user_id,
        )
    )
    if subtask is None:
        raise NotFoundError("Subtarefa não encontrada")
    return subtask
