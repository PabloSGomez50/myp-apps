import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import (
    create_access_token,
    get_password_hash,
    get_pin_hash,
    verify_password,
    verify_pin,
)
from app.modules.core.models import CurrencyEnum, Household, HouseholdMember, RoleEnum, User
from app.modules.core.schemas import PinSwitchRequest, TokenResponse, UserCreate, UserLogin, UserOut


class CoreService:
    @staticmethod
    async def register_user(db: AsyncSession, data: UserCreate) -> TokenResponse:
        # Check if email exists
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya se encuentra registrado.",
            )

        # Create user
        pin_hash = get_pin_hash(data.pin) if data.pin else None
        user = User(
            email=data.email,
            hashed_password=get_password_hash(data.password),
            pin_hash=pin_hash,
            nombre=data.nombre,
            color_avatar=data.color_avatar,
        )
        db.add(user)
        await db.flush()

        # Handle Household creation or joining existing
        if data.household_id:
            household = await db.get(Household, data.household_id)
            if not household:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Hogar no encontrado.",
                )
            role = RoleEnum.MEMBER
        else:
            household_name = data.household_name or f"Hogar de {data.nombre}"
            household = Household(
                nombre=household_name,
                moneda_principal=CurrencyEnum.ARS,
            )
            db.add(household)
            await db.flush()
            role = RoleEnum.ADMIN

        # Add user as household member
        member = HouseholdMember(
            household_id=household.id,
            user_id=user.id,
            rol=role,
            activo=True,
        )
        db.add(member)
        await db.commit()

        token = create_access_token({"sub": str(user.id), "household_id": str(household.id)})
        return TokenResponse(
            access_token=token,
            user=UserOut.model_validate(user),
            household_id=household.id,
        )

    @staticmethod
    async def login_user(db: AsyncSession, data: UserLogin) -> TokenResponse:
        result = await db.execute(
            select(User)
            .options(selectinload(User.household_memberships))
            .where(User.email == data.email, User.is_active.is_(True))
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas.",
            )

        household_id = None
        if user.household_memberships:
            household_id = user.household_memberships[0].household_id

        token = create_access_token(
            {"sub": str(user.id), "household_id": str(household_id) if household_id else None}
        )
        return TokenResponse(
            access_token=token,
            user=UserOut.model_validate(user),
            household_id=household_id,
        )

    @staticmethod
    async def switch_profile_with_pin(
        db: AsyncSession,
        current_user: User,
        current_household_id: uuid.UUID | None,
        data: PinSwitchRequest,
    ) -> TokenResponse:
        # Check target user
        result = await db.execute(
            select(User)
            .options(selectinload(User.household_memberships))
            .where(User.id == data.target_user_id, User.is_active.is_(True))
        )
        target_user = result.scalar_one_or_none()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario destino no encontrado.",
            )

        if not target_user.pin_hash or not verify_pin(data.pin, target_user.pin_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="PIN de 4 dígitos incorrecto.",
            )

        # Issue new token for the target user in the active household
        token = create_access_token(
            {
                "sub": str(target_user.id),
                "household_id": str(current_household_id) if current_household_id else None,
            }
        )
        return TokenResponse(
            access_token=token,
            user=UserOut.model_validate(target_user),
            household_id=current_household_id,
        )

    @staticmethod
    async def get_household_details(db: AsyncSession, household_id: uuid.UUID) -> Household:
        result = await db.execute(
            select(Household)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
            .where(Household.id == household_id)
        )
        household = result.scalar_one_or_none()
        if not household:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Hogar no encontrado.",
            )
        return household
