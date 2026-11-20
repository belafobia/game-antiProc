from typing import Any

from app.services.errors import InvalidInputError


def apply_patch(obj: Any, changes: dict[str, Any], nullable: set[str]) -> None:
    """Aplica um PATCH parcial (só os campos enviados).

    Enviar `null` só é permitido em colunas que aceitam NULL; nas demais
    (ex.: name), virar 422 é melhor que estourar NOT NULL no banco (500).
    """
    for field, value in changes.items():
        if value is None and field not in nullable:
            raise InvalidInputError(f"O campo '{field}' não pode ser nulo")
        setattr(obj, field, value)
