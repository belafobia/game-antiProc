import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PERIOD_TIER, Reward, RewardGrant, User, WeekReview
from app.services.errors import ConflictError, NotFoundError
from app.services.periods import (
    month_weeks,
    semester_months,
    semester_start,
    week_sunday,
    year_semesters,
)


def grant_for_complete_week(
    db: Session, user_id: uuid.UUID, week_monday: date
) -> list[RewardGrant]:
    """Dá o vale da semana e sobe a escada enquanto os períodos fecharem.

    - semana completa                      -> básica
    - todas as semanas do mês completas    -> média
    - todos os 6 meses do semestre         -> boa
    - os 2 semestres do ano                -> muito boa

    Cada degrau só é checado quando o de baixo acabou de ser ganho: o mês só
    pode virar completo no fechamento de uma das suas semanas, e assim por
    diante. Não importa a ordem em que as semanas forem fechadas.
    """
    granted = [_grant(db, user_id, "semana", week_monday)]

    sunday = week_sunday(week_monday)
    year, month = sunday.year, sunday.month
    if not _weeks_complete(db, user_id, month_weeks(year, month)):
        return granted
    granted.append(_grant(db, user_id, "mes", date(year, month, 1)))

    semester = semester_start(year, month)
    if not _all_granted(db, user_id, "mes", semester_months(semester)):
        return granted
    granted.append(_grant(db, user_id, "semestre", semester))

    if not _all_granted(db, user_id, "semestre", year_semesters(year)):
        return granted
    granted.append(_grant(db, user_id, "ano", date(year, 1, 1)))
    return granted


def _grant(db: Session, user_id: uuid.UUID, period: str, start: date) -> RewardGrant:
    grant = RewardGrant(
        user_id=user_id, period=period, period_start=start, tier=PERIOD_TIER[period]
    )
    db.add(grant)
    # flush: o degrau de cima conta os vales do banco, então este precisa
    # já estar lá (dentro da mesma transação) antes da próxima contagem.
    db.flush()
    return grant


def _weeks_complete(db: Session, user_id: uuid.UUID, mondays: list[date]) -> bool:
    count = db.scalar(
        select(func.count()).where(
            WeekReview.user_id == user_id,
            WeekReview.complete.is_(True),
            WeekReview.week_start.in_(mondays),
        )
    )
    return count == len(mondays)


def _all_granted(
    db: Session, user_id: uuid.UUID, period: str, starts: list[date]
) -> bool:
    count = db.scalar(
        select(func.count()).where(
            RewardGrant.user_id == user_id,
            RewardGrant.period == period,
            RewardGrant.period_start.in_(starts),
        )
    )
    return count == len(starts)


def redeem_grant(
    db: Session, user: User, grant_id: uuid.UUID, reward_id: uuid.UUID
) -> RewardGrant:
    """Usa um vale: escolhe uma recompensa do mesmo nível do vale."""
    # FOR UPDATE: dois cliques juntos não usam o mesmo vale duas vezes. O
    # segundo espera e, quando continuar, já vê o vale como usado.
    grant = db.scalar(
        select(RewardGrant)
        .where(RewardGrant.id == grant_id, RewardGrant.user_id == user.id)
        .with_for_update()
    )
    if grant is None:
        raise NotFoundError("Vale não encontrado")
    if grant.reward_id is not None:
        raise ConflictError("Este vale já foi usado")

    reward = db.scalar(
        select(Reward).where(Reward.id == reward_id, Reward.user_id == user.id)
    )
    if reward is None:
        raise NotFoundError("Recompensa não encontrada")
    if not reward.active:
        raise ConflictError("Recompensa arquivada")
    if reward.tier != grant.tier:
        raise ConflictError(
            f"Este vale é de recompensa '{grant.tier}', "
            f"e a escolhida é '{reward.tier}'"
        )

    grant.reward_id = reward.id
    grant.redeemed_at = func.now()
    db.commit()
    db.refresh(grant)
    return grant
