import uuid
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import GOAL_TIER, Goal, GoalSubtask, RewardGrant, User
from app.services.errors import ConflictError, NotFoundError
from app.services.periods import today
from app.services.progress import percent


@dataclass
class GoalProgress:
    goal: Goal
    total: int
    done: int
    grant: RewardGrant | None = None

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
    """Metas com a contagem de subtarefas e o vale (se houver), numa query só.

    LEFT JOIN + GROUP BY: o Postgres conta as subtarefas de todas as metas de
    uma vez, em vez de uma query por meta (N+1). count(done_at) ignora NULL,
    então conta só as feitas.
    """
    query = (
        select(
            Goal,
            func.count(GoalSubtask.id).label("total"),
            func.count(GoalSubtask.done_at).label("done"),
            RewardGrant,
        )
        .outerjoin(GoalSubtask, GoalSubtask.goal_id == Goal.id)
        .outerjoin(RewardGrant, RewardGrant.goal_id == Goal.id)
        .where(Goal.user_id == user_id)
        .group_by(Goal.id, RewardGrant.id)
        .order_by(Goal.deadline, Goal.created_at)
    )
    if goal_id is not None:
        query = query.where(Goal.id == goal_id)
    elif not include_archived:
        query = query.where(Goal.active.is_(True))
    return [
        GoalProgress(goal, total, done, grant)
        for goal, total, done, grant in db.execute(query)
    ]


def get_goal_progress(db: Session, user_id: uuid.UUID, goal_id: uuid.UUID) -> GoalProgress:
    found = list_goals(db, user_id, goal_id=goal_id)
    if not found:
        raise NotFoundError("Meta não encontrada")
    return found[0]


def get_goal(
    db: Session, user_id: uuid.UUID, goal_id: uuid.UUID, lock: bool = False
) -> Goal:
    query = select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
    if lock:
        # FOR UPDATE: mudanças nos passos da mesma meta passam uma de cada
        # vez. Sem isso, dois cliques juntos no último passo poderiam, cada
        # um, ver "meta completa e sem vale" e tentar criar o vale.
        query = query.with_for_update()
    goal = db.scalar(query)
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


# ---------- Mudanças nos passos (e o vale da meta) ----------


def add_subtask(db: Session, user: User, goal_id: uuid.UUID, name: str) -> RewardGrant | None:
    goal = get_goal(db, user.id, goal_id, lock=True)
    db.add(GoalSubtask(user_id=user.id, goal_id=goal.id, name=name))
    return _apply(db, goal)


def set_subtask(
    db: Session,
    user: User,
    goal_id: uuid.UUID,
    subtask_id: uuid.UUID,
    name: str | None = None,
    done: bool | None = None,
) -> RewardGrant | None:
    goal = get_goal(db, user.id, goal_id, lock=True)
    subtask = get_subtask(db, user.id, goal.id, subtask_id)
    if name is not None:
        subtask.name = name
    if done is True and subtask.done_at is None:
        subtask.done_at = func.now()
    elif done is False:
        subtask.done_at = None
    return _apply(db, goal)


def delete_subtask(
    db: Session, user: User, goal_id: uuid.UUID, subtask_id: uuid.UUID
) -> RewardGrant | None:
    goal = get_goal(db, user.id, goal_id, lock=True)
    db.delete(get_subtask(db, user.id, goal.id, subtask_id))
    return _apply(db, goal)


def _apply(db: Session, goal: Goal) -> RewardGrant | None:
    """Grava a mudança e acerta o vale. Devolve o vale novo, se saiu um agora."""
    db.flush()
    new_grant = _sync_goal_grant(db, goal)
    db.commit()
    if new_grant is not None:
        db.refresh(new_grant)
    return new_grant


def _sync_goal_grant(db: Session, goal: Goal) -> RewardGrant | None:
    """O vale da meta acompanha o estado dos passos.

    - Ficou completa, no prazo, sem vale ainda -> cria o vale (nível pela
      dificuldade: GOAL_TIER).
    - Deixou de estar completa e o vale não foi usado -> cancela o vale.
    - Deixou de estar completa e o vale JÁ foi usado -> recusa a mudança
      (ConflictError). Como nada foi commitado, o rollback desfaz tudo.

    Concluída depois do prazo não dá vale.
    """
    total, done = db.execute(
        select(func.count(GoalSubtask.id), func.count(GoalSubtask.done_at)).where(
            GoalSubtask.goal_id == goal.id
        )
    ).one()
    complete = total > 0 and done == total
    grant = db.scalar(select(RewardGrant).where(RewardGrant.goal_id == goal.id))

    if complete and grant is None and goal.active and today() <= goal.deadline:
        grant = RewardGrant(
            user_id=goal.user_id,
            period="meta",
            period_start=today(),
            tier=GOAL_TIER[goal.difficulty],
            goal_id=goal.id,
        )
        db.add(grant)
        db.flush()
        return grant

    if not complete and grant is not None:
        if grant.reward_id is not None:
            raise ConflictError(
                "O vale desta meta já foi usado: a meta não pode deixar de estar concluída"
            )
        db.delete(grant)
    return None
