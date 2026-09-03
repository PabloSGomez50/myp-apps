import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_and_household
from app.modules.core.models import User
from app.modules.inventario.schemas import (
    InventoryCategoryCreate,
    InventoryCategoryOut,
    InventoryItemCreate,
    InventoryItemOut,
    LocationCreate,
    LocationOut,
    StockAdjustRequest,
)
from app.modules.inventario.service import InventarioService

inventario_router = APIRouter(prefix="/api/v1/inventario", tags=["Inventario"])


@inventario_router.get("/locations", response_model=list[LocationOut], status_code=status.HTTP_200_OK)
async def get_locations(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_locations(db, household_id)


@inventario_router.post("/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
async def create_location(
    data: LocationCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_location(db, household_id, data)


@inventario_router.get("/categories", response_model=list[InventoryCategoryOut], status_code=status.HTTP_200_OK)
async def get_categories(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_categories(db, household_id)


@inventario_router.post("/categories", response_model=InventoryCategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: InventoryCategoryCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_category(db, household_id, data)


@inventario_router.get("/items", response_model=list[InventoryItemOut], status_code=status.HTTP_200_OK)
async def get_items(
    location_id: uuid.UUID | None = Query(None),
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_items(db, household_id, location_id)


@inventario_router.get("/low-stock", response_model=list[InventoryItemOut], status_code=status.HTTP_200_OK)
async def get_low_stock(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.get_low_stock_items(db, household_id)


@inventario_router.post("/items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: InventoryItemCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await InventarioService.create_item(db, household_id, data)


@inventario_router.patch("/items/{id}/stock", response_model=InventoryItemOut, status_code=status.HTTP_200_OK)
async def adjust_stock(
    id: uuid.UUID,
    data: StockAdjustRequest,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, _ = current_auth
    return await InventarioService.adjust_stock(db, user.id, id, data)
