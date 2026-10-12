"""dynamic_expense_splitting

Revision ID: 0010_dynamic_expense_splitting
Revises: 0009_supermarket_discount_type
Create Date: 2026-10-11 20:55:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0010_dynamic_expense_splitting"
down_revision: str | None = "0009_supermarket_discount_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE core.households ADD COLUMN IF NOT EXISTS default_split_ratios JSONB;")

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS finanzas.monthly_split_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            household_id UUID NOT NULL REFERENCES core.households(id) ON DELETE CASCADE,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            user_ratios JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
            CONSTRAINT uq_household_monthly_split UNIQUE (household_id, year, month)
        );
        CREATE INDEX IF NOT EXISTS ix_finanzas_monthly_split_rules_household_id ON finanzas.monthly_split_rules(household_id);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS finanzas.monthly_split_rules;")
    op.execute("ALTER TABLE core.households DROP COLUMN IF EXISTS default_split_ratios;")
