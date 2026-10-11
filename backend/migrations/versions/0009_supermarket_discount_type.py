"""supermarket_discount_type

Revision ID: 0009_supermarket_discount_type
Revises: 0008_add_updated_at_shopping
Create Date: 2026-10-11 18:14:00.000000

"""

from collections.abc import Sequence

from alembic import op

revision: str = "0009_supermarket_discount_type"
down_revision: str | None = "0008_add_updated_at_shopping"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE finanzas.supermarkets ADD COLUMN IF NOT EXISTS tipo_descuento VARCHAR(20) DEFAULT 'ITEM_BY_ITEM' NOT NULL;"
    )
    op.execute(
        "ALTER TABLE finanzas.shopping_lists ADD COLUMN IF NOT EXISTS tipo_descuento VARCHAR(20) DEFAULT 'ITEM_BY_ITEM' NOT NULL;"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE finanzas.shopping_lists DROP COLUMN IF EXISTS tipo_descuento;")
    op.execute("ALTER TABLE finanzas.supermarkets DROP COLUMN IF EXISTS tipo_descuento;")
