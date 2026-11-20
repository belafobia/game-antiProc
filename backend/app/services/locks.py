import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User


def lock_user(db: Session, user_id: uuid.UUID) -> None:
    """Lock por usuário: serializa checks, desfazer e fechamento da semana.

    Trava a linha do usuário em `users` até o commit/rollback. Outra transação
    que pedir o mesmo lock espera; usuários diferentes não se bloqueiam.
    Sem ele, um check chegando no mesmo instante do fechamento poderia entrar
    numa semana que já foi avaliada como incompleta.
    """
    db.execute(select(User.id).where(User.id == user_id).with_for_update())
