import uuid

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DbSession
from app.services.completions import undo_completion

router = APIRouter(prefix="/completions", tags=["completions"])


@router.delete("/{completion_id}", status_code=status.HTTP_204_NO_CONTENT)
def undo(completion_id: uuid.UUID, user: CurrentUser, db: DbSession):
    undo_completion(db, user, completion_id)
