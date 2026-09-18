import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.inventario.models import (
    InventoryCategory,
    InventoryItem,
    Location,
    MovementTypeEnum,
    StockLog,
)
from app.modules.inventario.schemas import (
    InventoryCategoryCreate,
    InventoryItemCreate,
    InventoryItemOut,
    LocationCreate,
    StockAdjustRequest,
)


class InventarioService:
    @staticmethod
    async def get_locations(db: AsyncSession, household_id: uuid.UUID) -> list[Location]:
        result = await db.execute(
            select(Location)
            .where(Location.household_id == household_id)
            .order_by(Location.nombre.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_location(
        db: AsyncSession, household_id: uuid.UUID, data: LocationCreate
    ) -> Location:
        location = Location(
            household_id=household_id,
            nombre=data.nombre,
            descripcion=data.descripcion,
        )
        db.add(location)
        await db.commit()
        await db.refresh(location)
        return location

    @staticmethod
    async def get_categories(db: AsyncSession, household_id: uuid.UUID) -> list[InventoryCategory]:
        result = await db.execute(
            select(InventoryCategory)
            .where(InventoryCategory.household_id == household_id)
            .order_by(InventoryCategory.nombre.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_category(
        db: AsyncSession, household_id: uuid.UUID, data: InventoryCategoryCreate
    ) -> InventoryCategory:
        category = InventoryCategory(
            household_id=household_id,
            nombre=data.nombre,
            icono=data.icono,
            color=data.color,
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def get_items(
        db: AsyncSession, household_id: uuid.UUID, location_id: uuid.UUID | None = None
    ) -> list[InventoryItemOut]:
        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.location),
                selectinload(InventoryItem.category),
            )
            .where(InventoryItem.household_id == household_id)
        )
        if location_id:
            query = query.where(InventoryItem.location_id == location_id)

        query = query.order_by(InventoryItem.nombre.asc())
        result = await db.execute(query)
        items = result.scalars().all()

        out_items = []
        for item in items:
            out_item = InventoryItemOut.model_validate(item)
            out_item.es_stock_bajo = item.stock_actual <= item.stock_minimo
            out_items.append(out_item)

        return out_items

    @staticmethod
    async def get_low_stock_items(
        db: AsyncSession, household_id: uuid.UUID
    ) -> list[InventoryItemOut]:
        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.location),
                selectinload(InventoryItem.category),
            )
            .where(
                InventoryItem.household_id == household_id,
                InventoryItem.stock_actual <= InventoryItem.stock_minimo,
            )
            .order_by(InventoryItem.nombre.asc())
        )
        result = await db.execute(query)
        items = result.scalars().all()

        out_items = []
        for item in items:
            out_item = InventoryItemOut.model_validate(item)
            out_item.es_stock_bajo = True
            out_items.append(out_item)

        return out_items

    @staticmethod
    async def create_item(
        db: AsyncSession, household_id: uuid.UUID, data: InventoryItemCreate
    ) -> InventoryItemOut:
        item = InventoryItem(
            household_id=household_id,
            location_id=data.location_id,
            category_id=data.category_id,
            nombre=data.nombre,
            stock_actual=data.stock_actual,
            stock_minimo=data.stock_minimo,
            unidad_medida=data.unidad_medida,
            fecha_vencimiento=data.fecha_vencimiento,
        )
        db.add(item)
        await db.commit()

        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.location),
                selectinload(InventoryItem.category),
            )
            .where(InventoryItem.id == item.id)
        )
        result = await db.execute(query)
        item_reloaded = result.scalar_one()

        out_item = InventoryItemOut.model_validate(item_reloaded)
        out_item.es_stock_bajo = item_reloaded.stock_actual <= item_reloaded.stock_minimo
        return out_item

    @staticmethod
    async def adjust_stock(
        db: AsyncSession,
        user_id: uuid.UUID,
        item_id: uuid.UUID,
        data: StockAdjustRequest,
    ) -> InventoryItemOut:
        query = (
            select(InventoryItem)
            .options(
                selectinload(InventoryItem.location),
                selectinload(InventoryItem.category),
            )
            .where(InventoryItem.id == item_id)
        )
        result = await db.execute(query)
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto de inventario no encontrado.",
            )

        nuevo_stock = item.stock_actual + data.cantidad_cambio
        if nuevo_stock < Decimal("0.00"):
            nuevo_stock = Decimal("0.00")

        tipo_mov = (
            MovementTypeEnum.REPLENISHMENT
            if data.cantidad_cambio > Decimal("0.00")
            else MovementTypeEnum.CONSUMPTION
        )

        item.stock_actual = nuevo_stock

        log = StockLog(
            item_id=item.id,
            user_id=user_id,
            tipo_movimiento=tipo_mov,
            cantidad_cambio=data.cantidad_cambio,
            nota=data.nota,
        )
        db.add(log)
        await db.commit()
        await db.refresh(item)

        out_item = InventoryItemOut.model_validate(item)
        out_item.es_stock_bajo = item.stock_actual <= item.stock_minimo
        return out_item
