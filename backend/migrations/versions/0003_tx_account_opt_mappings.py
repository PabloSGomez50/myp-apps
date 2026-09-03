"""tx_account_opt_mappings

Revision ID: 0003_tx_account_opt_mappings
Revises: 0002_inventario_schema
Create Date: 2026-09-03 03:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_tx_account_opt_mappings"
down_revision: str | None = "0002_inventario_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Make account_id nullable on finanzas.transactions
    op.alter_column(
        "transactions",
        "account_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
        schema="finanzas",
    )

    # 2. Create finanzas.category_mappings table
    op.create_table(
        "category_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patron", sa.String(length=100), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["core.households.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["finanzas.categories.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="finanzas",
    )
    op.create_index(
        "ix_finanzas_category_mappings_household_id",
        "category_mappings",
        ["household_id"],
        schema="finanzas",
    )
    op.create_index(
        "ix_finanzas_category_mappings_patron",
        "category_mappings",
        ["patron"],
        schema="finanzas",
    )


def downgrade() -> None:
    op.drop_table("category_mappings", schema="finanzas")
    op.alter_column(
        "transactions",
        "account_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
        schema="finanzas",
    )
