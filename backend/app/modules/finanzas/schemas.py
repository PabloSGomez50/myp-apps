import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.modules.finanzas.models import (
    AccountTypeEnum,
    BrokerTxTypeEnum,
    ExpenseTypeEnum,
    TransactionTypeEnum,
)


# ==============================================================================
# Accounts
# ==============================================================================
class AccountBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    tipo: AccountTypeEnum = AccountTypeEnum.BANK
    moneda: str = Field(default="ARS", max_length=10)
    saldo_actual: Decimal = Field(default=Decimal("0.00"))


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    nombre: str | None = None
    tipo: AccountTypeEnum | None = None
    is_active: bool | None = None


class AccountOut(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    household_id: uuid.UUID
    is_active: bool
    created_at: datetime


# ==============================================================================
# Categories & Budgets
# ==============================================================================
class CategoryBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    tipo_gasto: ExpenseTypeEnum = ExpenseTypeEnum.VARIABLE_HOUSEHOLD
    icono: str = Field(default="shopping-bag", max_length=50)
    color: str = Field(default="emerald", max_length=50)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    nombre: str | None = None
    tipo_gasto: ExpenseTypeEnum | None = None
    icono: str | None = None
    color: str | None = None
    is_active: bool | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    is_active: bool
    created_at: datetime


class BudgetBase(BaseModel):
    category_id: uuid.UUID
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    monto_limite: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    monto_limite: Decimal | None = None


class BudgetOut(BudgetBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    gastado: Decimal = Decimal("0.00")
    porcentaje_consumido: Decimal = Decimal("0.00")
    category: CategoryOut | None = None


# ==============================================================================
# Transactions & Splitwise
# ==============================================================================
class TransactionBase(BaseModel):
    account_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    tipo: TransactionTypeEnum = TransactionTypeEnum.EXPENSE
    monto: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)
    es_compartido: bool = False
    split_ratio: Decimal = Field(default=Decimal("0.50"), ge=0, le=1)
    tipo_cambio: Decimal = Field(default=Decimal("1.0000"), gt=0)
    descripcion: str = Field(..., max_length=255)
    fecha: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TransactionCreate(TransactionBase):
    pass


class TransactionSplitCreate(BaseModel):
    account_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    category_id: uuid.UUID
    monto: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)
    descripcion: str = Field(..., max_length=255)
    fecha: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TransactionUpdate(BaseModel):
    user_id: uuid.UUID | None = None
    account_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    tipo: TransactionTypeEnum | None = None
    monto: Decimal | None = Field(default=None, gt=0)
    moneda: str | None = Field(default=None, max_length=10)
    es_compartido: bool | None = None
    split_ratio: Decimal | None = Field(default=None, ge=0, le=1)
    descripcion: str | None = Field(default=None, max_length=255)
    fecha: datetime | None = None


class TransactionBulkDelete(BaseModel):
    ids: list[uuid.UUID] | None = None
    user_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class SettlementCreate(BaseModel):
    source_user_id: uuid.UUID | None = None
    target_user_id: uuid.UUID | None = None
    source_account_id: uuid.UUID | None = None
    target_account_id: uuid.UUID | None = None
    monto: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)
    descripcion: str = Field(default="Devolución / Reintegro de pareja", max_length=255)
    fecha: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    account: AccountOut | None = None
    category: CategoryOut | None = None


class CoupleBalanceOut(BaseModel):
    net_balance: Decimal
    active_user_id: uuid.UUID
    active_user_name: str
    partner_id: uuid.UUID | None
    partner_name: str | None
    currency: str = "ARS"
    summary_text: str


# ==============================================================================
# Shopping Lists & Discounts
# ==============================================================================
class ShoppingItemBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    precio_unitario: Decimal = Field(default=Decimal("0.00"), ge=0)
    cantidad: int = Field(default=1, ge=1)
    descuento_especifico_porcentaje: Decimal | None = Field(default=None, ge=0, le=100)
    comprado: bool = False


class ShoppingItemCreate(ShoppingItemBase):
    pass


