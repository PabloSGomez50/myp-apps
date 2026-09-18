"""currency_quotes_and_broker_goals

Revision ID: 0004_quotes_and_broker_goals
Revises: 0003_tx_account_opt_mappings
Create Date: 2026-09-17 08:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_quotes_and_broker_goals"
down_revision: str | None = "0003_tx_account_opt_mappings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. Create finanzas.currency_quotes table if not exists
    if not inspector.has_table("currency_quotes", schema="finanzas"):
        op.create_table(
            "currency_quotes",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("moneda_origen", sa.String(length=20), nullable=False),
            sa.Column("moneda_destino", sa.String(length=10), server_default="ARS", nullable=False),
            sa.Column("cotizacion", sa.Numeric(14, 4), nullable=False),
            sa.Column("fecha", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["household_id"],
                ["core.households.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            schema="finanzas",
        )
        op.create_index(
            "ix_finanzas_currency_quotes_household_id",
            "currency_quotes",
            ["household_id"],
            schema="finanzas",
        )
        op.create_index(
            "ix_finanzas_currency_quotes_moneda_origen",
            "currency_quotes",
            ["moneda_origen"],
            schema="finanzas",
        )

    # 2. Add broker_id column to finanzas.goal_contributions if not exists
    if inspector.has_table("goal_contributions", schema="finanzas"):
        columns = [
            c["name"] for c in inspector.get_columns("goal_contributions", schema="finanzas")
        ]
        if "broker_id" not in columns:
            op.add_column(
                "goal_contributions",
                sa.Column("broker_id", postgresql.UUID(as_uuid=True), nullable=True),
                schema="finanzas",
            )
            op.create_foreign_key(
                "fk_goal_contributions_broker_id",
                "goal_contributions",
                "brokers",
                ["broker_id"],
                ["id"],
                source_schema="finanzas",
                referent_schema="finanzas",
                ondelete="SET NULL",
            )

    # 3. Create finanzas.investment_assets table if not exists
    if not inspector.has_table("investment_assets", schema="finanzas"):
        op.create_table(
            "investment_assets",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("household_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("broker_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("ticker", sa.String(length=20), nullable=False),
            sa.Column("nombre", sa.String(length=150), nullable=False),
            sa.Column("tipo", sa.String(length=50), nullable=False),
            sa.Column("cantidad", sa.Numeric(18, 8), server_default="0.00", nullable=False),
            sa.Column("precio_compra", sa.Numeric(14, 2), server_default="0.00", nullable=False),
            sa.Column("precio_actual", sa.Numeric(14, 2), server_default="0.00", nullable=False),
            sa.Column(
                "rentabilidad_esperada_anual",
                sa.Numeric(7, 2),
                server_default="0.00",
                nullable=False,
            ),
            sa.Column("moneda", sa.String(length=10), server_default="ARS", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(
                ["household_id"],
                ["core.households.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["broker_id"],
                ["finanzas.brokers.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
            schema="finanzas",
        )
        op.create_index(
            "ix_finanzas_investment_assets_household_id",
            "investment_assets",
            ["household_id"],
            schema="finanzas",
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("investment_assets", schema="finanzas"):
        op.drop_table("investment_assets", schema="finanzas")

    if inspector.has_table("goal_contributions", schema="finanzas"):
        columns = [
            c["name"] for c in inspector.get_columns("goal_contributions", schema="finanzas")
        ]
        if "broker_id" in columns:
            op.drop_constraint(
                "fk_goal_contributions_broker_id",
                "goal_contributions",
                schema="finanzas",
                type_="foreignkey",
            )
            op.drop_column("goal_contributions", "broker_id", schema="finanzas")

    if inspector.has_table("currency_quotes", schema="finanzas"):
        op.drop_table("currency_quotes", schema="finanzas")
