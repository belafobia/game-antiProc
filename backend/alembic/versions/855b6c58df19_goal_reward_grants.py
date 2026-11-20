"""goal reward grants

Meta concluída no prazo passa a dar vale (period = 'meta'), com o nível pela
dificuldade. Para isso:
- reward_grants.tier vira coluna (antes era derivado do período), porque o
  vale de meta não tem período que diga o nível;
- reward_grants.goal_id liga o vale à meta (um vale por meta);
- o UNIQUE (user, period, period_start) vira índice parcial, só para os
  vales de período: duas metas concluídas no mesmo dia são vales diferentes.

Revision ID: 855b6c58df19
Revises: 713e096ceeb7
Create Date: 2026-11-20 20:31:18.944992

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '855b6c58df19'
down_revision: Union[str, Sequence[str], None] = '713e096ceeb7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # tier: entra aceitando NULL, é preenchido para os vales que já existem
    # (pelo período, a regra antiga) e só então vira NOT NULL. Assim a
    # migration funciona com ou sem dados.
    op.add_column('reward_grants', sa.Column('tier', sa.String(length=10), nullable=True))
    op.execute(
        """
        UPDATE reward_grants SET tier = CASE period
            WHEN 'semana' THEN 'basica'
            WHEN 'mes' THEN 'media'
            WHEN 'semestre' THEN 'boa'
            WHEN 'ano' THEN 'muito_boa'
        END
        """
    )
    op.alter_column('reward_grants', 'tier', nullable=False)

    op.add_column('reward_grants', sa.Column('goal_id', sa.Uuid(), nullable=True))
    op.drop_constraint(op.f('uq_reward_grants_user_id_period_period_start'), 'reward_grants', type_='unique')
    op.create_index('uq_reward_grants_user_id_period_period_start', 'reward_grants', ['user_id', 'period', 'period_start'], unique=True, postgresql_where=sa.text('goal_id IS NULL'))
    op.create_unique_constraint('uq_reward_grants_goal_id', 'reward_grants', ['goal_id'])
    op.create_foreign_key('fk_reward_grants_goal_id_user_id_goals', 'reward_grants', 'goals', ['goal_id', 'user_id'], ['id', 'user_id'])

    # O autogenerate não detecta CHECK constraints: escritas à mão.
    op.drop_constraint(op.f('ck_reward_grants_period_valid'), 'reward_grants', type_='check')
    op.create_check_constraint(
        op.f('ck_reward_grants_period_valid'),
        'reward_grants',
        "period IN ('semana', 'mes', 'semestre', 'ano', 'meta')",
    )
    op.create_check_constraint(
        op.f('ck_reward_grants_tier_valid'),
        'reward_grants',
        "tier IN ('basica', 'media', 'boa', 'muito_boa')",
    )
    op.create_check_constraint(
        op.f('ck_reward_grants_goal_consistent'),
        'reward_grants',
        "(period = 'meta') = (goal_id IS NOT NULL)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # O esquema antigo não tem como representar vale de meta: eles somem.
    op.execute("DELETE FROM reward_grants WHERE period = 'meta'")

    op.drop_constraint(op.f('ck_reward_grants_goal_consistent'), 'reward_grants', type_='check')
    op.drop_constraint(op.f('ck_reward_grants_tier_valid'), 'reward_grants', type_='check')
    op.drop_constraint(op.f('ck_reward_grants_period_valid'), 'reward_grants', type_='check')
    op.create_check_constraint(
        op.f('ck_reward_grants_period_valid'),
        'reward_grants',
        "period IN ('semana', 'mes', 'semestre', 'ano')",
    )

    op.drop_constraint('fk_reward_grants_goal_id_user_id_goals', 'reward_grants', type_='foreignkey')
    op.drop_constraint('uq_reward_grants_goal_id', 'reward_grants', type_='unique')
    op.drop_index('uq_reward_grants_user_id_period_period_start', table_name='reward_grants', postgresql_where=sa.text('goal_id IS NULL'))
    op.create_unique_constraint(op.f('uq_reward_grants_user_id_period_period_start'), 'reward_grants', ['user_id', 'period', 'period_start'])
    op.drop_column('reward_grants', 'goal_id')
    op.drop_column('reward_grants', 'tier')
