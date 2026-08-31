import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_and_household
from app.modules.core.models import User
from app.modules.core.schemas import (
    HouseholdOut,
    PinSwitchRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.modules.core.service import CoreService

auth_router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])
core_router = APIRouter(prefix="/api/v1/core", tags=["Core & Household"])


@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await CoreService.register_user(db, data)


@auth_router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    return await CoreService.login_user(db, data)


@auth_router.post("/switch-profile", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def switch_profile(
    data: PinSwitchRequest,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    current_user, household_id = current_auth
    return await CoreService.switch_profile_with_pin(db, current_user, household_id, data)


@core_router.get("/me", response_model=UserOut, status_code=status.HTTP_200_OK)
async def get_me(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
):
    user, _ = current_auth
    return user


@core_router.get("/household", response_model=HouseholdOut, status_code=status.HTTP_200_OK)
async def get_household(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    if not household_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay un hogar activo vinculado.",
        )
    return await CoreService.get_household_details(db, household_id)
