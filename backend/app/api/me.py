from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.schemas.user import MeOut

router = APIRouter(tags=["me"])


@router.get("/me", response_model=MeOut)
def get_me(user: CurrentUser):
    return user
