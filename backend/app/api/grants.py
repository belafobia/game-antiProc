import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models import RewardGrant
from app.schemas.grant import GrantOut, RedeemIn
from app.services.grants import redeem_grant

router = APIRouter(prefix="/grants", tags=["grants"])


@router.get("", response_model=list[GrantOut])
def list_grants(user: CurrentUser, db: DbSession, pending: bool | None = None):
    """Vales ganhos. `pending=true`: só os não usados; `false`: só os usados."""
    query = select(RewardGrant).where(RewardGrant.user_id == user.id)
    if pending is True:
        query = query.where(RewardGrant.reward_id.is_(None))
    elif pending is False:
        query = query.where(RewardGrant.reward_id.is_not(None))
    return db.scalars(query.order_by(RewardGrant.granted_at.desc())).all()


@router.post("/{grant_id}/redeem", response_model=GrantOut)
def redeem(grant_id: uuid.UUID, body: RedeemIn, user: CurrentUser, db: DbSession):
    return redeem_grant(db, user, grant_id, body.reward_id)
