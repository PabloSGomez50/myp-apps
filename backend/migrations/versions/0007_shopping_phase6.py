"""shopping_phase6

Revision ID: 0007_shopping_phase6
Revises: 0006_savings_goal_user
Create Date: 2026-09-21 16:44:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_shopping_phase6"
down_revision: str | None = "0006_savings_goal_user"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create finanzas.supermarkets table
    op.create_table(
        "supermarkets",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("icono", sa.String(length=50), server_default="shopping-bag", nullable=False),
        sa.Column("color", sa.String(length=50), server_default="emerald", nullable=False),
        sa.Column(
            "descuento_habitual_porcentaje",
            sa.Numeric(precision=5, scale=2),
            server_default=sa.text("0.00"),
            nullable=False,
        ),
        sa.Column("dia_promocion_habitual", sa.String(length=50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="finanzas",
    )

    # 2. Add columns to finanzas.shopping_lists
    op.add_column(
        "shopping_lists",
        sa.Column("supermarket_id", sa.UUID(as_uuid=True), nullable=True),
        schema="finanzas",
    )
    op.add_column(
        "shopping_lists",
        sa.Column(
            "estado",
            sa.String(length=20),
            server_default=sa.text("'ACTIVE'"),
            nullable=False,
        ),
        schema="finanzas",
    )
    op.create_foreign_key(
        "fk_shopping_lists_supermarket_id",
        "shopping_lists",
        "supermarkets",
        ["supermarket_id"],
        ["id"],
        source_schema="finanzas",
        referent_schema="finanzas",
        ondelete="SET NULL",
    )

    # 3. Add column to finanzas.shopping_items
    op.add_column(
        "shopping_items",
        sa.Column("inventory_item_id", sa.UUID(as_uuid=True), nullable=True),
        schema="finanzas",
    )
    op.create_foreign_key(
        "fk_shopping_items_inventory_item_id",
        "shopping_items",
        "items",
        ["inventory_item_id"],
        ["id"],
        source_schema="finanzas",
        referent_schema="inventario",
        ondelete="SET NULL",
    )

    # 4. Create finanzas.food_price_history table
    op.create_table(
        "food_price_history",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "supermarket_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.supermarkets.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "inventory_item_id",
            sa.UUID(as_uuid=True),
            sa.ForeignKey("inventario.items.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("item_nombre", sa.String(length=150), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column(
            "descuento_aplicado",
            sa.Numeric(precision=5, scale=2),
            server_default=sa.text("0.00"),
            nullable=False,
        ),
        sa.Column("precio_efectivo", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        schema="finanzas",
    )


def downgrade() -> None:
    op.drop_table("food_price_history", schema="finanzas")

    op.drop_constraint(
        "fk_shopping_items_inventory_item_id",
        "shopping_items",
        schema="finanzas",
        type_="foreignkey",
    )
    op.drop_column("shopping_items", "inventory_item_id", schema="finanzas")

    op.drop_constraint(
        "fk_shopping_lists_supermarket_id",
        "shopping_lists",
        schema="finanzas",
        type_="foreignkey",
    )
    op.drop_column("shopping_lists", "estado", schema="finanzas")
    op.drop_column("shopping_lists", "supermarket_id", schema="finanzas")

    op.drop_table("supermarkets", schema="finanzas")
