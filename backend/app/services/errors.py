"""Erros de regra de negócio.

Os services não conhecem HTTP: levantam estes erros, e o handler registrado
em main.py traduz cada um para o status code correspondente. Assim a mesma
regra pode ser reaproveitada fora da API (scripts, jobs) sem depender do
FastAPI.
"""


class DomainError(Exception):
    status_code = 400

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


class NotFoundError(DomainError):
    # Também usado para recursos de OUTRO usuário: a API não confirma que o
    # id existe.
    status_code = 404


class ConflictError(DomainError):
    # A requisição é válida, mas o estado atual não permite (limite atingido,
    # saldo insuficiente, prazo vencido, item arquivado).
    status_code = 409


class InvalidInputError(DomainError):
    status_code = 422
