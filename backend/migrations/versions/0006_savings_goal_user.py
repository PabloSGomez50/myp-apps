"""savings_goal_user

Revision ID: 0006_savings_goal_user
Revises: 0005_nullable_goal_contrib_acc
Create Date: 2026-09-21 15:50:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_savings_goal_user"
down_revision: str | None = "0005_nullable_goal_contrib_acc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "savings_goals",
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=True),
        schema="finanzas",
    )
    op.add_column(
        "savings_goals",
        sa.Column("es_personal", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        schema="finanzas",
    )
    op.create_foreign_key(
        "fk_savings_goals_user_id",
        "savings_goals",
        "users",
        ["user_id"],
        ["id"],
        source_schema="finanzas",
        referent_schema="core",
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_savings_goals_user_id",
        "savings_goals",
        schema="finanzas",
        type_="foreignkey",
    )
    op.drop_column("savings_goals", "es_personal", schema="finanzas")
    op.drop_column("savings_goals", "user_id", schema="finanzas")
