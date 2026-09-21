import uuid
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.finanzas.models import ShoppingItem, ShoppingList
from app.modules.inventario.models import (
    InventoryCategory,
    InventoryItem,
    Location,
    MovementTypeEnum,
    StockLog,
)
from app.modules.inventario.schemas import (
    InventoryCategoryCreate,
    InventoryCategoryUpdate,
    InventoryItemCreate,
    InventoryItemOut,
    InventoryItemUpdate,
    LocationCreate,
    LocationOut,
    LocationUpdate,
    SendToShoppingListRequest,
    StockAdjustRequest,
    StockLogOut,
)


class InventarioService:
    @staticmethod
    async def get_locations(db: AsyncSession, household_id: uuid.UUID) -> list[LocationOut]:
        result = await db.execute(
            select(Location)
            .where(Location.household_id == household_id)
            .order_by(Location.nombre.asc())
        )
        locations = list(result.scalars().all())

        out = []
        for loc in locations:
            count_res = await db.execute(
                select(func.count(InventoryItem.id)).where(InventoryItem.location_id == loc.id)
            )
            count = count_res.scalar() or 0
            loc_out = LocationOut.model_validate(loc)
            loc_out.item_count = count
            out.append(loc_out)
        return out

    @staticmethod
    async def create_location(
        db: AsyncSession, household_id: uuid.UUID, data: LocationCreate
    ) -> LocationOut:
        location = Location(
            household_id=household_id,
            nombre=data.nombre.strip(),
            descripcion=data.descripcion.strip() if data.descripcion else None,
        )
        db.add(location)
        await db.commit()
        await db.refresh(location)
        loc_out = LocationOut.model_validate(location)
        loc_out.item_count = 0
        return loc_out

    @staticmethod
    async def update_location(
        db: AsyncSession, location_id: uuid.UUID, household_id: uuid.UUID, data: LocationUpdate
    ) -> LocationOut:
        location = await db.get(Location, location_id)
        if not location or location.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Ubicación no encontrada."
            )

        if data.nombre is not None:
            location.nombre = data.nombre.strip()
        if data.descripcion is not None:
            location.descripcion = data.descripcion.strip() if data.descripcion else None

        await db.commit()
        await db.refresh(location)

        count_res = await db.execute(
            select(func.count(InventoryItem.id)).where(InventoryItem.location_id == location.id)
        )
        count = count_res.scalar() or 0

        loc_out = LocationOut.model_validate(location)
        loc_out.item_count = count
        return loc_out

    @staticmethod
    async def delete_location(
        db: AsyncSession, location_id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        location = await db.get(Location, location_id)
        if location and location.household_id == household_id:
            await db.delete(location)
            await db.commit()

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
            nombre=data.nombre.strip(),
            icono=data.icono.strip(),
            color=data.color.strip(),
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def update_category(
        db: AsyncSession, category_id: uuid.UUID, household_id: uuid.UUID, data: InventoryCategoryUpdate
    ) -> InventoryCategory:
        category = await db.get(InventoryCategory, category_id)
        if not category or category.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoría de inventario no encontrada."
            )

        if data.nombre is not None:
            category.nombre = data.nombre.strip()
        if data.icono is not None:
            category.icono = data.icono.strip()
        if data.color is not None:
            category.color = data.color.strip()

        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete_category(
        db: AsyncSession, category_id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        category = await db.get(InventoryCategory, category_id)
        if category and category.household_id == household_id:
            await db.delete(category)
            await db.commit()

    @staticmethod
    async def get_items(
        db: AsyncSession,
        household_id: uuid.UUID,
        location_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
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
        if category_id:
            query = query.where(InventoryItem.category_id == category_id)

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
            nombre=data.nombre.strip(),
            stock_actual=data.stock_actual,
            stock_minimo=data.stock_minimo,
            unidad_medida=data.unidad_medida.strip(),
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
    async def update_item(
        db: AsyncSession, item_id: uuid.UUID, household_id: uuid.UUID, data: InventoryItemUpdate
    ) -> InventoryItemOut:
        item = await db.get(InventoryItem, item_id)
        if not item or item.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Producto de inventario no encontrado."
            )

        if data.nombre is not None:
            item.nombre = data.nombre.strip()
        if data.location_id is not None:
            item.location_id = data.location_id
        if data.category_id is not None:
            item.category_id = data.category_id
        if data.stock_actual is not None:
            item.stock_actual = data.stock_actual
        if data.stock_minimo is not None:
            item.stock_minimo = data.stock_minimo
        if data.unidad_medida is not None:
            item.unidad_medida = data.unidad_medida.strip()
        if data.fecha_vencimiento is not None:
            item.fecha_vencimiento = data.fecha_vencimiento

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
    async def delete_item(
        db: AsyncSession, item_id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        item = await db.get(InventoryItem, item_id)
        if item and item.household_id == household_id:
            await db.delete(item)
            await db.commit()

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

    @staticmethod
    async def get_item_stock_logs(
        db: AsyncSession, item_id: uuid.UUID, household_id: uuid.UUID
    ) -> list[StockLogOut]:
        item = await db.get(InventoryItem, item_id)
        if not item or item.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado."
            )

        result = await db.execute(
            select(StockLog)
            .options(selectinload(StockLog.user))
            .where(StockLog.item_id == item_id)
            .order_by(StockLog.fecha.desc())
        )
        logs = list(result.scalars().all())
        return [StockLogOut.model_validate(log) for log in logs]

    @staticmethod
    async def send_items_to_shopping_list(
        db: AsyncSession, household_id: uuid.UUID, data: SendToShoppingListRequest
    ) -> ShoppingList:
        target_list: ShoppingList | None = None
        if data.shopping_list_id:
            target_list = await db.get(ShoppingList, data.shopping_list_id)

        if not target_list:
            list_name = data.shopping_list_name or "Reposición de Faltantes Inventario"
            target_list = ShoppingList(
                household_id=household_id,
                nombre=list_name.strip(),
                descuento_general_porcentaje=Decimal("0.00"),
            )
            db.add(target_list)
            await db.commit()
            await db.refresh(target_list)

        for item_data in data.items:
            s_item = ShoppingItem(
                list_id=target_list.id,
                nombre=item_data.nombre.strip(),
                precio_unitario=Decimal("0.00"),
                cantidad=item_data.cantidad,
                descuento_especifico_porcentaje=None,
                comprado=False,
            )
            db.add(s_item)

        await db.commit()
        return target_list
