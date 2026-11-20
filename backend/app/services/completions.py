import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Task, TaskCompletion, User
from app.services.errors import ConflictError, InvalidInputError, NotFoundError
from app.services.locks import lock_user
from app.services.periods import today, week_start
from app.services.schedule import is_scheduled
from app.services.weeks import get_review


def complete_task(
    db: Session, user: User, task_id: uuid.UUID, day: date | None = None
) -> TaskCompletion:
    """Dá check numa tarefa em um dia (padrão: hoje)."""
    day = day or today()
    if day > today():
        raise InvalidInputError("Não dá para marcar um dia que ainda não chegou")

    # Lock por usuário ANTES das checagens: sem ele, dois cliques juntos
    # passariam os dois em "ainda não tem check" (o UNIQUE do banco barraria
    # o segundo, mas com um 500 em vez de um 409 claro), e um check poderia
    # entrar no meio do fechamento da semana.
    lock_user(db, user.id)

    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if task is None:
        raise NotFoundError("Tarefa não encontrada")
    if not task.active:
        raise ConflictError("Tarefa arquivada")
    if not is_scheduled(task, day):
        raise ConflictError("Esta tarefa não está marcada para esse dia")
    if get_review(db, user.id, week_start(day)) is not None:
        raise ConflictError("Essa semana já foi fechada")

    already = db.scalar(
        select(TaskCompletion.id).where(
            TaskCompletion.task_id == task.id, TaskCompletion.day == day
        )
    )
    if already is not None:
        raise ConflictError("Esta tarefa já tem check nesse dia")

    completion = TaskCompletion(user_id=user.id, task_id=task.id, day=day)
    db.add(completion)
    db.commit()
    db.refresh(completion)
    return completion


def undo_completion(db: Session, user: User, completion_id: uuid.UUID) -> None:
    """Tira o check. Pode a qualquer momento, até a semana ser fechada."""
    lock_user(db, user.id)

    completion = db.scalar(
        select(TaskCompletion).where(
            TaskCompletion.id == completion_id, TaskCompletion.user_id == user.id
        )
    )
    if completion is None:
        raise NotFoundError("Conclusão não encontrada")
    if get_review(db, user.id, week_start(completion.day)) is not None:
        raise ConflictError("Essa semana já foi fechada: o check não pode mais sair")

    db.delete(completion)
    db.commit()
