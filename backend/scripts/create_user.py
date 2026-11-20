"""Cria um usuário (não existe cadastro público na API).

Uso, de dentro de backend/:
    uv run python -m scripts.create_user email@exemplo.com "Nome"

A senha é pedida no terminal (getpass): não aparece na tela nem fica no
histórico do shell, como ficaria se fosse passada como argumento.
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import User

MIN_PASSWORD_LENGTH = 8


def main() -> int:
    parser = argparse.ArgumentParser(description="Cria um usuário")
    parser.add_argument("email")
    parser.add_argument("display_name")
    args = parser.parse_args()

    email = args.email.strip().lower()
    display_name = args.display_name.strip()
    if "@" not in email or not display_name:
        print("Email ou nome inválido.", file=sys.stderr)
        return 1

    password = getpass.getpass("Senha: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        print(f"A senha precisa de pelo menos {MIN_PASSWORD_LENGTH} caracteres.", file=sys.stderr)
        return 1
    if password != getpass.getpass("Confirme a senha: "):
        print("As senhas não conferem.", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            print(f"Já existe um usuário com o email {email}.", file=sys.stderr)
            return 1
        user = User(
            email=email,
            display_name=display_name,
            password_hash=hash_password(password),
        )
        db.add(user)
        db.commit()
        print(f"Usuário criado: {user.email} (id {user.id})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
