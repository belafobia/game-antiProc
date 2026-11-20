from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.security import (
    DUMMY_HASH,
    create_access_token,
    verify_password,
)
from app.models import User
from app.schemas.auth import LoginIn, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: DbSession):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))

    if user is None:
        # Gasta o mesmo tempo de um login real antes de recusar (timing attack).
        verify_password(body.password, DUMMY_HASH)
        valid = False
    else:
        valid = verify_password(body.password, user.password_hash)

    if not valid:
        # Mesma mensagem para email inexistente e senha errada: a API não
        # revela quais emails estão cadastrados.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )
    return TokenOut(access_token=create_access_token(user.id))
