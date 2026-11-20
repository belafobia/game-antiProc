from datetime import date

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.grant import GrantOut
from app.schemas.week import WeekCloseOut, WeekOut
from app.services.periods import today
from app.services.weeks import close_week, load_week

router = APIRouter(prefix="/weeks", tags=["weeks"])


# /current antes de /{day}: as rotas são testadas na ordem em que aparecem.
@router.get("/current", response_model=WeekOut)
def current_week(user: CurrentUser, db: DbSession):
    return load_week(db, user.id, today())


@router.get("/{day}", response_model=WeekOut)
def get_week(day: date, user: CurrentUser, db: DbSession):
    """A semana (segunda a domingo) que contém `day`. Qualquer dia dela serve."""
    return load_week(db, user.id, day)


@router.post(
    "/{day}/close",
    response_model=WeekCloseOut,
    status_code=status.HTTP_201_CREATED,
)
def close(day: date, user: CurrentUser, db: DbSession):
    review, grants = close_week(db, user, day)
    return WeekCloseOut(
        week_start=review.week_start,
        complete=review.complete,
        closed_at=review.closed_at,
        grants=[GrantOut.model_validate(g) for g in grants],
    )
