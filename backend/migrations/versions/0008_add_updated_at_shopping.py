"""add_updated_at_shopping

Revision ID: 0008_add_updated_at_shopping
Revises: 0007_shopping_phase6
Create Date: 2026-09-21 17:48:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_add_updated_at_shopping"
down_revision: str | None = "0007_shopping_phase6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "supermarkets",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="finanzas",
    )
    op.add_column(
        "food_price_history",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="finanzas",
    )


def downgrade() -> None:
    op.drop_column("food_price_history", "updated_at", schema="finanzas")
    op.drop_column("supermarkets", "updated_at", schema="finanzas")
