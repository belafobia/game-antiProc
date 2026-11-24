import uuid
from dataclasses import dataclass, field
from datetime import date

from app.services.schedule import build_week, is_scheduled

MONDAY = date(2026, 11, 16)


@dataclass
class FakeTask:
    name: str
    weekdays: list[int]
    starts_on: date = date(2026, 1, 1)
    active: bool = True
    category: str | None = None
    id: uuid.UUID = field(default_factory=uuid.uuid4)


def test_task_only_falls_on_its_weekdays():
    lixo = FakeTask("Descer o lixo", weekdays=[0, 2, 4])
    assert is_scheduled(lixo, date(2026, 11, 16))  # segunda
    assert not is_scheduled(lixo, date(2026, 11, 17))  # terça


def test_task_does_not_count_before_it_starts():
    academia = FakeTask("Academia", weekdays=[3, 4], starts_on=date(2026, 11, 20))
    assert not is_scheduled(academia, date(2026, 11, 19))  # quinta, antes do início
    assert is_scheduled(academia, date(2026, 11, 20))  # sexta


def test_week_counts_from_90_percent():
    gatas = FakeTask("Cuidar das gatas", weekdays=list(range(7)))
    jiu = FakeTask("Jiu Jitsu", weekdays=[0, 1, 2])
    checks = {(gatas.id, MONDAY.replace(day=16 + i)): uuid.uuid4() for i in range(7)}
    checks |= {(jiu.id, MONDAY.replace(day=16 + i)): uuid.uuid4() for i in range(2)}

    # 9 de 10 = 90% exatos: já vale.
    week = build_week(MONDAY, [gatas, jiu], checks)
    assert (week.total, week.done, week.percent) == (10, 9, 90)
    assert week.complete

    # 8 de 10 = 80%: não vale.
    del checks[(jiu.id, date(2026, 11, 17))]
    assert not build_week(MONDAY, [gatas, jiu], checks).complete


def test_week_just_below_90_percent_does_not_count():
    # 17 de 19 = 89,47%: arredondaria para 89, e mesmo sem arredondar fica
    # abaixo de 90. Não vale.
    tasks = [FakeTask(f"t{i}", weekdays=[0]) for i in range(19)]
    checks = {(t.id, MONDAY): uuid.uuid4() for t in tasks[:17]}
    week = build_week(MONDAY, tasks, checks)
    assert week.percent == 89
    assert not week.complete


def test_empty_week_is_not_complete():
    assert not build_week(MONDAY, [], {}).complete


def test_percent_rounds_down():
    tasks = [FakeTask("Leitura", weekdays=list(range(7)))]
    checks = {(tasks[0].id, MONDAY.replace(day=16 + i)): uuid.uuid4() for i in range(6)}
    # 6/7 = 85,7% -> 85, nunca arredonda para cima
    assert build_week(MONDAY, tasks, checks).percent == 85
