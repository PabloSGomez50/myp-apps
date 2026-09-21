import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_and_household
from app.modules.core.models import User
from app.modules.finanzas.schemas import ShoppingListOut
from app.modules.inventario.schemas import (
    InventoryCategoryCreate,
    InventoryCategoryOut,
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
from app.modules.inventario.service import InventarioService

inventario_router = APIRouter(prefix="/api/v1/inventario", tags=["Inventario"])


# ==============================================================================
# Locations
# ==============================================================================
@inventario_router.get(
    "/locations", response_model=list[LocationOut], status_code=status.HTTP_200_OK
)
async def get_locations(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_locations(db, household_id)


@inventario_router.post(
    "/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED
)
async def create_location(
    data: LocationCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_location(db, household_id, data)


@inventario_router.put(
    "/locations/{id}", response_model=LocationOut, status_code=status.HTTP_200_OK
)
async def update_location(
    id: uuid.UUID,
    data: LocationUpdate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.update_location(db, id, household_id, data)


@inventario_router.delete(
    "/locations/{id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_location(
    id: uuid.UUID,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    await InventarioService.delete_location(db, id, household_id)
    return None


# ==============================================================================
# Categories
# ==============================================================================
@inventario_router.get(
    "/categories", response_model=list[InventoryCategoryOut], status_code=status.HTTP_200_OK
)
async def get_categories(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_categories(db, household_id)


@inventario_router.post(
    "/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED
)
async def create_category(
    data: InventoryCategoryCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_category(db, household_id, data)


@inventario_router.put(
    "/categories/{id}", response_model=InventoryCategoryOut, status_code=status.HTTP_200_OK
)
async def update_category(
    id: uuid.UUID,
    data: InventoryCategoryUpdate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.update_category(db, id, household_id, data)


@inventario_router.delete(
    "/categories/{id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_category(
    id: uuid.UUID,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    await InventarioService.delete_category(db, id, household_id)
    return None


# ==============================================================================
# Inventory Items
# ==============================================================================
@inventario_router.get(
    "/items", response_model=list[InventoryItemOut], status_code=status.HTTP_200_OK
)
async def get_items(
    location_id: uuid.UUID | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_items(db, household_id, location_id, category_id)


@inventario_router.get(
    "/low-stock", response_model=list[InventoryItemOut], status_code=status.HTTP_200_OK
)
async def get_low_stock(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_low_stock_items(db, household_id)


@inventario_router.post(
    "/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED
)
async def create_item(
    data: InventoryItemCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_item(db, household_id, data)


@inventario_router.put(
    "/items/{id}", response_model=InventoryItemOut, status_code=status.HTTP_200_OK
)
async def update_item(
    id: uuid.UUID,
    data: InventoryItemUpdate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.update_item(db, id, household_id, data)


@inventario_router.delete(
    "/items/{id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_item(
    id: uuid.UUID,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    await InventarioService.delete_item(db, id, household_id)
    return None


@inventario_router.patch(
    "/items/{id}/stock", response_model=InventoryItemOut, status_code=status.HTTP_200_OK
)
async def adjust_stock(
    id: uuid.UUID,
    data: StockAdjustRequest,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, _ = current_auth
    return await InventarioService.adjust_stock(db, user.id, id, data)


@inventario_router.get(
    "/items/{id}/logs", response_model=list[StockLogOut], status_code=status.HTTP_200_OK
)
async def get_item_logs(
    id: uuid.UUID,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_item_stock_logs(db, id, household_id)


@inventario_router.post(
    "/send-to-shopping-list", response_model=ShoppingListOut, status_code=status.HTTP_200_OK
)
async def send_to_shopping_list(
    data: SendToShoppingListRequest,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    if not household_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sin hogar asociado.")
    shopping_list = await InventarioService.send_items_to_shopping_list(db, household_id, data)
    return ShoppingListOut.model_validate(shopping_list)
