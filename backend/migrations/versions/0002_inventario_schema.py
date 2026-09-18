"""inventario_schema

Revision ID: 0002_inventario_schema
Revises: 0001_initial_core_and_finanzas
Create Date: 2026-08-31 16:55:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_inventario_schema"
down_revision: str | None = "0001_initial_core_and_finanzas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS inventario")

    # MovementType Enum
    op.execute(
        "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type_enum') THEN "
        "CREATE TYPE inventario.movement_type_enum AS ENUM ('CONSUMPTION', 'REPLENISHMENT', 'ADJUSTMENT'); "
        "END IF; END $$;"
    )

    # Locations Table
    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["core.households.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="inventario",
    )
    op.create_index(
        "ix_inventario_locations_household_id", "locations", ["household_id"], schema="inventario"
    )

    # Inventory Categories Table
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("icono", sa.String(length=50), nullable=False, server_default="package"),
        sa.Column("color", sa.String(length=50), nullable=False, server_default="emerald"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["core.households.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="inventario",
    )
    op.create_index(
        "ix_inventario_categories_household_id", "categories", ["household_id"], schema="inventario"
    )

    # Inventory Items Table
    op.create_table(
        "items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column(
            "stock_actual", sa.Numeric(precision=10, scale=2), nullable=False, server_default="1.00"
        ),
        sa.Column(
            "stock_minimo", sa.Numeric(precision=10, scale=2), nullable=False, server_default="1.00"
        ),
        sa.Column("unidad_medida", sa.String(length=30), nullable=False, server_default="unidades"),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["household_id"],
            ["core.households.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["inventario.locations.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["inventario.categories.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="inventario",
    )
    op.create_index(
        "ix_inventario_items_household_id", "items", ["household_id"], schema="inventario"
    )
    op.create_index(
        "ix_inventario_items_location_id", "items", ["location_id"], schema="inventario"
    )
    op.create_index(
        "ix_inventario_items_category_id", "items", ["category_id"], schema="inventario"
    )

    # Stock Logs Table
    op.create_table(
        "stock_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "tipo_movimiento",
            postgresql.ENUM(
                "CONSUMPTION",
                "REPLENISHMENT",
                "ADJUSTMENT",
                name="movement_type_enum",
                schema="inventario",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("cantidad_cambio", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("nota", sa.String(length=255), nullable=True),
        sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["item_id"],
            ["inventario.items.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["core.users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        schema="inventario",
    )
    op.create_index(
        "ix_inventario_stock_logs_item_id", "stock_logs", ["item_id"], schema="inventario"
    )


def downgrade() -> None:
    op.drop_table("stock_logs", schema="inventario")
    op.drop_table("items", schema="inventario")
    op.drop_table("categories", schema="inventario")
    op.drop_table("locations", schema="inventario")
    op.execute("DROP TYPE IF EXISTS inventario.movement_type_enum")