class ShoppingItemUpdate(BaseModel):
    nombre: str | None = None
    precio_unitario: Decimal | None = None
    cantidad: int | None = None
    descuento_especifico_porcentaje: Decimal | None = None
    comprado: bool | None = None


class ShoppingItemOut(ShoppingItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    list_id: uuid.UUID
    descuento_aplicado_porcentaje: Decimal
    precio_final_calculado: Decimal


class ShoppingListBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descuento_general_porcentaje: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)


class ShoppingListCreate(ShoppingListBase):
    pass


class ShoppingListOut(ShoppingListBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    is_completed: bool
    total_con_descuentos: Decimal = Decimal("0.00")
    division_50_50: Decimal = Decimal("0.00")
    items: list[ShoppingItemOut] = []
    created_at: datetime


class ShoppingCheckoutRequest(BaseModel):
    account_id: uuid.UUID
    category_id: uuid.UUID
    descripcion: str = "Compra de Supermercado"


# ==============================================================================
# Savings & Emergency Fund
# ==============================================================================
class SavingsGoalBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    monto_objetivo: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)
    fecha_limite: date | None = None


class SavingsGoalCreate(SavingsGoalBase):
    pass


class SavingsGoalUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    monto_objetivo: Decimal | None = Field(default=None, gt=0)
    moneda: str | None = Field(default=None, max_length=10)
    fecha_limite: date | None = None


class GoalContributionCreate(BaseModel):
    account_id: uuid.UUID | None = None
    broker_id: uuid.UUID | None = None
    monto: Decimal = Field(..., gt=0)
    fecha: datetime | None = None


class GoalContributionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    goal_id: uuid.UUID
    user_id: uuid.UUID
    account_id: uuid.UUID | None = None
    broker_id: uuid.UUID | None = None
    monto: Decimal
    fecha: datetime
    created_at: datetime

    @field_serializer("monto", mode="plain")
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


