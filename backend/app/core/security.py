import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import settings

# Parâmetros padrão da lib (recomendação OWASP para argon2id).
_hasher = PasswordHasher()

# Hash calculado uma vez para o login de email inexistente: verificar a senha
# contra ele gasta o mesmo tempo que um login real. Sem isso, a resposta mais
# rápida denunciaria quais emails estão cadastrados (timing attack).
DUMMY_HASH = _hasher.hash("senha-que-nao-existe")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> uuid.UUID | None:
    """Devolve o user_id do token, ou None se for inválido/expirado."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            # Lista explícita: impede o ataque de trocar o algoritmo no header
            # do token (ex.: "alg": "none").
            algorithms=[settings.jwt_algorithm],
            options={"require": ["sub", "exp"]},
        )
        return uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
