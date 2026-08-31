import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.modules.core.models import CurrencyEnum, RoleEnum


class UserBase(BaseModel):
    email: EmailStr
    nombre: str = Field(..., min_length=2, max_length=100)
    color_avatar: str = Field(default="#16a34a", max_length=30)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    pin: str | None = Field(default=None, min_length=4, max_length=4, pattern=r"^\d{4}$")
    household_name: str | None = Field(default=None, description="Nombre para un nuevo hogar")
    household_id: uuid.UUID | None = Field(default=None, description="Unirse a un hogar existente")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PinSwitchRequest(BaseModel):
    target_user_id: uuid.UUID
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    is_active: bool
    created_at: datetime


class HouseholdBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    moneda_principal: CurrencyEnum = CurrencyEnum.ARS


class HouseholdCreate(HouseholdBase):
    pass


class HouseholdMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user: UserOut
    rol: RoleEnum
    activo: bool


class HouseholdOut(HouseholdBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    members: list[HouseholdMemberOut] = []
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    household_id: uuid.UUID | None
