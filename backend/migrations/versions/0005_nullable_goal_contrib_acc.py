"""nullable_goal_contrib_acc

Revision ID: 0005_nullable_goal_contrib_acc
Revises: 0004_quotes_and_broker_goals
Create Date: 2026-09-17 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_nullable_goal_contrib_acc"
down_revision: str | None = "0004_quotes_and_broker_goals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "goal_contributions",
        "account_id",
        existing_type=sa.UUID(),
        nullable=True,
        schema="finanzas",
    )


def downgrade() -> None:
    op.alter_column(
        "goal_contributions",
        "account_id",
        existing_type=sa.UUID(),
        nullable=False,
        schema="finanzas",
    )
