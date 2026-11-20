import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.models import Goal, GoalSubtask
from app.schemas.goal import (
    GoalChangeOut,
    GoalCreate,
    GoalDetailOut,
    GoalOut,
    GoalUpdate,
    SubtaskCreate,
    SubtaskOut,
    SubtaskUpdate,
)
from app.schemas.grant import GrantOut
from app.services import goals as goals_service
from app.services.errors import InvalidInputError
from app.services.goals import (
    GoalProgress,
    get_goal,
    get_goal_progress,
    list_goals,
    list_subtasks,
)
from app.services.patching import apply_patch
from app.services.periods import today

router = APIRouter(prefix="/goals", tags=["goals"])


def _goal_out(p: GoalProgress) -> dict:
    goal = p.goal
    return dict(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        category=goal.category,
        difficulty=goal.difficulty,
        deadline=goal.deadline,
        active=goal.active,
        created_at=goal.created_at,
        subtasks_total=p.total,
        subtasks_done=p.done,
        progress=p.percent,
        completed=p.completed,
        grant_id=p.grant.id if p.grant else None,
        grant_tier=p.grant.tier if p.grant else None,
        grant_redeemed=bool(p.grant and p.grant.reward_id),
    )


def _detail(db: DbSession, user_id: uuid.UUID, goal_id: uuid.UUID) -> GoalDetailOut:
    progress = get_goal_progress(db, user_id, goal_id)
    return GoalDetailOut(
        **_goal_out(progress),
        subtasks=[SubtaskOut.model_validate(s) for s in list_subtasks(db, goal_id)],
    )


def _check_deadline(deadline) -> None:
    # "Hoje" de São Paulo: no schema não dá, ele não sabe o fuso do usuário.
    if deadline is not None and deadline < today():
        raise InvalidInputError("O prazo não pode estar no passado")


@router.get("", response_model=list[GoalOut])
def list_all(user: CurrentUser, db: DbSession, include_archived: bool = False):
    return [GoalOut(**_goal_out(p)) for p in list_goals(db, user.id, include_archived)]


@router.post("", response_model=GoalDetailOut, status_code=status.HTTP_201_CREATED)
def create_goal(body: GoalCreate, user: CurrentUser, db: DbSession):
    _check_deadline(body.deadline)
    goal = Goal(user_id=user.id, **body.model_dump(exclude={"subtasks"}))
    db.add(goal)
    db.flush()  # gera o goal.id para as subtarefas
    db.add_all(
        GoalSubtask(user_id=user.id, goal_id=goal.id, name=name)
        for name in body.subtasks
    )
    db.commit()
    return _detail(db, user.id, goal.id)


@router.get("/{goal_id}", response_model=GoalDetailOut)
def get_one(goal_id: uuid.UUID, user: CurrentUser, db: DbSession):
    return _detail(db, user.id, goal_id)


@router.patch("/{goal_id}", response_model=GoalDetailOut)
def update_goal(goal_id: uuid.UUID, body: GoalUpdate, user: CurrentUser, db: DbSession):
    goal = get_goal(db, user.id, goal_id)
    changes = body.model_dump(exclude_unset=True)
    _check_deadline(changes.get("deadline"))
    apply_patch(goal, changes, nullable={"description"})
    db.commit()
    return _detail(db, user.id, goal_id)


# As mudanças nos passos devolvem a meta inteira (porcentagem já recalculada)
# e o vale novo, se a mudança concluiu a meta no prazo.


def _change_out(db: DbSession, user_id: uuid.UUID, goal_id: uuid.UUID, new_grant) -> GoalChangeOut:
    return GoalChangeOut(
        goal=_detail(db, user_id, goal_id),
        new_grant=GrantOut.model_validate(new_grant) if new_grant else None,
    )


@router.post(
    "/{goal_id}/subtasks",
    response_model=GoalChangeOut,
    status_code=status.HTTP_201_CREATED,
)
def add_subtask(
    goal_id: uuid.UUID, body: SubtaskCreate, user: CurrentUser, db: DbSession
):
    new_grant = goals_service.add_subtask(db, user, goal_id, body.name)
    return _change_out(db, user.id, goal_id, new_grant)


@router.patch("/{goal_id}/subtasks/{subtask_id}", response_model=GoalChangeOut)
def update_subtask(
    goal_id: uuid.UUID,
    subtask_id: uuid.UUID,
    body: SubtaskUpdate,
    user: CurrentUser,
    db: DbSession,
):
    changes = body.model_dump(exclude_unset=True)
    if "name" in changes and changes["name"] is None:
        raise InvalidInputError("O campo 'name' não pode ser nulo")
    new_grant = goals_service.set_subtask(
        db, user, goal_id, subtask_id, name=changes.get("name"), done=changes.get("done")
    )
    return _change_out(db, user.id, goal_id, new_grant)


@router.delete("/{goal_id}/subtasks/{subtask_id}", response_model=GoalChangeOut)
def delete_subtask(
    goal_id: uuid.UUID, subtask_id: uuid.UUID, user: CurrentUser, db: DbSession
):
    new_grant = goals_service.delete_subtask(db, user, goal_id, subtask_id)
    return _change_out(db, user.id, goal_id, new_grant)
