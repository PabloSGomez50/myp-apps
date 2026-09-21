import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AccountTypeEnum(StrEnum):
    BANK = "BANK"
    FINTECH = "FINTECH"
    CASH = "CASH"
    CRYPTO_WALLET = "CRYPTO_WALLET"


class ExpenseTypeEnum(StrEnum):
    FIXED_HOUSEHOLD = "FIXED_HOUSEHOLD"
    VARIABLE_HOUSEHOLD = "VARIABLE_HOUSEHOLD"
    LEISURE_COUPLE = "LEISURE_COUPLE"
    FIXED_PERSONAL = "FIXED_PERSONAL"
    VARIABLE_PERSONAL = "VARIABLE_PERSONAL"


class TransactionTypeEnum(StrEnum):
    EXPENSE = "EXPENSE"
    INCOME = "INCOME"
    TRANSFER = "TRANSFER"
    SETTLEMENT = "SETTLEMENT"


class BrokerTxTypeEnum(StrEnum):
    DEPOSIT = "DEPOSIT"
    WITHDRAW = "WITHDRAW"
    BUY_SIMPLE = "BUY_SIMPLE"
    SELL_SIMPLE = "SELL_SIMPLE"
    FCI_SUBSCRIBE = "FCI_SUBSCRIBE"
    FCI_REDEEM = "FCI_REDEEM"


class Account(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "accounts"
    __table_args__ = {"schema": "finanzas"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo: Mapped[AccountTypeEnum] = mapped_column(
        SQLEnum(AccountTypeEnum, name="account_type_enum", schema="finanzas"),
        default=AccountTypeEnum.BANK,
        nullable=False,
    )
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)
    saldo_actual: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Category(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    tipo_gasto: Mapped[ExpenseTypeEnum] = mapped_column(
        SQLEnum(ExpenseTypeEnum, name="expense_type_enum", schema="finanzas"),
        default=ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
        nullable=False,
    )
    icono: Mapped[str] = mapped_column(String(50), default="shopping-bag", nullable=False)
    color: Mapped[str] = mapped_column(String(50), default="emerald", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Budget(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "budgets"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    monto_limite: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)

    category: Mapped["Category"] = relationship("Category", lazy="selectin")


class Transaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "transactions"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    tipo: Mapped[TransactionTypeEnum] = mapped_column(
        SQLEnum(TransactionTypeEnum, name="transaction_type_enum", schema="finanzas"),
        default=TransactionTypeEnum.EXPENSE,
        nullable=False,
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)
    es_compartido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    split_ratio: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("0.50"), nullable=False
    )
    tipo_cambio: Mapped[Decimal] = mapped_column(
        Numeric(12, 4), default=Decimal("1.0000"), nullable=False
    )
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    account: Mapped["Account | None"] = relationship("Account", lazy="selectin")
    category: Mapped["Category | None"] = relationship("Category", lazy="selectin")


class Supermarket(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "supermarkets"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    icono: Mapped[str] = mapped_column(String(50), default="shopping-bag", nullable=False)
    color: Mapped[str] = mapped_column(String(50), default="emerald", nullable=False)
    descuento_habitual_porcentaje: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    dia_promocion_habitual: Mapped[str | None] = mapped_column(String(50), nullable=True)


class ShoppingList(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "shopping_lists"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supermarket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.supermarkets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False)
    descuento_general_porcentaje: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    supermarket: Mapped["Supermarket | None"] = relationship("Supermarket", lazy="selectin")
    items: Mapped[list["ShoppingItem"]] = relationship(
        "ShoppingItem",
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ShoppingItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "shopping_items"
    __table_args__ = {"schema": "finanzas"}

    list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.shopping_lists.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventario.items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    cantidad: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    descuento_especifico_porcentaje: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    comprado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    shopping_list: Mapped["ShoppingList"] = relationship("ShoppingList", back_populates="items")


class FoodPriceHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "food_price_history"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    supermarket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.supermarkets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    inventory_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventario.items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    item_nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    descuento_aplicado: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0.00"), nullable=False
    )
    precio_efectivo: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    supermarket: Mapped["Supermarket | None"] = relationship("Supermarket", lazy="selectin")


class SavingsGoal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "savings_goals"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    es_personal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    monto_objetivo: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    monto_acumulado: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)
    fecha_limite: Mapped[date | None] = mapped_column(Date, nullable=True)

    user: Mapped["User | None"] = relationship("User", lazy="selectin")
    contributions: Mapped[list["GoalContribution"]] = relationship(
        "GoalContribution", back_populates="goal", cascade="all, delete-orphan", lazy="selectin"
    )


class GoalContribution(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "goal_contributions"
    __table_args__ = {"schema": "finanzas"}

    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.savings_goals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    broker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.brokers.id", ondelete="SET NULL"),
        nullable=True,
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    goal: Mapped["SavingsGoal"] = relationship("SavingsGoal", back_populates="contributions")
    broker: Mapped["Broker | None"] = relationship("Broker", back_populates="contributions")


class Broker(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "brokers"
    __table_args__ = {"schema": "finanzas"}

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    saldo_total_ars: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    saldo_total_usd: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    saldo_total_crypto: Mapped[Decimal] = mapped_column(
        Numeric(18, 8), default=Decimal("0.00"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    contributions: Mapped[list["GoalContribution"]] = relationship(
        "GoalContribution", back_populates="broker"
    )


class BrokerTransaction(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "broker_transactions"
    __table_args__ = {"schema": "finanzas"}

    broker_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.brokers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo: Mapped[BrokerTxTypeEnum] = mapped_column(
        SQLEnum(BrokerTxTypeEnum, name="broker_tx_type_enum", schema="finanzas"),
        nullable=False,
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )


class CategoryMapping(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "category_mappings"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patron: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    category: Mapped["Category"] = relationship("Category", lazy="selectin")


class CurrencyQuote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "currency_quotes"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    moneda_origen: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    moneda_destino: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)
    cotizacion: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True
    )


class InvestmentAsset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "investment_assets"
    __table_args__ = {"schema": "finanzas"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    broker_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finanzas.brokers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    cantidad: Mapped[Decimal] = mapped_column(
        Numeric(18, 8), default=Decimal("0.00"), nullable=False
    )
    precio_compra: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    precio_actual: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0.00"), nullable=False
    )
    rentabilidad_esperada_anual: Mapped[Decimal] = mapped_column(
        Numeric(7, 2), default=Decimal("0.00"), nullable=False
    )
    moneda: Mapped[str] = mapped_column(String(10), default="ARS", nullable=False)

    broker: Mapped["Broker | None"] = relationship("Broker")
