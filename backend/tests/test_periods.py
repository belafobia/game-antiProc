from datetime import date, datetime, timezone

from app.services.periods import (
    month_weeks,
    semester_months,
    semester_start,
    today,
    week_start,
)


def test_week_starts_on_monday():
    # 20/11/2026 é sexta; 16/11 é a segunda; domingo 22/11 ainda é a mesma semana.
    assert week_start(date(2026, 11, 20)) == date(2026, 11, 16)
    assert week_start(date(2026, 11, 16)) == date(2026, 11, 16)
    assert week_start(date(2026, 11, 22)) == date(2026, 11, 16)


def test_today_uses_sao_paulo_time():
    # 01:00 UTC do dia 21 ainda é 22:00 do dia 20 em São Paulo.
    assert today(datetime(2026, 11, 21, 1, 0, tzinfo=timezone.utc)) == date(2026, 11, 20)


def test_week_belongs_to_month_of_its_sunday():
    # Novembro/2026: domingos 1, 8, 15, 22, 29.
    weeks = month_weeks(2026, 11)
    assert weeks == [
        date(2026, 10, 26),  # seg 26/out - dom 1/nov: conta para novembro
        date(2026, 11, 2),
        date(2026, 11, 9),
        date(2026, 11, 16),
        date(2026, 11, 23),
    ]
    # E por isso não conta para outubro.
    assert date(2026, 10, 26) not in month_weeks(2026, 10)


def test_every_week_of_a_year_falls_in_exactly_one_month():
    all_weeks = [w for m in range(1, 13) for w in month_weeks(2027, m)]
    assert len(all_weeks) == len(set(all_weeks)) == 52


def test_semesters():
    assert semester_start(2027, 3) == date(2027, 1, 1)
    assert semester_start(2027, 7) == date(2027, 7, 1)
    assert semester_months(date(2027, 7, 1))[-1] == date(2027, 12, 1)