class SavingsGoalOut(SavingsGoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    monto_acumulado: Decimal
    porcentaje_avance: Decimal = Decimal("0.00")
    contributions: list[GoalContributionOut] = []
    created_at: datetime

    @field_serializer("monto_objetivo", "monto_acumulado", "porcentaje_avance", mode="plain", check_fields=False)
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


class EmergencyFundCalculationOut(BaseModel):
    gasto_fijo_promedio_mensual: Decimal
    meses_cobertura_sugeridos: int
    meta_sugerida: Decimal
    ahorro_actual_emergencia: Decimal
    porcentaje_cobertura_actual: Decimal
    meses_cubiertos_reales: Decimal

    @field_serializer("gasto_fijo_promedio_mensual", "meta_sugerida", "ahorro_actual_emergencia", "porcentaje_cobertura_actual", "meses_cubiertos_reales", mode="plain")
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


# ==============================================================================
# Investments & Brokers
# ==============================================================================
class BrokerBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    saldo_total_ars: Decimal = Decimal("0.00")
    saldo_total_usd: Decimal = Decimal("0.00")
    saldo_total_crypto: Decimal = Decimal("0.00")


class BrokerCreate(BrokerBase):
    user_id: uuid.UUID | None = None


class BrokerTxCreate(BaseModel):
    tipo: BrokerTxTypeEnum
    monto: Decimal = Field(..., gt=0)
    moneda: str = Field(default="ARS", max_length=10)
    descripcion: str = Field(..., max_length=255)
    fecha: datetime | None = None


class BrokerTxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    broker_id: uuid.UUID
    tipo: BrokerTxTypeEnum
    monto: Decimal
    moneda: str
    descripcion: str
    fecha: datetime
    created_at: datetime

    @field_serializer("monto", mode="plain")
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


class BrokerOut(BrokerBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    household_id: uuid.UUID
    is_active: bool
    created_at: datetime

    @field_serializer("saldo_total_ars", "saldo_total_usd", "saldo_total_crypto", mode="plain", check_fields=False)
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


# ==============================================================================
# Currency Quotes (Histórico de Cotizaciones)
# ==============================================================================
class CurrencyQuoteBase(BaseModel):
    moneda_origen: str = Field(..., min_length=1, max_length=20)
    moneda_destino: str = Field(default="ARS", max_length=10)
    cotizacion: Decimal = Field(..., gt=0)
    fecha: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CurrencyQuoteCreate(CurrencyQuoteBase):
    pass


class CurrencyQuoteOut(CurrencyQuoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    created_at: datetime

    @field_serializer("cotizacion", mode="plain", check_fields=False)
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0


# ==============================================================================
# Cashflow
# ==============================================================================
class CashflowOut(BaseModel):
    month: int
    year: int
    ingresos_proyectados: Decimal
    gastos_fijos_comprometidos: Decimal
    presupuestos_variables: Decimal
    compromisos_ahorro: Decimal
    dinero_libre_disponible: Decimal


# ==============================================================================
# Category Mappings & CSV Import
# ==============================================================================
class CategoryMappingCreate(BaseModel):
    patron: str = Field(..., min_length=2, max_length=100)
    category_id: uuid.UUID


class CategoryMappingUpdate(BaseModel):
    patron: str | None = Field(default=None, min_length=2, max_length=100)
    category_id: uuid.UUID | None = None



class CategoryMappingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    patron: str
    category_id: uuid.UUID
    category: CategoryOut | None = None
    created_at: datetime


class CsvPreviewRow(BaseModel):
    row_index: int
    fecha: str
    concepto: str
    monto: float
    quien_pago_raw: str
    user_id: uuid.UUID | None = None
    user_name: str | None = None
    user_matched: bool = False
    category_id: uuid.UUID | None = None
    category_name: str | None = None
    category_matched: bool = False


class CsvParseResponse(BaseModel):
    rows: list[CsvPreviewRow]
    total_rows: int
    unmatched_users: int
    unmatched_categories: int


class BulkImportRow(BaseModel):
    fecha: datetime
    concepto: str
    monto: Decimal = Field(..., gt=0)
    user_id: uuid.UUID
    category_id: uuid.UUID | None = None
    es_compartido: bool = True


class BulkImportRequest(BaseModel):
    rows: list[BulkImportRow]
    new_mappings: list[CategoryMappingCreate] = Field(default_factory=list)


# ==============================================================================
# Investment Assets & Holdings
# ==============================================================================
class InvestmentAssetBase(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    nombre: str = Field(..., min_length=1, max_length=150)
    tipo: str = Field(..., max_length=50)
    cantidad: Decimal = Field(default=Decimal("0.00"), ge=0)
    precio_compra: Decimal = Field(default=Decimal("0.00"), ge=0)
    precio_actual: Decimal = Field(default=Decimal("0.00"), ge=0)
    rentabilidad_esperada_anual: Decimal = Field(default=Decimal("0.00"), ge=0)
    moneda: str = Field(default="ARS", max_length=10)
    broker_id: uuid.UUID | None = None


class InvestmentAssetCreate(InvestmentAssetBase):
    pass


class InvestmentAssetUpdate(BaseModel):
    broker_id: uuid.UUID | None = None
    ticker: str | None = Field(default=None, max_length=20)
    nombre: str | None = Field(default=None, max_length=150)
    tipo: str | None = Field(default=None, max_length=50)
    cantidad: Decimal | None = Field(default=None, ge=0)
    precio_compra: Decimal | None = Field(default=None, ge=0)
    precio_actual: Decimal | None = Field(default=None, ge=0)
    rentabilidad_esperada_anual: Decimal | None = Field(default=None, ge=0)
    moneda: str | None = Field(default=None, max_length=10)


class InvestmentAssetOut(InvestmentAssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    created_at: datetime

    @field_serializer("cantidad", "precio_compra", "precio_actual", "rentabilidad_esperada_anual", mode="plain", check_fields=False)
    def serialize_decimal(self, v: Decimal) -> float:
        return float(v) if v is not None else 0.0

