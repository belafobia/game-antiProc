def percent(done: int, total: int) -> int:
    """Porcentagem inteira, arredondada para baixo.

    Para baixo de propósito: 99,9% não pode aparecer como 100% enquanto
    faltar alguma coisa.
    """
    return done * 100 // total if total else 0
