import csv
import io
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.core.models import HouseholdMember
from app.modules.finanzas.models import (
    Account,
    Broker,
    BrokerTransaction,
    Budget,
    Category,
    CategoryMapping,
    CurrencyQuote,
    ExpenseTypeEnum,
    FoodPriceHistory,
    GoalContribution,
    InvestmentAsset,
    SavingsGoal,
    ShoppingItem,
    ShoppingList,
    Supermarket,
    Transaction,
    TransactionTypeEnum,
)
from app.modules.finanzas.schemas import (
    AccountCreate,
    AccountUpdate,
    BrokerCreate,
    BrokerTxCreate,
    BudgetCreate,
    BudgetOut,
    BulkImportRequest,
    CategoryCreate,
    CategoryMappingCreate,
    CategoryMappingOut,
    CategoryMappingUpdate,
    CategoryOut,
    CategoryUpdate,
    CoupleBalanceOut,
    CsvParseResponse,
    CsvPreviewRow,
    CurrencyQuoteCreate,
    EmergencyFundCalculationOut,
    FoodPriceHistoryOut,
    GoalContributionCreate,
    GoalContributionOut,
    InvestmentAssetCreate,
    InvestmentAssetUpdate,
    PostCheckoutSyncRequest,
    SavingsGoalCreate,
    SavingsGoalOut,
    SavingsGoalUpdate,
    SettlementCreate,
    ShoppingCheckoutRequest,
    ShoppingItemCreate,
    ShoppingItemOut,
    ShoppingItemUpdate,
    ShoppingListCreate,
    ShoppingListOut,
    ShoppingListUpdate,
    SupermarketCreate,
    SupermarketOut,
    SupermarketUpdate,
    TransactionBulkDelete,
    TransactionCreate,
    TransactionOut,
    TransactionSplitCreate,
    TransactionUpdate,
)
from app.modules.inventario.models import InventoryItem, MovementTypeEnum, StockLog


