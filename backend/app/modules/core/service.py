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
from app.modules.core.schemas import (
    PinSwitchRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    UserUpdate,
)


class CoreService:
    @staticmethod
    async def register_user(db: AsyncSession, data: UserCreate) -> TokenResponse:
        # Check if email exists
        existing = await db.execute(select(User).where(User.email == data.email))
        existing_user = existing.scalar_one_or_none()
        pin_hash = get_pin_hash(data.pin) if data.pin else None

        if existing_user:
            if existing_user.is_active and existing_user.hashed_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El correo electrónico ya se encuentra registrado.",
                )
            # Activate pre-created placeholder user
            user = existing_user
            user.hashed_password = get_password_hash(data.password)
            user.pin_hash = pin_hash
            user.nombre = data.nombre
            user.color_avatar = data.color_avatar
            user.is_active = True

            # Find their existing household membership if any
            mem_res = await db.execute(
                select(HouseholdMember).where(HouseholdMember.user_id == user.id)
            )
            existing_mem = mem_res.scalar_one_or_none()
            if existing_mem:
                household = await db.get(Household, existing_mem.household_id)
                await db.commit()
                token = create_access_token(
                    {"sub": str(user.id), "household_id": str(household.id)}
                )
                return TokenResponse(
                    access_token=token,
                    user=UserOut.model_validate(user),
                    household_id=household.id,
                )
        else:
            # Create user
            user = User(
                email=data.email,
                hashed_password=get_password_hash(data.password),
                pin_hash=pin_hash,
                nombre=data.nombre,
                color_avatar=data.color_avatar,
                is_active=True,
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

        # Seed default orthogonal categories if new household created
        if role == RoleEnum.ADMIN:
            from app.modules.finanzas.models import Category, ExpenseTypeEnum

            default_categories = [
                Category(
                    household_id=household.id,
                    nombre="Servicios y Alquiler",
                    tipo_gasto=ExpenseTypeEnum.FIXED_HOUSEHOLD,
                    icono="home",
                    color="indigo",
                ),
                Category(
                    household_id=household.id,
                    nombre="Supermercado y Despensa",
                    tipo_gasto=ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
                    icono="shopping-bag",
                    color="emerald",
                ),
                Category(
                    household_id=household.id,
                    nombre="Salidas y Cenas de Pareja",
                    tipo_gasto=ExpenseTypeEnum.LEISURE_COUPLE,
                    icono="utensils",
                    color="rose",
                ),
                Category(
                    household_id=household.id,
                    nombre="Gastos Fijos Personales",
                    tipo_gasto=ExpenseTypeEnum.FIXED_PERSONAL,
                    icono="user-check",
                    color="sky",
                ),
                Category(
                    household_id=household.id,
                    nombre="Gastos Variables Personales",
                    tipo_gasto=ExpenseTypeEnum.VARIABLE_PERSONAL,
                    icono="user",
                    color="amber",
                ),
            ]
            db.add_all(default_categories)

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

    @staticmethod
    async def add_household_member(
        db: AsyncSession, household_id: uuid.UUID, email: str, nombre: str
    ) -> Household:
        household = await db.get(Household, household_id)
        if not household:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Hogar no encontrado."
            )

        email_clean = email.strip().lower()
        nombre_clean = nombre.strip()

        # Check if user with this email exists
        res = await db.execute(select(User).where(User.email == email_clean))
        target_user = res.scalar_one_or_none()

        if not target_user:
            # Create placeholder user (pending activation)
            target_user = User(
                email=email_clean,
                nombre=nombre_clean,
                hashed_password="",
                is_active=False,
            )
            db.add(target_user)
            await db.flush()

        # Check if already a member
        mem_res = await db.execute(
            select(HouseholdMember).where(
                HouseholdMember.household_id == household_id,
                HouseholdMember.user_id == target_user.id,
            )
        )
        if not mem_res.scalar_one_or_none():
            member = HouseholdMember(
                household_id=household_id,
                user_id=target_user.id,
                rol=RoleEnum.MEMBER,
                activo=True,
            )
            db.add(member)
            await db.commit()

        return await CoreService.get_household_details(db, household_id)

    @staticmethod
    async def update_user(db: AsyncSession, target_id: uuid.UUID, data: UserUpdate) -> User:
        user = await db.get(User, target_id)
        if not user:
            member = await db.get(HouseholdMember, target_id)
            if member and member.user_id:
                user = await db.get(User, member.user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado."
            )
        if data.nombre is not None:
            user.nombre = data.nombre
        if data.color_avatar is not None:
            user.color_avatar = data.color_avatar
        await db.commit()
        await db.refresh(user)
        return user
