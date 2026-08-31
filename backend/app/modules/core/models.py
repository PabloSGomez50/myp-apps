import uuid
from enum import StrEnum

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.base_model import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RoleEnum(StrEnum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class CurrencyEnum(StrEnum):
    ARS = "ARS"
    USD = "USD"


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    color_avatar: Mapped[str] = mapped_column(String(30), default="#16a34a", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    household_memberships: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="user", cascade="all, delete-orphan"
    )


class Household(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "households"
    __table_args__ = {"schema": "core"}

    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    moneda_principal: Mapped[CurrencyEnum] = mapped_column(
        SQLEnum(CurrencyEnum, name="currency_enum", schema="core"),
        default=CurrencyEnum.ARS,
        nullable=False,
    )

    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household", cascade="all, delete-orphan"
    )


class HouseholdMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "household_members"
    __table_args__ = {"schema": "core"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rol: Mapped[RoleEnum] = mapped_column(
        SQLEnum(RoleEnum, name="role_enum", schema="core"),
        default=RoleEnum.MEMBER,
        nullable=False,
    )
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    household: Mapped["Household"] = relationship("Household", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="household_memberships")