class FinanzasService:
    # ==========================================================================
    # Accounts
    # ==========================================================================
    @staticmethod
    async def create_account(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: AccountCreate
    ) -> Account:
        account = Account(
            user_id=user_id,
            household_id=household_id,
            nombre=data.nombre,
            tipo=data.tipo,
            moneda=data.moneda,
            saldo_actual=data.saldo_actual,
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        return account

    @staticmethod
    async def get_accounts(
        db: AsyncSession, household_id: uuid.UUID, user_id: uuid.UUID | None = None
    ) -> list[Account]:
        query = select(Account).where(
            Account.household_id == household_id, Account.is_active.is_(True)
        )
        if user_id:
            query = query.where(Account.user_id == user_id)
        result = await db.execute(query.order_by(Account.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def update_account(
        db: AsyncSession, account_id: uuid.UUID, data: AccountUpdate
    ) -> Account:
        result = await db.execute(select(Account).where(Account.id == account_id))
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada."
            )
        if data.nombre is not None:
            account.nombre = data.nombre
        if data.tipo is not None:
            account.tipo = data.tipo
        if data.is_active is not None:
            account.is_active = data.is_active
        await db.commit()
        await db.refresh(account)
        return account

    # ==========================================================================
    # Categories & Budgets
    # ==========================================================================
    @staticmethod
    async def create_category(
        db: AsyncSession, household_id: uuid.UUID, data: CategoryCreate
    ) -> Category:
        category = Category(
            household_id=household_id,
            nombre=data.nombre,
            tipo_gasto=data.tipo_gasto,
            icono=data.icono,
            color=data.color,
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def get_categories(db: AsyncSession, household_id: uuid.UUID) -> list[Category]:
        result = await db.execute(
            select(Category)
            .where(Category.household_id == household_id, Category.is_active.is_(True))
            .order_by(Category.tipo_gasto, Category.nombre)
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_category(
        db: AsyncSession, category_id: uuid.UUID, data: CategoryUpdate
    ) -> Category:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada."
            )
        if data.nombre is not None:
            category.nombre = data.nombre
        if data.tipo_gasto is not None:
            category.tipo_gasto = data.tipo_gasto
        if data.icono is not None:
            category.icono = data.icono
        if data.color is not None:
            category.color = data.color
        if data.is_active is not None:
            category.is_active = data.is_active
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, category_id: uuid.UUID) -> bool:
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada."
            )
        category.is_active = False
        await db.commit()
        return True

    @staticmethod
    async def create_budget(
        db: AsyncSession, household_id: uuid.UUID, data: BudgetCreate
    ) -> Budget:
        budget = Budget(
            household_id=household_id,
            category_id=data.category_id,
            month=data.month,
            year=data.year,
            monto_limite=data.monto_limite,
            moneda=data.moneda,
        )
        db.add(budget)
        await db.commit()
        await db.refresh(budget)
        return budget

    @staticmethod
    async def get_budgets(
        db: AsyncSession, household_id: uuid.UUID, month: int, year: int
    ) -> list[BudgetOut]:
        result = await db.execute(
            select(Budget)
            .options(selectinload(Budget.category))
            .where(Budget.household_id == household_id, Budget.month == month, Budget.year == year)
        )
        budgets = list(result.scalars().all())

        budget_outs = []
        for b in budgets:
            # Calculate spent for this category in the given month/year
            spent_query = await db.execute(
                select(func.coalesce(func.sum(Transaction.monto), Decimal("0.00"))).where(
                    Transaction.household_id == household_id,
                    Transaction.category_id == b.category_id,
                    Transaction.tipo == TransactionTypeEnum.EXPENSE,
                    func.extract("month", Transaction.fecha) == month,
                    func.extract("year", Transaction.fecha) == year,
                )
            )
            gastado = spent_query.scalar() or Decimal("0.00")
            porcentaje = (gastado / b.monto_limite * 100) if b.monto_limite > 0 else Decimal("0.00")
            budget_outs.append(
                BudgetOut(
                    id=b.id,
                    household_id=b.household_id,
                    category_id=b.category_id,
                    month=b.month,
                    year=b.year,
                    monto_limite=b.monto_limite,
                    moneda=b.moneda,
                    gastado=gastado,
                    porcentaje_consumido=porcentaje,
                    category=CategoryOut.model_validate(b.category) if b.category else None,
                )
            )
        return budget_outs

    # ==========================================================================
    # Transactions & Splitwise Logic
    # ==========================================================================
    @staticmethod
    async def create_transaction(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: TransactionCreate
    ) -> Transaction:
        payer_user_id = data.user_id if data.user_id else user_id

        # Verify account if provided
        if data.account_id:
            acc_result = await db.execute(select(Account).where(Account.id == data.account_id))
            account = acc_result.scalar_one_or_none()
            if not account:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada."
                )

            # Update account balance atomically
            if data.tipo == TransactionTypeEnum.EXPENSE:
                account.saldo_actual -= data.monto
            elif data.tipo == TransactionTypeEnum.INCOME:
                account.saldo_actual += data.monto

        transaction = Transaction(
            household_id=household_id,
            account_id=data.account_id,
            user_id=payer_user_id,
            category_id=data.category_id,
            tipo=data.tipo,
            monto=data.monto,
            moneda=data.moneda,
            es_compartido=data.es_compartido,
            split_ratio=data.split_ratio,
            tipo_cambio=data.tipo_cambio,
            descripcion=data.descripcion,
            fecha=data.fecha,
        )
        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)
        return transaction

    @staticmethod
    async def create_split_transaction(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: TransactionSplitCreate
    ) -> Transaction:
        payer_user_id = data.user_id if data.user_id else user_id
        create_data = TransactionCreate(
            account_id=data.account_id,
            user_id=payer_user_id,
            category_id=data.category_id,
            tipo=TransactionTypeEnum.EXPENSE,
            monto=data.monto,
            moneda=data.moneda,
            es_compartido=True,
            split_ratio=Decimal("0.50"),
            descripcion=data.descripcion,
            fecha=data.fecha,
        )
        return await FinanzasService.create_transaction(
            db, payer_user_id, household_id, create_data
        )

    @staticmethod
    async def create_settlement(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: SettlementCreate
    ) -> Transaction:
        payer_id = data.source_user_id if data.source_user_id else user_id

        # Verify source and target accounts if provided
        source_account = None
        target_account = None
        if data.source_account_id and data.target_account_id:
            source_res = await db.execute(
                select(Account).where(Account.id == data.source_account_id)
            )
            source_account = source_res.scalar_one_or_none()
            target_res = await db.execute(
                select(Account).where(Account.id == data.target_account_id)
            )
            target_account = target_res.scalar_one_or_none()

        # Create settlement transaction
        settlement_tx = Transaction(
            household_id=household_id,
            account_id=data.source_account_id,
            user_id=payer_id,
            category_id=None,
            tipo=TransactionTypeEnum.SETTLEMENT,
            monto=data.monto,
            moneda=data.moneda,
            es_compartido=False,
            split_ratio=Decimal("0.00"),
            descripcion=data.descripcion,
            fecha=data.fecha or datetime.now(UTC),
        )
        db.add(settlement_tx)

        # Transfer money between accounts if present
        if source_account and target_account:
            source_account.saldo_actual -= data.monto
            target_account.saldo_actual += data.monto

        await db.commit()
        await db.refresh(settlement_tx)
        return settlement_tx

    @staticmethod
    async def get_transactions(
        db: AsyncSession,
        household_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        category_id: uuid.UUID | None = None,
        limit: int = 200,
    ) -> list[Transaction]:
        query = (
            select(Transaction)
            .options(selectinload(Transaction.account), selectinload(Transaction.category))
            .where(Transaction.household_id == household_id)
            .order_by(Transaction.fecha.desc(), Transaction.created_at.desc())
        )
        if user_id:
            query = query.where(Transaction.user_id == user_id)
        if category_id:
            query = query.where(Transaction.category_id == category_id)

        if limit > 0:
            query = query.limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_transaction(
        db: AsyncSession,
        transaction_id: uuid.UUID,
        household_id: uuid.UUID,
        data: TransactionUpdate,
    ) -> Transaction:
        res = await db.execute(
            select(Transaction)
            .options(selectinload(Transaction.account), selectinload(Transaction.category))
            .where(Transaction.id == transaction_id, Transaction.household_id == household_id)
        )
        tx = res.scalar_one_or_none()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Movimiento no encontrado."
            )

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(tx, key, value)

        await db.commit()
        await db.refresh(tx)
        return tx

    @staticmethod
    async def delete_transaction(
        db: AsyncSession, transaction_id: uuid.UUID, household_id: uuid.UUID
    ) -> bool:
        res = await db.execute(
            select(Transaction).where(
                Transaction.id == transaction_id, Transaction.household_id == household_id
            )
        )
        tx = res.scalar_one_or_none()
        if not tx:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Movimiento no encontrado."
            )

        await db.delete(tx)
        await db.commit()
        return True

    @staticmethod
    async def delete_all_transactions(db: AsyncSession, household_id: uuid.UUID) -> int:
        res = await db.execute(delete(Transaction).where(Transaction.household_id == household_id))
        await db.commit()
        return res.rowcount

    @staticmethod
    async def delete_bulk_transactions(
        db: AsyncSession, household_id: uuid.UUID, data: TransactionBulkDelete
    ) -> int:
        stmt = delete(Transaction).where(Transaction.household_id == household_id)
        if data.ids is not None:
            if not data.ids:
                return 0
            stmt = stmt.where(Transaction.id.in_(data.ids))
        if data.user_id:
            stmt = stmt.where(Transaction.user_id == data.user_id)
        if data.category_id:
            stmt = stmt.where(Transaction.category_id == data.category_id)
        if data.start_date:
            stmt = stmt.where(Transaction.fecha >= data.start_date)
        if data.end_date:
            stmt = stmt.where(Transaction.fecha <= data.end_date)

        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def get_couple_net_balance(
        db: AsyncSession, active_user_id: uuid.UUID, household_id: uuid.UUID
    ) -> CoupleBalanceOut:
        # Get members of household
        members_res = await db.execute(
            select(HouseholdMember)
            .options(selectinload(HouseholdMember.user))
            .where(HouseholdMember.household_id == household_id)
        )
        members = list(members_res.scalars().all())

        active_user_member = next((m for m in members if m.user_id == active_user_id), None)
        partner_member = next((m for m in members if m.user_id != active_user_id), None)

        active_user_name = active_user_member.user.nombre if active_user_member else "Usuario"
        partner_id = partner_member.user_id if partner_member else None
        partner_name = partner_member.user.nombre if partner_member else "Martu"

        if not partner_id:
            return CoupleBalanceOut(
                net_balance=Decimal("0.00"),
                active_user_id=active_user_id,
                active_user_name=active_user_name,
                partner_id=None,
                partner_name=None,
                summary_text="No hay otro miembro en el hogar para calcular el balance de pareja.",
            )

        # 1. Shared expenses paid by Active User (50% is owed to active user)
        paid_by_active_res = await db.execute(
            select(
                func.coalesce(
                    func.sum(Transaction.monto * Transaction.split_ratio), Decimal("0.00")
                )
            ).where(
                Transaction.household_id == household_id,
                Transaction.user_id == active_user_id,
                Transaction.es_compartido.is_(True),
                Transaction.tipo == TransactionTypeEnum.EXPENSE,
            )
        )
        owed_to_active = paid_by_active_res.scalar() or Decimal("0.00")

        # 2. Shared expenses paid by Partner (50% is owed by active user to partner)
        paid_by_partner_res = await db.execute(
            select(
                func.coalesce(
                    func.sum(Transaction.monto * Transaction.split_ratio), Decimal("0.00")
                )
            ).where(
                Transaction.household_id == household_id,
                Transaction.user_id == partner_id,
                Transaction.es_compartido.is_(True),
                Transaction.tipo == TransactionTypeEnum.EXPENSE,
            )
        )
        owed_by_active = paid_by_partner_res.scalar() or Decimal("0.00")

        # 3. Settlements paid by Partner to Active User (reduces what partner owes active)
        settlements_from_partner_res = await db.execute(
            select(func.coalesce(func.sum(Transaction.monto), Decimal("0.00"))).where(
                Transaction.household_id == household_id,
                Transaction.user_id == partner_id,
                Transaction.tipo == TransactionTypeEnum.SETTLEMENT,
            )
        )
        settlements_from_partner = settlements_from_partner_res.scalar() or Decimal("0.00")

        # 4. Settlements paid by Active User to Partner (reduces what active owes partner)
        settlements_from_active_res = await db.execute(
            select(func.coalesce(func.sum(Transaction.monto), Decimal("0.00"))).where(
                Transaction.household_id == household_id,
                Transaction.user_id == active_user_id,
                Transaction.tipo == TransactionTypeEnum.SETTLEMENT,
            )
        )
        settlements_from_active = settlements_from_active_res.scalar() or Decimal("0.00")

        # Net balance from active user perspective:
        # (what partner owes active) - (what active owes partner) - (settlements received) + (settlements paid)
        net_balance = (
            (owed_to_active - owed_by_active) - settlements_from_partner + settlements_from_active
        )

        if net_balance > 0:
            summary_text = f"{partner_name} te adeuda ${net_balance:,.2f} por gastos compartidos."
        elif net_balance < 0:
            summary_text = (
                f"Le adeudas ${abs(net_balance):,.2f} a {partner_name} por gastos compartidos."
            )
        else:
            summary_text = "Están al día con los gastos compartidos (Balance $0.00)."

        return CoupleBalanceOut(
            net_balance=net_balance,
            active_user_id=active_user_id,
            active_user_name=active_user_name,
            partner_id=partner_id,
            partner_name=partner_name,
            summary_text=summary_text,
        )

    # ==========================================================================
    # Supermarkets & Stores
    # ==========================================================================
    @staticmethod
    async def create_supermarket(
        db: AsyncSession, household_id: uuid.UUID, data: SupermarketCreate
    ) -> Supermarket:
        supermarket = Supermarket(
            household_id=household_id,
            nombre=data.nombre.strip(),
            icono=data.icono,
            color=data.color,
            descuento_habitual_porcentaje=data.descuento_habitual_porcentaje,
            dia_promocion_habitual=data.dia_promocion_habitual,
        )
        db.add(supermarket)
        await db.commit()
        await db.refresh(supermarket)
        return supermarket

    @staticmethod
    async def get_supermarkets(
        db: AsyncSession, household_id: uuid.UUID
    ) -> list[Supermarket]:
        result = await db.execute(
            select(Supermarket)
            .where(Supermarket.household_id == household_id)
            .order_by(Supermarket.nombre.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_supermarket(
        db: AsyncSession, supermarket_id: uuid.UUID, household_id: uuid.UUID, data: SupermarketUpdate
    ) -> Supermarket:
        supermarket = await db.get(Supermarket, supermarket_id)
        if not supermarket or supermarket.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado no encontrado."
            )

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(supermarket, key, value)

        await db.commit()
        await db.refresh(supermarket)
        return supermarket

    @staticmethod
    async def delete_supermarket(
        db: AsyncSession, supermarket_id: uuid.UUID, household_id: uuid.UUID
    ) -> bool:
        supermarket = await db.get(Supermarket, supermarket_id)
        if not supermarket or supermarket.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Supermercado no encontrado."
            )

        await db.delete(supermarket)
        await db.commit()
        return True

    # ==========================================================================
    # Food Price History
    # ==========================================================================
    @staticmethod
    async def get_food_price_history(
        db: AsyncSession,
        household_id: uuid.UUID,
        item_nombre: str | None = None,
        limit: int = 100,
    ) -> list[FoodPriceHistory]:
        query = (
            select(FoodPriceHistory)
            .options(selectinload(FoodPriceHistory.supermarket))
            .where(FoodPriceHistory.household_id == household_id)
            .order_by(FoodPriceHistory.fecha.desc())
        )
        if item_nombre:
            query = query.where(FoodPriceHistory.item_nombre.ilike(f"%{item_nombre.strip()}%"))

        if limit > 0:
            query = query.limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    # ==========================================================================
    # Shopping Lists & Discounts
    # ==========================================================================
    @staticmethod
    async def create_shopping_list(
        db: AsyncSession, household_id: uuid.UUID, data: ShoppingListCreate
    ) -> ShoppingListOut:
        shopping_list = ShoppingList(
            household_id=household_id,
            nombre=data.nombre.strip(),
            descuento_general_porcentaje=data.descuento_general_porcentaje,
            supermarket_id=data.supermarket_id,
        )
        db.add(shopping_list)
        await db.commit()
        return await FinanzasService.get_shopping_list_details(db, shopping_list.id)

    @staticmethod
    async def get_shopping_lists(
        db: AsyncSession, household_id: uuid.UUID, estado: str | None = None
    ) -> list[ShoppingListOut]:
        query = (
            select(ShoppingList)
            .where(ShoppingList.household_id == household_id)
            .order_by(ShoppingList.created_at.desc())
        )
        if estado:
            query = query.where(ShoppingList.estado == estado)

        result = await db.execute(query)
        lists = list(result.scalars().all())

        out_lists = []
        for l in lists:
            out_lists.append(await FinanzasService.get_shopping_list_details(db, l.id))
        return out_lists

    @staticmethod
    async def update_shopping_list(
        db: AsyncSession, list_id: uuid.UUID, household_id: uuid.UUID, data: ShoppingListUpdate
    ) -> ShoppingListOut:
        shopping_list = await db.get(ShoppingList, list_id)
        if not shopping_list or shopping_list.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Lista de compras no encontrada."
            )

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(shopping_list, key, value)

        await db.commit()
        return await FinanzasService.get_shopping_list_details(db, list_id)

    @staticmethod
    async def delete_shopping_list(
        db: AsyncSession, list_id: uuid.UUID, household_id: uuid.UUID
    ) -> bool:
        shopping_list = await db.get(ShoppingList, list_id)
        if not shopping_list or shopping_list.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Lista de compras no encontrada."
            )

        await db.delete(shopping_list)
        await db.commit()
        return True

    @staticmethod
    async def add_shopping_item(
        db: AsyncSession, list_id: uuid.UUID, data: ShoppingItemCreate
    ) -> ShoppingItem:
        item = ShoppingItem(
            list_id=list_id,
            nombre=data.nombre.strip(),
            precio_unitario=data.precio_unitario,
            cantidad=data.cantidad,
            descuento_especifico_porcentaje=data.descuento_especifico_porcentaje,
            comprado=data.comprado,
            inventory_item_id=data.inventory_item_id,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_shopping_item(
        db: AsyncSession, item_id: uuid.UUID, data: ShoppingItemUpdate
    ) -> ShoppingItem:
        item = await db.get(ShoppingItem, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Ítem de lista no encontrado."
            )

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if isinstance(value, str):
                value = value.strip()
            setattr(item, key, value)

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def delete_shopping_item(db: AsyncSession, item_id: uuid.UUID) -> bool:
        item = await db.get(ShoppingItem, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Ítem de lista no encontrado."
            )

        await db.delete(item)
        await db.commit()
        return True

    @staticmethod
    async def get_shopping_list_details(db: AsyncSession, list_id: uuid.UUID) -> ShoppingListOut:
        result = await db.execute(
            select(ShoppingList)
            .options(
                selectinload(ShoppingList.items),
                selectinload(ShoppingList.supermarket),
            )
            .where(ShoppingList.id == list_id)
        )
        shopping_list = result.scalar_one_or_none()
        if not shopping_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Lista de compras no encontrada."
            )

        item_outs = []
        total_con_descuentos = Decimal("0.00")

        for item in shopping_list.items:
            # Hierarchical discount rule:
            # If item has specific discount -> use it. Otherwise use list general discount.
            discount = (
                item.descuento_especifico_porcentaje
                if item.descuento_especifico_porcentaje is not None
                else shopping_list.descuento_general_porcentaje
            )
            base_total = item.precio_unitario * Decimal(item.cantidad)
            final_price = base_total * (Decimal("1.00") - (discount / Decimal("100.00")))
            total_con_descuentos += final_price

            item_outs.append(
                ShoppingItemOut(
                    id=item.id,
                    list_id=item.list_id,
                    nombre=item.nombre,
                    precio_unitario=item.precio_unitario,
                    cantidad=item.cantidad,
                    descuento_especifico_porcentaje=item.descuento_especifico_porcentaje,
                    comprado=item.comprado,
                    inventory_item_id=item.inventory_item_id,
                    descuento_aplicado_porcentaje=discount,
                    precio_final_calculado=final_price,
                )
            )

        return ShoppingListOut(
            id=shopping_list.id,
            household_id=shopping_list.household_id,
            nombre=shopping_list.nombre,
            estado=shopping_list.estado,
            descuento_general_porcentaje=shopping_list.descuento_general_porcentaje,
            supermarket_id=shopping_list.supermarket_id,
            supermarket=SupermarketOut.model_validate(shopping_list.supermarket) if shopping_list.supermarket else None,
            is_completed=shopping_list.is_completed,
            total_con_descuentos=total_con_descuentos,
            division_50_50=total_con_descuentos / Decimal("2.00"),
            items=item_outs,
            created_at=shopping_list.created_at,
        )

    @staticmethod
    async def checkout_shopping_list(
        db: AsyncSession,
        user_id: uuid.UUID,
        household_id: uuid.UUID,
        list_id: uuid.UUID,
        data: ShoppingCheckoutRequest,
    ) -> TransactionOut:
        list_details = await FinanzasService.get_shopping_list_details(db, list_id)
        if list_details.is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="La lista ya ha sido finalizada."
            )

        payer_id = data.user_id if data.user_id else user_id

        # Create 50/50 Shared Expense Transaction
        tx_data = TransactionSplitCreate(
            account_id=data.account_id,
            user_id=payer_id,
            category_id=data.category_id,
            monto=list_details.total_con_descuentos,
            moneda="ARS",
            descripcion=f"{data.descripcion} ({list_details.nombre})",
            fecha=datetime.now(UTC),
        )
        tx = await FinanzasService.create_split_transaction(db, payer_id, household_id, tx_data)

        # Record Food Price History entries for bought items with price > 0
        list_obj = await db.get(ShoppingList, list_id)
        if list_obj:
            list_obj.is_completed = True
            list_obj.estado = "COMPLETED"

            items_res = await db.execute(
                select(ShoppingItem).where(ShoppingItem.list_id == list_id)
            )
            items = list(items_res.scalars().all())

            for item in items:
                if item.precio_unitario > Decimal("0.00"):
                    discount = (
                        item.descuento_especifico_porcentaje
                        if item.descuento_especifico_porcentaje is not None
                        else list_obj.descuento_general_porcentaje
                    )
                    effective_price = item.precio_unitario * (Decimal("1.00") - (discount / Decimal("100.00")))

                    history_entry = FoodPriceHistory(
                        household_id=household_id,
                        supermarket_id=list_obj.supermarket_id,
                        inventory_item_id=item.inventory_item_id,
                        item_nombre=item.nombre,
                        precio_unitario=item.precio_unitario,
                        descuento_aplicado=discount,
                        precio_efectivo=effective_price,
                        fecha=datetime.now(UTC),
                    )
                    db.add(history_entry)

            await db.commit()

        return TransactionOut.model_validate(tx)

    @staticmethod
    async def post_checkout_sync_inventory(
        db: AsyncSession,
        user_id: uuid.UUID,
        household_id: uuid.UUID,
        data: PostCheckoutSyncRequest,
    ) -> dict:
        synced_count = 0
        for sync_item in data.items:
            if sync_item.inventory_item_id:
                inv_item = await db.get(InventoryItem, sync_item.inventory_item_id)
                if inv_item and inv_item.household_id == household_id:
                    inv_item.stock_actual += Decimal(sync_item.cantidad)

                    log = StockLog(
                        item_id=inv_item.id,
                        user_id=user_id,
                        tipo_movimiento=MovementTypeEnum.REPLENISHMENT,
                        cantidad_cambio=Decimal(sync_item.cantidad),
                        nota="Ingresado desde checkout de lista de compras",
                    )
                    db.add(log)
                    synced_count += 1
            elif sync_item.create_new:
                new_inv_item = InventoryItem(
                    household_id=household_id,
                    nombre=sync_item.nombre_item.strip(),
                    stock_actual=Decimal(sync_item.cantidad),
                    stock_minimo=Decimal(sync_item.stock_minimo),
                    location_id=sync_item.ubicacion_id,
                    category_id=sync_item.categoria_id,
                    unidad_medida="unidades",
                )
                db.add(new_inv_item)
                await db.flush()

                shop_item = await db.get(ShoppingItem, sync_item.shopping_item_id)
                if shop_item:
                    shop_item.inventory_item_id = new_inv_item.id

                log = StockLog(
                    item_id=new_inv_item.id,
                    user_id=user_id,
                    tipo_movimiento=MovementTypeEnum.REPLENISHMENT,
                    cantidad_cambio=Decimal(sync_item.cantidad),
                    nota="Creado desde checkout de lista de compras",
                )
                db.add(log)
                synced_count += 1

        await db.commit()
        return {"synced_count": synced_count, "message": "Inventario sincronizado exitosamente."}

    # ==========================================================================
    # Savings & Emergency Fund
    # ==========================================================================
    @staticmethod
    async def create_savings_goal(
        db: AsyncSession, household_id: uuid.UUID, data: SavingsGoalCreate
    ) -> SavingsGoal:
        goal = SavingsGoal(
            household_id=household_id,
            user_id=data.user_id if data.es_personal else None,
            es_personal=data.es_personal,
            nombre=data.nombre.strip(),
            monto_objetivo=data.monto_objetivo,
            moneda=data.moneda.strip().upper(),
            fecha_limite=data.fecha_limite,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def update_savings_goal(
        db: AsyncSession, goal_id: uuid.UUID, household_id: uuid.UUID, data: SavingsGoalUpdate
    ) -> SavingsGoalOut:
        goal = await db.get(SavingsGoal, goal_id)
        if not goal or goal.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada.")

        if data.nombre is not None:
            goal.nombre = data.nombre.strip()
        if data.monto_objetivo is not None:
            goal.monto_objetivo = data.monto_objetivo
        if data.moneda is not None:
            goal.moneda = data.moneda.strip().upper()
        if data.fecha_limite is not None:
            goal.fecha_limite = data.fecha_limite
        if data.es_personal is not None:
            goal.es_personal = data.es_personal
            goal.user_id = data.user_id if data.es_personal else None
        elif data.user_id is not None:
            goal.user_id = data.user_id

        await db.commit()

        goal_res = await db.execute(
            select(SavingsGoal)
            .options(selectinload(SavingsGoal.contributions))
            .where(SavingsGoal.id == goal_id)
        )
        reloaded_goal = goal_res.scalar_one()

        pct = (
            (reloaded_goal.monto_acumulado / reloaded_goal.monto_objetivo * 100)
            if reloaded_goal.monto_objetivo > 0
            else Decimal("0.00")
        )
        contrib_outs = [GoalContributionOut.model_validate(c) for c in reloaded_goal.contributions]
        return SavingsGoalOut(
            id=reloaded_goal.id,
            household_id=reloaded_goal.household_id,
            user_id=reloaded_goal.user_id,
            es_personal=reloaded_goal.es_personal,
            nombre=reloaded_goal.nombre,
            monto_objetivo=reloaded_goal.monto_objetivo,
            monto_acumulado=reloaded_goal.monto_acumulado,
            moneda=reloaded_goal.moneda,
            fecha_limite=reloaded_goal.fecha_limite,
            porcentaje_avance=pct,
            contributions=contrib_outs,
            created_at=reloaded_goal.created_at,
        )

    @staticmethod
    async def delete_savings_goal(
        db: AsyncSession, goal_id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        goal = await db.get(SavingsGoal, goal_id)
        if goal and goal.household_id == household_id:
            await db.delete(goal)
            await db.commit()

    @staticmethod
    async def get_savings_goals(db: AsyncSession, household_id: uuid.UUID) -> list[SavingsGoalOut]:
        result = await db.execute(
            select(SavingsGoal)
            .options(selectinload(SavingsGoal.contributions))
            .where(SavingsGoal.household_id == household_id)
            .order_by(SavingsGoal.nombre)
        )
        goals = list(result.scalars().all())
        goal_outs = []
        for g in goals:
            pct = (
                (g.monto_acumulado / g.monto_objetivo * 100)
                if g.monto_objetivo > 0
                else Decimal("0.00")
            )
            contrib_outs = [GoalContributionOut.model_validate(c) for c in g.contributions]
            goal_outs.append(
                SavingsGoalOut(
                    id=g.id,
                    household_id=g.household_id,
                    user_id=g.user_id,
                    es_personal=g.es_personal,
                    nombre=g.nombre,
                    monto_objetivo=g.monto_objetivo,
                    monto_acumulado=g.monto_acumulado,
                    moneda=g.moneda,
                    fecha_limite=g.fecha_limite,
                    porcentaje_avance=pct,
                    contributions=contrib_outs,
                    created_at=g.created_at,
                )
            )
        return goal_outs

    @staticmethod
    async def contribute_to_goal(
        db: AsyncSession, user_id: uuid.UUID, goal_id: uuid.UUID, data: GoalContributionCreate
    ) -> SavingsGoalOut:
        goal = await db.get(SavingsGoal, goal_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta no encontrada.")

        source_currency = "ARS"
        if data.account_id:
            account = await db.get(Account, data.account_id)
            if account:
                account.saldo_actual -= data.monto
                source_currency = account.moneda
        elif data.broker_id:
            source_currency = "USD"

        contribution = GoalContribution(
            goal_id=goal_id,
            user_id=user_id,
            account_id=data.account_id,
            broker_id=data.broker_id,
            monto=data.monto,
            fecha=data.fecha if data.fecha else datetime.now(UTC),
        )
        db.add(contribution)

        # Convert currency if source currency differs from goal currency
        monto_para_meta = data.monto
        if source_currency.upper() == "USD" and goal.moneda.upper() == "ARS":
            latest_quotes = await FinanzasService.get_latest_currency_quotes(db, goal.household_id)
            usd_blue_rate = latest_quotes.get("USD_BLUE") or Decimal("1350.00")
            monto_para_meta = data.monto * usd_blue_rate
        elif source_currency.upper() == "ARS" and goal.moneda.upper() == "USD":
            latest_quotes = await FinanzasService.get_latest_currency_quotes(db, goal.household_id)
            usd_blue_rate = latest_quotes.get("USD_BLUE") or Decimal("1350.00")
            monto_para_meta = data.monto / usd_blue_rate

        goal.monto_acumulado += monto_para_meta

        await db.commit()

        goal_res = await db.execute(
            select(SavingsGoal)
            .options(selectinload(SavingsGoal.contributions))
            .where(SavingsGoal.id == goal_id)
        )
        reloaded_goal = goal_res.scalar_one()

        pct = (
            (reloaded_goal.monto_acumulado / reloaded_goal.monto_objetivo * 100)
            if reloaded_goal.monto_objetivo > 0
            else Decimal("0.00")
        )
        contrib_outs = [GoalContributionOut.model_validate(c) for c in reloaded_goal.contributions]
        return SavingsGoalOut(
            id=reloaded_goal.id,
            household_id=reloaded_goal.household_id,
            user_id=reloaded_goal.user_id,
            es_personal=reloaded_goal.es_personal,
            nombre=reloaded_goal.nombre,
            monto_objetivo=reloaded_goal.monto_objetivo,
            monto_acumulado=reloaded_goal.monto_acumulado,
            moneda=reloaded_goal.moneda,
            fecha_limite=reloaded_goal.fecha_limite,
            porcentaje_avance=pct,
            contributions=contrib_outs,
            created_at=reloaded_goal.created_at,
        )

    @staticmethod
    async def calculate_emergency_fund(
        db: AsyncSession, household_id: uuid.UUID, meses_cobertura: int = 3
    ) -> EmergencyFundCalculationOut:
        # Sum expenses categorized as FIXED_HOUSEHOLD or FIXED_PERSONAL
        fixed_categories_res = await db.execute(
            select(Category.id).where(
                Category.household_id == household_id,
                Category.tipo_gasto.in_(
                    [ExpenseTypeEnum.FIXED_HOUSEHOLD, ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
                     ExpenseTypeEnum.FIXED_PERSONAL, ExpenseTypeEnum.VARIABLE_PERSONAL]
                ),
            )
        )
        fixed_cat_ids = list(fixed_categories_res.scalars().all())

        total_fixed_spent = Decimal("0.00")
        if fixed_cat_ids:
            fixed_spent_res = await db.execute(
                select(func.coalesce(func.sum(Transaction.monto), Decimal("0.00"))).where(
                    Transaction.household_id == household_id,
                    Transaction.category_id.in_(fixed_cat_ids),
                    Transaction.tipo == TransactionTypeEnum.EXPENSE,
                )
            )
            total_fixed_spent = fixed_spent_res.scalar() or Decimal("0.00")

        # Assume 3-month sample average or fallback default
        gasto_fijo_promedio = (
            total_fixed_spent / Decimal("3.00") if total_fixed_spent > 0 else Decimal("450000.00")
        )
        meta_sugerida = gasto_fijo_promedio * Decimal(meses_cobertura)

        # Check existing emergency goal if any
        em_goal_res = await db.execute(
            select(SavingsGoal).where(
                SavingsGoal.household_id == household_id,
                SavingsGoal.nombre.ilike("%emergencia%"),
            )
        )
        em_goal = em_goal_res.scalar_one_or_none()
        ahorro_actual = Decimal("0.00")
        if em_goal:
            if em_goal.moneda.upper() == "USD":
                latest_quotes = await FinanzasService.get_latest_currency_quotes(db, household_id)
                usd_blue_rate = latest_quotes.get("USD_BLUE") or Decimal("1350.00")
                ahorro_actual = em_goal.monto_acumulado * usd_blue_rate
            else:
                ahorro_actual = em_goal.monto_acumulado

        cobertura_pct = (
            (ahorro_actual / meta_sugerida * 100) if meta_sugerida > 0 else Decimal("0.00")
        )
        meses_cubiertos = (
            (ahorro_actual / gasto_fijo_promedio) if gasto_fijo_promedio > 0 else Decimal("0.00")
        )

        return EmergencyFundCalculationOut(
            gasto_fijo_promedio_mensual=gasto_fijo_promedio,
            meses_cobertura_sugeridos=meses_cobertura,
            meta_sugerida=meta_sugerida,
            ahorro_actual_emergencia=ahorro_actual,
            porcentaje_cobertura_actual=cobertura_pct,
            meses_cubiertos_reales=meses_cubiertos,
        )

    # ==========================================================================
    # Brokers
    # ==========================================================================
    @staticmethod
    async def create_broker(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: BrokerCreate
    ) -> Broker:
        target_user = data.user_id or user_id
        broker = Broker(
            user_id=target_user,
            household_id=household_id,
            nombre=data.nombre,
            saldo_total_ars=data.saldo_total_ars,
            saldo_total_usd=data.saldo_total_usd,
            saldo_total_crypto=data.saldo_total_crypto,
        )
        db.add(broker)
        await db.commit()
        await db.refresh(broker)
        return broker

    @staticmethod
    async def get_brokers(
        db: AsyncSession, household_id: uuid.UUID, user_id: uuid.UUID | None = None
    ) -> list[Broker]:
        query = select(Broker).where(
            Broker.household_id == household_id, Broker.is_active.is_(True)
        )
        if user_id:
            query = query.where(Broker.user_id == user_id)
        result = await db.execute(query.order_by(Broker.nombre))
        return list(result.scalars().all())

    @staticmethod
    async def record_broker_transaction(
        db: AsyncSession, broker_id: uuid.UUID, data: BrokerTxCreate
    ) -> BrokerTransaction:
        broker = await db.get(Broker, broker_id)
        if not broker:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Broker no encontrado."
            )

        tx_fecha = data.fecha if data.fecha else datetime.now(UTC)
        tx = BrokerTransaction(
            broker_id=broker_id,
            tipo=data.tipo,
            monto=data.monto,
            moneda=data.moneda,
            descripcion=data.descripcion,
            fecha=tx_fecha,
        )
        db.add(tx)

        # Update broker balances
        if data.moneda.upper() == "ARS":
            if data.tipo.value in ["DEPOSIT", "SELL_SIMPLE", "FCI_REDEEM"]:
                broker.saldo_total_ars += data.monto
            else:
                broker.saldo_total_ars -= data.monto
        elif data.moneda.upper() == "USD":
            if data.tipo.value in ["DEPOSIT", "SELL_SIMPLE", "FCI_REDEEM"]:
                broker.saldo_total_usd += data.monto
            else:
                broker.saldo_total_usd -= data.monto

        await db.commit()
        await db.refresh(tx)
        return tx

    # ==========================================================================
    # Currency Quotes (Histórico de Cotizaciones)
    # ==========================================================================
    @staticmethod
    async def create_currency_quote(
        db: AsyncSession, household_id: uuid.UUID, data: CurrencyQuoteCreate
    ) -> CurrencyQuote:
        quote = CurrencyQuote(
            household_id=household_id,
            moneda_origen=data.moneda_origen.upper(),
            moneda_destino=data.moneda_destino.upper(),
            cotizacion=data.cotizacion,
            fecha=data.fecha if data.fecha else datetime.now(UTC),
        )
        db.add(quote)
        await db.commit()
        await db.refresh(quote)
        return quote

    @staticmethod
    async def get_currency_quotes(
        db: AsyncSession, household_id: uuid.UUID, moneda_origen: str | None = None
    ) -> list[CurrencyQuote]:
        query = select(CurrencyQuote).where(CurrencyQuote.household_id == household_id)
        if moneda_origen:
            query = query.where(func.upper(CurrencyQuote.moneda_origen) == moneda_origen.upper())
        result = await db.execute(query.order_by(CurrencyQuote.fecha.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def get_latest_currency_quotes(
        db: AsyncSession, household_id: uuid.UUID
    ) -> dict[str, Decimal]:
        result = await db.execute(
            select(CurrencyQuote)
            .where(CurrencyQuote.household_id == household_id)
            .order_by(CurrencyQuote.fecha.desc())
        )
        quotes = result.scalars().all()
        latest_map: dict[str, Decimal] = {}
        for q in quotes:
            if q.moneda_origen not in latest_map:
                latest_map[q.moneda_origen] = q.cotizacion
        return latest_map

    # ==========================================================================
    # Category Mappings & CSV Import
    # ==========================================================================
    @staticmethod
    async def get_category_mappings(
        db: AsyncSession, household_id: uuid.UUID
    ) -> list[CategoryMappingOut]:
        result = await db.execute(
            select(CategoryMapping)
            .options(selectinload(CategoryMapping.category))
            .where(CategoryMapping.household_id == household_id)
            .order_by(CategoryMapping.patron.asc())
        )
        mappings = list(result.scalars().all())
        return [CategoryMappingOut.model_validate(m) for m in mappings]

    @staticmethod
    async def create_category_mapping(
        db: AsyncSession, household_id: uuid.UUID, data: CategoryMappingCreate
    ) -> CategoryMappingOut:
        patron_clean = data.patron.strip().lower()
        result = await db.execute(
            select(CategoryMapping).where(
                CategoryMapping.household_id == household_id,
                func.lower(CategoryMapping.patron) == patron_clean,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.category_id = data.category_id
            await db.commit()
            await db.refresh(existing)
            mapping = existing
        else:
            mapping = CategoryMapping(
                household_id=household_id,
                patron=patron_clean,
                category_id=data.category_id,
            )
            db.add(mapping)
            await db.commit()
            await db.refresh(mapping)

        mapping_reloaded = await db.execute(
            select(CategoryMapping)
            .options(selectinload(CategoryMapping.category))
            .where(CategoryMapping.id == mapping.id)
        )
        return CategoryMappingOut.model_validate(mapping_reloaded.scalar_one())

    @staticmethod
    async def update_category_mapping(
        db: AsyncSession, mapping_id: uuid.UUID, data: CategoryMappingUpdate
    ) -> CategoryMappingOut:
        result = await db.execute(select(CategoryMapping).where(CategoryMapping.id == mapping_id))
        mapping = result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Regla de automapeo no encontrada."
            )
        if data.patron is not None:
            mapping.patron = data.patron.strip().lower()
        if data.category_id is not None:
            mapping.category_id = data.category_id

        await db.commit()

        mapping_reloaded = await db.execute(
            select(CategoryMapping)
            .options(selectinload(CategoryMapping.category))
            .where(CategoryMapping.id == mapping.id)
        )
        return CategoryMappingOut.model_validate(mapping_reloaded.scalar_one())

    @staticmethod
    async def delete_category_mapping(db: AsyncSession, mapping_id: uuid.UUID) -> bool:
        result = await db.execute(select(CategoryMapping).where(CategoryMapping.id == mapping_id))
        mapping = result.scalar_one_or_none()
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Regla de automapeo no encontrada."
            )
        await db.delete(mapping)
        await db.commit()
        return True

    @staticmethod
    async def parse_csv_content(
        db: AsyncSession, household_id: uuid.UUID, content: str
    ) -> CsvParseResponse:
        # 1. Fetch Household Members
        members_res = await db.execute(
            select(HouseholdMember)
            .options(selectinload(HouseholdMember.user))
            .where(HouseholdMember.household_id == household_id)
        )
        members = list(members_res.scalars().all())

        # Build map of user names
        users_map: dict[str, tuple[uuid.UUID, str]] = {}
        for m in members:
            if m.user:
                users_map[m.user.nombre.strip().lower()] = (m.user.id, m.user.nombre)

        # 2. Fetch Category Mappings & Categories
        mappings_res = await db.execute(
            select(CategoryMapping).where(CategoryMapping.household_id == household_id)
        )
        mappings = list(mappings_res.scalars().all())

        categories_res = await db.execute(
            select(Category).where(
                Category.household_id == household_id, Category.is_active.is_(True)
            )
        )
        categories = list(categories_res.scalars().all())
        categories_by_type = {c.tipo_gasto: c for c in categories}

        # Keyword rules for fallback category matching
        keyword_type_map = {
            "coto": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "diarco": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "carrefour": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "carefour": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "dia": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "res": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "verduleria": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "supermercado": ExpenseTypeEnum.VARIABLE_HOUSEHOLD,
            "rapanui": ExpenseTypeEnum.LEISURE_COUPLE,
            "sushi": ExpenseTypeEnum.LEISURE_COUPLE,
            "mostaza": ExpenseTypeEnum.LEISURE_COUPLE,
            "luccianos": ExpenseTypeEnum.LEISURE_COUPLE,
            "cinepolis": ExpenseTypeEnum.LEISURE_COUPLE,
            "pizza": ExpenseTypeEnum.LEISURE_COUPLE,
            "metrogas": ExpenseTypeEnum.FIXED_HOUSEHOLD,
            "aysa": ExpenseTypeEnum.FIXED_HOUSEHOLD,
            "edesur": ExpenseTypeEnum.FIXED_HOUSEHOLD,
            "expensas": ExpenseTypeEnum.FIXED_HOUSEHOLD,
            "wifi": ExpenseTypeEnum.FIXED_HOUSEHOLD,
            "personal": ExpenseTypeEnum.FIXED_HOUSEHOLD,
        }

        reader = csv.reader(io.StringIO(content))
        _ = next(reader, None)

        rows: list[CsvPreviewRow] = []
        unmatched_users_count = 0
        unmatched_categories_count = 0

        for idx, row in enumerate(reader, start=1):
            if not row or len(row) < 3:
                continue

            fecha_str = row[0].strip()
            concepto_str = row[1].strip()
            monto_str = row[2].strip()
            quien_pago_raw = row[3].strip() if len(row) > 3 else ""

            # Parse amount (handling Argentine comma decimals "151312,32")
            monto_clean = (
                monto_str.replace('"', "").replace(" ", "").replace(".", "").replace(",", ".")
            )
            try:
                monto_val = float(monto_clean)
            except ValueError:
                # Try simple replace of comma if previous cleaning failed
                try:
                    monto_val = float(monto_str.replace('"', "").replace(",", "."))
                except ValueError:
                    monto_val = 0.0

            # Match User
            matched_user_id = None
            matched_user_name = None
            user_matched = False
            raw_user_lower = quien_pago_raw.lower()

            for name_key, (uid, uname) in users_map.items():
                if name_key in raw_user_lower or raw_user_lower in name_key:
                    matched_user_id = uid
                    matched_user_name = uname
                    user_matched = True
                    break

            if not user_matched:
                unmatched_users_count += 1

            # Match Category
            matched_cat_id = None
            matched_cat_name = None
            cat_matched = False
            concepto_lower = concepto_str.lower()

            # First, check database category_mappings
            for m in mappings:
                if m.patron.lower() in concepto_lower:
                    matched_cat_id = m.category_id
                    # find cat name
                    cat_obj = next((c for c in categories if c.id == m.category_id), None)
                    matched_cat_name = cat_obj.nombre if cat_obj else None
                    cat_matched = True
                    break

            # Second, fallback keyword rules
            if not cat_matched:
                for kw, exp_type in keyword_type_map.items():
                    if kw in concepto_lower:
                        cat_obj = categories_by_type.get(exp_type)
                        if cat_obj:
                            matched_cat_id = cat_obj.id
                            matched_cat_name = cat_obj.nombre
                            cat_matched = True
                            break

            if not cat_matched:
                unmatched_categories_count += 1

            # Date formatting (D/M/YYYY to YYYY-MM-DD)
            formatted_date = fecha_str
            try:
                parts = fecha_str.split("/")
                if len(parts) == 3:
                    day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
                    formatted_date = f"{year:04d}-{month:02d}-{day:02d}"
            except Exception:
                pass

            rows.append(
                CsvPreviewRow(
                    row_index=idx,
                    fecha=formatted_date,
                    concepto=concepto_str,
                    monto=monto_val,
                    quien_pago_raw=quien_pago_raw,
                    user_id=matched_user_id,
                    user_name=matched_user_name,
                    user_matched=user_matched,
                    category_id=matched_cat_id,
                    category_name=matched_cat_name,
                    category_matched=cat_matched,
                )
            )

        return CsvParseResponse(
            rows=rows,
            total_rows=len(rows),
            unmatched_users=unmatched_users_count,
            unmatched_categories=unmatched_categories_count,
        )

    @staticmethod
    async def bulk_import_transactions(
        db: AsyncSession, household_id: uuid.UUID, data: BulkImportRequest
    ) -> int:
        # Save new category mappings
        for m in data.new_mappings:
            patron_clean = m.patron.strip().lower()
            res = await db.execute(
                select(CategoryMapping).where(
                    CategoryMapping.household_id == household_id,
                    func.lower(CategoryMapping.patron) == patron_clean,
                )
            )
            existing = res.scalar_one_or_none()
            if not existing:
                new_m = CategoryMapping(
                    household_id=household_id,
                    patron=patron_clean,
                    category_id=m.category_id,
                )
                db.add(new_m)

        count = 0
        for r in data.rows:
            tx = Transaction(
                household_id=household_id,
                account_id=None,
                user_id=r.user_id,
                category_id=r.category_id,
                tipo=TransactionTypeEnum.EXPENSE,
                monto=r.monto,
                moneda="ARS",
                es_compartido=r.es_compartido,
                split_ratio=Decimal("0.50"),
                tipo_cambio=Decimal("1.0000"),
                descripcion=r.concepto,
                fecha=r.fecha,
            )
            db.add(tx)
            count += 1

        await db.commit()
        return count

    # ==========================================================================
    # Investment Assets & Holdings
    # ==========================================================================
    @staticmethod
    async def create_investment_asset(
        db: AsyncSession, household_id: uuid.UUID, data: InvestmentAssetCreate
    ) -> InvestmentAsset:
        asset = InvestmentAsset(
            household_id=household_id,
            broker_id=data.broker_id,
            ticker=data.ticker.strip().upper(),
            nombre=data.nombre.strip(),
            tipo=data.tipo.strip().upper(),
            cantidad=data.cantidad,
            precio_compra=data.precio_compra,
            precio_actual=data.precio_actual,
            rentabilidad_esperada_anual=data.rentabilidad_esperada_anual,
            moneda=data.moneda.strip().upper(),
        )
        db.add(asset)
        await db.commit()
        await db.refresh(asset)
        return asset

    @staticmethod
    async def get_investment_assets(
        db: AsyncSession, household_id: uuid.UUID
    ) -> list[InvestmentAsset]:
        result = await db.execute(
            select(InvestmentAsset)
            .options(selectinload(InvestmentAsset.broker))
            .where(InvestmentAsset.household_id == household_id)
            .order_by(InvestmentAsset.nombre)
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_investment_asset(
        db: AsyncSession, id: uuid.UUID, household_id: uuid.UUID
    ) -> None:
        asset = await db.get(InvestmentAsset, id)
        if asset and asset.household_id == household_id:
            await db.delete(asset)
            await db.commit()

    @staticmethod
    async def update_investment_asset(
        db: AsyncSession, id: uuid.UUID, household_id: uuid.UUID, data: InvestmentAssetUpdate
    ) -> InvestmentAsset:
        asset = await db.get(InvestmentAsset, id)
        if not asset or asset.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Activo de inversión no encontrado."
            )

        if data.broker_id is not None:
            asset.broker_id = data.broker_id
        if data.ticker is not None:
            asset.ticker = data.ticker.strip().upper()
        if data.nombre is not None:
            asset.nombre = data.nombre.strip()
        if data.tipo is not None:
            asset.tipo = data.tipo.strip().upper()
        if data.cantidad is not None:
            asset.cantidad = data.cantidad
        if data.precio_compra is not None:
            asset.precio_compra = data.precio_compra
        if data.precio_actual is not None:
            asset.precio_actual = data.precio_actual
        if data.rentabilidad_esperada_anual is not None:
            asset.rentabilidad_esperada_anual = data.rentabilidad_esperada_anual
        if data.moneda is not None:
            asset.moneda = data.moneda.strip().upper()

        await db.commit()
        await db.refresh(asset)
        return asset
