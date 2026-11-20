import uuid

from fastapi import APIRouter, status
from sqlalchemy import case, select

from app.api.deps import CurrentUser, DbSession
from app.models import Reward
from app.schemas.reward import RewardCreate, RewardOut, RewardUpdate
from app.services.errors import NotFoundError
from app.services.patching import apply_patch

router = APIRouter(prefix="/rewards", tags=["rewards"])

# Ordem de exibição: da básica para a muito boa (ordem alfabética não serve).
TIER_ORDER = case(
    {"basica": 0, "media": 1, "boa": 2, "muito_boa": 3}, value=Reward.tier
)


@router.get("", response_model=list[RewardOut])
def list_rewards(user: CurrentUser, db: DbSession, include_archived: bool = False):
    query = select(Reward).where(Reward.user_id == user.id)
    if not include_archived:
        query = query.where(Reward.active.is_(True))
    return db.scalars(query.order_by(TIER_ORDER, Reward.name)).all()


@router.post("", response_model=RewardOut, status_code=status.HTTP_201_CREATED)
def create_reward(body: RewardCreate, user: CurrentUser, db: DbSession):
    reward = Reward(user_id=user.id, **body.model_dump())
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.patch("/{reward_id}", response_model=RewardOut)
def update_reward(
    reward_id: uuid.UUID, body: RewardUpdate, user: CurrentUser, db: DbSession
):
    reward = db.scalar(
        select(Reward).where(Reward.id == reward_id, Reward.user_id == user.id)
    )
    if reward is None:
        raise NotFoundError("Recompensa não encontrada")
    apply_patch(reward, body.model_dump(exclude_unset=True), nullable={"description"})
    db.commit()
    db.refresh(reward)
    return reward
