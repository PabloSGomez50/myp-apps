"""monthly_split_types

Revision ID: 0011_monthly_split_types
Revises: 0010_dynamic_expense_splitting
Create Date: 2026-10-12 16:55:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0011_monthly_split_types"
down_revision: str | None = "0010_dynamic_expense_splitting"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE finanzas.monthly_split_rules
        ADD COLUMN IF NOT EXISTS applicable_expense_types JSONB NOT NULL DEFAULT '["FIXED_HOUSEHOLD"]'::jsonb;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE finanzas.monthly_split_rules
        DROP COLUMN IF EXISTS applicable_expense_types;
        """
    )
