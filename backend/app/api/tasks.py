import uuid

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import Task
from app.schemas.task import (
    CompletionIn,
    CompletionOut,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)
from app.services.completions import complete_task
from app.services.errors import NotFoundError
from app.services.patching import apply_patch
from app.services.periods import today

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskOut])
def list_tasks(user: CurrentUser, db: DbSession, include_archived: bool = False):
    query = select(Task).where(Task.user_id == user.id)
    if not include_archived:
        query = query.where(Task.active.is_(True))
    return db.scalars(query.order_by(Task.created_at)).all()


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, user: CurrentUser, db: DbSession):
    # user_id vem do token, nunca do corpo da requisição.
    data = body.model_dump()
    data["starts_on"] = data["starts_on"] or today()
    task = Task(user_id=user.id, **data)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(task_id: uuid.UUID, body: TaskUpdate, user: CurrentUser, db: DbSession):
    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise NotFoundError("Tarefa não encontrada")
    # exclude_unset: só o que o cliente mandou. Campo ausente = não mexe.
    apply_patch(task, body.model_dump(exclude_unset=True), nullable={"category"})
    db.commit()
    db.refresh(task)
    return task


@router.post(
    "/{task_id}/complete",
    response_model=CompletionOut,
    status_code=status.HTTP_201_CREATED,
)
def complete(
    task_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    body: CompletionIn | None = None,
):
    return complete_task(db, user, task_id, body.day if body else None)
