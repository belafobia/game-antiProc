import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RewardGrant, Task, TaskCompletion, User, WeekReview
from app.services.errors import ConflictError
from app.services.grants import grant_for_complete_week
from app.services.locks import lock_user
from app.services.periods import today, week_start, week_sunday
from app.services.schedule import Week, build_week


def get_review(db: Session, user_id: uuid.UUID, start: date) -> WeekReview | None:
    return db.scalar(
        select(WeekReview).where(
            WeekReview.user_id == user_id, WeekReview.week_start == start
        )
    )


def load_week(db: Session, user_id: uuid.UUID, day: date) -> Week:
    """A semana que contém `day`, com as tarefas de cada dia e os checks."""
    start = week_start(day)
    tasks = db.scalars(
        select(Task)
        .where(Task.user_id == user_id, Task.active.is_(True))
        .order_by(Task.created_at)
    ).all()
    rows = db.execute(
        select(TaskCompletion.task_id, TaskCompletion.day, TaskCompletion.id).where(
            TaskCompletion.user_id == user_id,
            TaskCompletion.day.between(start, week_sunday(start)),
        )
    ).all()
    week = build_week(start, list(tasks), {(r.task_id, r.day): r.id for r in rows})

    review = get_review(db, user_id, start)
    if review is not None:
        week.closed = True
        week.closed_complete = review.complete
    return week


def close_week(
    db: Session, user: User, day: date
) -> tuple[WeekReview, list[RewardGrant]]:
    """Fechamento de domingo. Devolve (fechamento, vales ganhos agora).

    Depois de fechada, a semana não aceita mais check nem desfazer: o
    resultado fica congelado, e é ele que conta para mês/semestre/ano.
    """
    start = week_start(day)
    sunday = week_sunday(start)
    if today() < sunday:
        raise ConflictError(
            f"A semana só pode ser fechada a partir do domingo ({sunday:%d/%m})"
        )

    # Mesmo lock do check: nenhum check entra enquanto a semana é avaliada.
    lock_user(db, user.id)
    if get_review(db, user.id, start) is not None:
        raise ConflictError("Esta semana já foi fechada")

    week = load_week(db, user.id, start)
    review = WeekReview(user_id=user.id, week_start=start, complete=week.complete)
    db.add(review)
    db.flush()

    grants = grant_for_complete_week(db, user.id, start) if review.complete else []
    db.commit()
    db.refresh(review)
    for grant in grants:
        db.refresh(grant)
    return review, grants
