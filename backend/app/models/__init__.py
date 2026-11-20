# Todo model precisa ser importado aqui: é assim que o Alembic "enxerga"
# as tabelas no autogenerate. Model não importado = tabela não criada.
from app.models.base import Base
from app.models.completion import TaskCompletion
from app.models.goal import Goal, GoalSubtask
from app.models.reward import Reward
from app.models.reward_grant import GOAL_TIER, PERIOD_TIER, RewardGrant
from app.models.task import Task
from app.models.user import User
from app.models.week_review import WeekReview

__all__ = [
    "GOAL_TIER",
    "PERIOD_TIER",
    "Base",
    "Goal",
    "GoalSubtask",
    "Reward",
    "RewardGrant",
    "Task",
    "TaskCompletion",
    "User",
    "WeekReview",
]
