import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.modules.inventario.models import MovementTypeEnum


class LocationBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=255)


class LocationOut(LocationBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    item_count: int = 0
    created_at: datetime


class InventoryCategoryBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    icono: str = Field(default="package", max_length=50)
    color: str = Field(default="emerald", max_length=50)


class InventoryCategoryCreate(InventoryCategoryBase):
    pass


class InventoryCategoryUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    icono: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, max_length=50)


class InventoryCategoryOut(InventoryCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    created_at: datetime


class InventoryItemBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    location_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    stock_actual: Decimal = Field(default=Decimal("1.00"), ge=0)
    stock_minimo: Decimal = Field(default=Decimal("1.00"), ge=0)
    unidad_medida: str = Field(default="unidades", max_length=30)
    fecha_vencimiento: date | None = None


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(BaseModel):
    nombre: str | None = None
    location_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    stock_actual: Decimal | None = None
    stock_minimo: Decimal | None = None
    unidad_medida: str | None = None
    fecha_vencimiento: date | None = None


class StockAdjustRequest(BaseModel):
    cantidad_cambio: Decimal = Field(..., description="Positivo para sumar, negativo para restar")
    nota: str | None = Field(default=None, max_length=255)


class InventoryItemOut(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    household_id: uuid.UUID
    es_stock_bajo: bool = False
    location: LocationOut | None = None
    category: InventoryCategoryOut | None = None
    created_at: datetime


class StockLogUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nombre: str
    color_avatar: str = "emerald"


class StockLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    item_id: uuid.UUID
    user_id: uuid.UUID
    user: StockLogUserOut | None = None
    tipo_movimiento: MovementTypeEnum
    cantidad_cambio: Decimal
    nota: str | None = None
    fecha: datetime


class SendToShoppingListItem(BaseModel):
    item_id: uuid.UUID
    nombre: str
    cantidad: int = Field(..., ge=1)


class SendToShoppingListRequest(BaseModel):
    shopping_list_id: uuid.UUID | None = None
    shopping_list_name: str | None = None
    items: list[SendToShoppingListItem] = Field(..., min_length=1)
