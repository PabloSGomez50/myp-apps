import uuid
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.core.models import HouseholdMember
from app.modules.finanzas.models import (
    Account,
    Broker,
    BrokerTransaction,
    Budget,
    Category,
    ExpenseTypeEnum,
    GoalContribution,
    SavingsGoal,
    ShoppingItem,
    ShoppingList,
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
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    CoupleBalanceOut,
    EmergencyFundCalculationOut,
    GoalContributionCreate,
    SavingsGoalCreate,
    SavingsGoalOut,
    SettlementCreate,
    ShoppingCheckoutRequest,
    ShoppingItemCreate,
    ShoppingItemOut,
    ShoppingListCreate,
    ShoppingListOut,
    TransactionCreate,
    TransactionOut,
    TransactionSplitCreate,
)


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
        # Verify account
        acc_result = await db.execute(select(Account).where(Account.id == data.account_id))
        account = acc_result.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Cuenta no encontrada."
            )

        transaction = Transaction(
            household_id=household_id,
            account_id=data.account_id,
            user_id=user_id,
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

        # Update account balance atomically
        if data.tipo == TransactionTypeEnum.EXPENSE:
            account.saldo_actual -= data.monto
        elif data.tipo == TransactionTypeEnum.INCOME:
            account.saldo_actual += data.monto

        await db.commit()
        await db.refresh(transaction)
        return transaction

    @staticmethod
    async def create_split_transaction(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: TransactionSplitCreate
    ) -> Transaction:
        create_data = TransactionCreate(
            account_id=data.account_id,
            category_id=data.category_id,
            tipo=TransactionTypeEnum.EXPENSE,
            monto=data.monto,
            moneda=data.moneda,
            es_compartido=True,
            split_ratio=Decimal("0.50"),
            descripcion=data.descripcion,
            fecha=data.fecha,
        )
        return await FinanzasService.create_transaction(db, user_id, household_id, create_data)

    @staticmethod
    async def create_settlement(
        db: AsyncSession, user_id: uuid.UUID, household_id: uuid.UUID, data: SettlementCreate
    ) -> Transaction:
        # Verify source and target accounts
        source_res = await db.execute(select(Account).where(Account.id == data.source_account_id))
        source_account = source_res.scalar_one_or_none()
        target_res = await db.execute(select(Account).where(Account.id == data.target_account_id))
        target_account = target_res.scalar_one_or_none()

        if not source_account or not target_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuentas de liquidación no encontradas.",
            )

        # Create settlement transaction
        settlement_tx = Transaction(
            household_id=household_id,
            account_id=data.source_account_id,
            user_id=user_id,
            category_id=None,
            tipo=TransactionTypeEnum.SETTLEMENT,
            monto=data.monto,
            moneda=data.moneda,
            es_compartido=False,
            split_ratio=Decimal("0.00"),
            descripcion=data.descripcion,
            fecha=datetime.now(UTC),
        )
        db.add(settlement_tx)

        # Transfer money between personal accounts
        source_account.saldo_actual -= data.monto
        target_account.saldo_actual += data.monto

        await db.commit()
        await db.refresh(settlement_tx)
        return settlement_tx

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
        partner_name = partner_member.user.nombre if partner_member else "Pareja"

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
    # Shopping Lists & Discounts
    # ==========================================================================
    @staticmethod
    async def create_shopping_list(
        db: AsyncSession, household_id: uuid.UUID, data: ShoppingListCreate
    ) -> ShoppingList:
        shopping_list = ShoppingList(
            household_id=household_id,
            nombre=data.nombre,
            descuento_general_porcentaje=data.descuento_general_porcentaje,
        )
        db.add(shopping_list)
        await db.commit()
        await db.refresh(shopping_list)
        return shopping_list

    @staticmethod
    async def add_shopping_item(
        db: AsyncSession, list_id: uuid.UUID, data: ShoppingItemCreate
    ) -> ShoppingItem:
        item = ShoppingItem(
            list_id=list_id,
            nombre=data.nombre,
            precio_unitario=data.precio_unitario,
            cantidad=data.cantidad,
            descuento_especifico_porcentaje=data.descuento_especifico_porcentaje,
            comprado=data.comprado,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def get_shopping_list_details(db: AsyncSession, list_id: uuid.UUID) -> ShoppingListOut:
        result = await db.execute(
            select(ShoppingList)
            .options(selectinload(ShoppingList.items))
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
                    descuento_aplicado_porcentaje=discount,
                    precio_final_calculado=final_price,
                )
            )

        return ShoppingListOut(
            id=shopping_list.id,
            household_id=shopping_list.household_id,
            nombre=shopping_list.nombre,
            descuento_general_porcentaje=shopping_list.descuento_general_porcentaje,
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

        # Create 50/50 Shared Expense Transaction
        tx_data = TransactionSplitCreate(
            account_id=data.account_id,
            category_id=data.category_id,
            monto=list_details.total_con_descuentos,
            moneda="ARS",
            descripcion=f"{data.descripcion} ({list_details.nombre})",
            fecha=datetime.now(UTC),
        )
        tx = await FinanzasService.create_split_transaction(db, user_id, household_id, tx_data)

        # Mark shopping list as completed
        list_obj = await db.get(ShoppingList, list_id)
        if list_obj:
            list_obj.is_completed = True
            await db.commit()

        return TransactionOut.model_validate(tx)

    # ==========================================================================
    # Savings & Emergency Fund
    # ==========================================================================
    @staticmethod
    async def create_savings_goal(
        db: AsyncSession, household_id: uuid.UUID, data: SavingsGoalCreate
    ) -> SavingsGoal:
        goal = SavingsGoal(
            household_id=household_id,
            nombre=data.nombre,
            monto_objetivo=data.monto_objetivo,
            moneda=data.moneda,
            fecha_limite=data.fecha_limite,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def get_savings_goals(db: AsyncSession, household_id: uuid.UUID) -> list[SavingsGoalOut]:
        result = await db.execute(
            select(SavingsGoal)
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
            goal_outs.append(
                SavingsGoalOut(
                    id=g.id,
                    household_id=g.household_id,
                    nombre=g.nombre,
                    monto_objetivo=g.monto_objetivo,
                    monto_acumulado=g.monto_acumulado,
                    moneda=g.moneda,
                    fecha_limite=g.fecha_limite,
                    porcentaje_avance=pct,
                    created_at=g.created_at,
                )
            )
        return goal_outs

    @staticmethod
    async def contribute_to_goal(
        db: AsyncSession, user_id: uuid.UUID, goal_id: uuid.UUID, data: GoalContributionCreate
    ) -> SavingsGoal:
        goal = await db.get(SavingsGoal, goal_id)
        account = await db.get(Account, data.account_id)
        if not goal or not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Meta o cuenta no encontrada."
            )

        contribution = GoalContribution(
            goal_id=goal_id,
            user_id=user_id,
            account_id=data.account_id,
            monto=data.monto,
            fecha=datetime.now(UTC),
        )
        db.add(contribution)

        # Deduct from account and add to goal
        account.saldo_actual -= data.monto
        goal.monto_acumulado += data.monto

        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def calculate_emergency_fund(
        db: AsyncSession, household_id: uuid.UUID, meses_cobertura: int = 3
    ) -> EmergencyFundCalculationOut:
        # Sum expenses categorized as FIXED_HOUSEHOLD or FIXED_PERSONAL
        fixed_categories_res = await db.execute(
            select(Category.id).where(
                Category.household_id == household_id,
                Category.tipo_gasto.in_(
                    [ExpenseTypeEnum.FIXED_HOUSEHOLD, ExpenseTypeEnum.FIXED_PERSONAL]
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
        ahorro_actual = em_goal.monto_acumulado if em_goal else Decimal("0.00")
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
        broker = Broker(
            user_id=user_id,
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

        tx = BrokerTransaction(
            broker_id=broker_id,
            tipo=data.tipo,
            monto=data.monto,
            moneda=data.moneda,
            descripcion=data.descripcion,
            fecha=datetime.now(UTC),
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
