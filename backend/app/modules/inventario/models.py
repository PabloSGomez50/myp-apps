import uuid
from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modules.core.models import User
from app.shared.base_model import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MovementTypeEnum(StrEnum):
    CONSUMPTION = "CONSUMPTION"
    REPLENISHMENT = "REPLENISHMENT"
    ADJUSTMENT = "ADJUSTMENT"


class Location(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "locations"
    __table_args__ = {"schema": "inventario"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)


class InventoryCategory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"
    __table_args__ = {"schema": "inventario"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    icono: Mapped[str] = mapped_column(String(50), default="package", nullable=False)
    color: Mapped[str] = mapped_column(String(50), default="emerald", nullable=False)


class InventoryItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "items"
    __table_args__ = {"schema": "inventario"}

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.households.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventario.locations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventario.categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    stock_actual: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("1.00"), nullable=False
    )
    stock_minimo: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("1.00"), nullable=False
    )
    unidad_medida: Mapped[str] = mapped_column(String(30), default="unidades", nullable=False)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)

    location: Mapped["Location | None"] = relationship("Location", lazy="selectin")
    category: Mapped["InventoryCategory | None"] = relationship(
        "InventoryCategory", lazy="selectin"
    )


class StockLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "stock_logs"
    __table_args__ = {"schema": "inventario"}

    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventario.items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo_movimiento: Mapped[MovementTypeEnum] = mapped_column(
        SQLEnum(MovementTypeEnum, name="movement_type_enum", schema="inventario"),
        nullable=False,
    )
    cantidad_cambio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    nota: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    user: Mapped["User | None"] = relationship("User", lazy="selectin", foreign_keys=[user_id])
