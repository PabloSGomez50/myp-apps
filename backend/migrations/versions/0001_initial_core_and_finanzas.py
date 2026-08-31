"""initial_core_and_finanzas_schemas

Revision ID: 0001_initial_core_and_finanzas
Revises:
Create Date: 2026-08-31 03:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_core_and_finanzas"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create PostgreSQL Schemas
    op.execute("CREATE SCHEMA IF NOT EXISTS core")
    op.execute("CREATE SCHEMA IF NOT EXISTS finanzas")
    op.execute("CREATE SCHEMA IF NOT EXISTS inventario")

    # 2. Core Enums & Tables
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("pin_hash", sa.String(255), nullable=True),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("color_avatar", sa.String(30), nullable=False, server_default="#16a34a"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="core",
    )

    op.create_table(
        "households",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column(
            "moneda_principal",
            sa.Enum("ARS", "USD", name="currency_enum", schema="core"),
            nullable=False,
            server_default="ARS",
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="core",
    )

    op.create_table(
        "household_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "rol",
            sa.Enum("ADMIN", "MEMBER", name="role_enum", schema="core"),
            nullable=False,
            server_default="MEMBER",
        ),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="core",
    )

    # 3. Finanzas Enums & Tables
    op.create_table(
        "accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column(
            "tipo",
            sa.Enum(
                "BANK",
                "FINTECH",
                "CASH",
                "CRYPTO_WALLET",
                name="account_type_enum",
                schema="finanzas",
            ),
            nullable=False,
            server_default="BANK",
        ),
        sa.Column("moneda", sa.String(10), nullable=False, server_default="ARS"),
        sa.Column("saldo_actual", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column(
            "tipo_gasto",
            sa.Enum(
                "FIXED_HOUSEHOLD",
                "VARIABLE_HOUSEHOLD",
                "LEISURE_COUPLE",
                "FIXED_PERSONAL",
                "VARIABLE_PERSONAL",
                name="expense_type_enum",
                schema="finanzas",
            ),
            nullable=False,
            server_default="VARIABLE_HOUSEHOLD",
        ),
        sa.Column("icono", sa.String(50), nullable=False, server_default="shopping-bag"),
        sa.Column("color", sa.String(50), nullable=False, server_default="emerald"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "budgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.categories.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("monto_limite", sa.Numeric(14, 2), nullable=False),
        sa.Column("moneda", sa.String(10), nullable=False, server_default="ARS"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.accounts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "category_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.categories.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "tipo",
            sa.Enum(
                "EXPENSE",
                "INCOME",
                "TRANSFER",
                "SETTLEMENT",
                name="transaction_type_enum",
                schema="finanzas",
            ),
            nullable=False,
            server_default="EXPENSE",
        ),
        sa.Column("monto", sa.Numeric(14, 2), nullable=False),
        sa.Column("moneda", sa.String(10), nullable=False, server_default="ARS"),
        sa.Column("es_compartido", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("split_ratio", sa.Numeric(3, 2), nullable=False, server_default="0.50"),
        sa.Column("tipo_cambio", sa.Numeric(12, 4), nullable=False, server_default="1.0000"),
        sa.Column("descripcion", sa.String(255), nullable=False),
        sa.Column(
            "fecha", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "shopping_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column(
            "descuento_general_porcentaje", sa.Numeric(5, 2), nullable=False, server_default="0.00"
        ),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "shopping_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "list_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.shopping_lists.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("precio_unitario", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("cantidad", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("descuento_especifico_porcentaje", sa.Numeric(5, 2), nullable=True),
        sa.Column("comprado", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "savings_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("monto_objetivo", sa.Numeric(14, 2), nullable=False),
        sa.Column("monto_acumulado", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("moneda", sa.String(10), nullable=False, server_default="ARS"),
        sa.Column("fecha_limite", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "goal_contributions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.savings_goals.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("monto", sa.Numeric(14, 2), nullable=False),
        sa.Column(
            "fecha", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "brokers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "household_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("core.households.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("nombre", sa.String(100), nullable=False),
        sa.Column("saldo_total_ars", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("saldo_total_usd", sa.Numeric(14, 2), nullable=False, server_default="0.00"),
        sa.Column("saldo_total_crypto", sa.Numeric(18, 8), nullable=False, server_default="0.00"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )

    op.create_table(
        "broker_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "broker_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("finanzas.brokers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "tipo",
            sa.Enum(
                "DEPOSIT",
                "WITHDRAW",
                "BUY_SIMPLE",
                "SELL_SIMPLE",
                "FCI_SUBSCRIBE",
                "FCI_REDEEM",
                name="broker_tx_type_enum",
                schema="finanzas",
            ),
            nullable=False,
        ),
        sa.Column("monto", sa.Numeric(14, 2), nullable=False),
        sa.Column("moneda", sa.String(10), nullable=False, server_default="ARS"),
        sa.Column("descripcion", sa.String(255), nullable=False),
        sa.Column(
            "fecha", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        schema="finanzas",
    )


def downgrade() -> None:
    op.drop_table("broker_transactions", schema="finanzas")
    op.drop_table("brokers", schema="finanzas")
    op.drop_table("goal_contributions", schema="finanzas")
    op.drop_table("savings_goals", schema="finanzas")
    op.drop_table("shopping_items", schema="finanzas")
    op.drop_table("shopping_lists", schema="finanzas")
    op.drop_table("transactions", schema="finanzas")
    op.drop_table("budgets", schema="finanzas")
    op.drop_table("categories", schema="finanzas")
    op.drop_table("accounts", schema="finanzas")

    op.drop_table("household_members", schema="core")
    op.drop_table("households", schema="core")
    op.drop_table("users", schema="core")
