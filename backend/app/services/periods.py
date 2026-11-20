"""Calendário das regras: semana, mês, semestre e ano.

Funções puras (sem banco): fáceis de testar e de raciocinar.
"""

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

# O "dia" e a "semana" são os do usuário, não os do servidor
# (o Render roda em UTC: meia-noite UTC = 21h em São Paulo).
APP_TZ = ZoneInfo("America/Sao_Paulo")


def today(now: datetime | None = None) -> date:
    return (now or datetime.now(APP_TZ)).astimezone(APP_TZ).date()


def week_start(day: date) -> date:
    """Segunda-feira da semana de `day`. A semana vai de segunda a domingo."""
    # weekday(): segunda = 0 ... domingo = 6
    return day - timedelta(days=day.weekday())


def week_days(start: date) -> list[date]:
    return [start + timedelta(days=i) for i in range(7)]


def week_sunday(start: date) -> date:
    return start + timedelta(days=6)


def month_weeks(year: int, month: int) -> list[date]:
    """Segundas das semanas que pertencem ao mês.

    Uma semana pertence ao mês do seu DOMINGO, o dia em que ela é fechada.
    Assim toda semana cai em exatamente um mês, mesmo as que cruzam a virada
    (ex.: seg 28/set a dom 4/out conta para outubro).
    """
    first = date(year, month, 1)
    sunday = first + timedelta(days=6 - first.weekday())
    weeks = []
    while sunday.month == month:
        weeks.append(sunday - timedelta(days=6))
        sunday += timedelta(days=7)
    return weeks


def semester_start(year: int, month: int) -> date:
    return date(year, 1 if month <= 6 else 7, 1)


def semester_months(start: date) -> list[date]:
    return [date(start.year, start.month + i, 1) for i in range(6)]


def year_semesters(year: int) -> list[date]:
    return [date(year, 1, 1), date(year, 7, 1)]
