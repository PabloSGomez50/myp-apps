import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_and_household
from app.modules.core.models import User
from app.modules.finanzas.schemas import (
    AccountCreate,
    AccountOut,
    AccountUpdate,
    BrokerCreate,
    BrokerOut,
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
from app.modules.finanzas.service import FinanzasService

finanzas_router = APIRouter(prefix="/api/v1/finanzas", tags=["Finanzas"])


# ==============================================================================
# Accounts
# ==============================================================================
@finanzas_router.get("/accounts", response_model=list[AccountOut], status_code=status.HTTP_200_OK)
async def get_accounts(
    only_mine: bool = Query(False),
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    target_user_id = user.id if only_mine else None
    return await FinanzasService.get_accounts(db, household_id, target_user_id)


@finanzas_router.post("/accounts", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    return await FinanzasService.create_account(db, user.id, household_id, data)


@finanzas_router.put("/accounts/{id}", response_model=AccountOut, status_code=status.HTTP_200_OK)
async def update_account(
    id: uuid.UUID,
    data: AccountUpdate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.update_account(db, id, data)


# ==============================================================================
# Categories & Budgets
# ==============================================================================
@finanzas_router.get(
    "/categories", response_model=list[CategoryOut], status_code=status.HTTP_200_OK
)
async def get_categories(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.get_categories(db, household_id)


@finanzas_router.post(
    "/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED
)
async def create_category(
    data: CategoryCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.create_category(db, household_id, data)


@finanzas_router.put("/categories/{id}", response_model=CategoryOut, status_code=status.HTTP_200_OK)
async def update_category(
    id: uuid.UUID,
    data: CategoryUpdate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.update_category(db, id, data)


@finanzas_router.get("/budgets", response_model=list[BudgetOut], status_code=status.HTTP_200_OK)
async def get_budgets(
    month: int = Query(...),
    year: int = Query(...),
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.get_budgets(db, household_id, month, year)


@finanzas_router.post("/budgets", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    budget = await FinanzasService.create_budget(db, household_id, data)
    return BudgetOut.model_validate(budget)


# ==============================================================================
# Transactions & Splitwise
# ==============================================================================
@finanzas_router.post(
    "/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    data: TransactionCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    tx = await FinanzasService.create_transaction(db, user.id, household_id, data)
    return TransactionOut.model_validate(tx)


@finanzas_router.post(
    "/transactions/split", response_model=TransactionOut, status_code=status.HTTP_201_CREATED
)
async def create_split_transaction(
    data: TransactionSplitCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    tx = await FinanzasService.create_split_transaction(db, user.id, household_id, data)
    return TransactionOut.model_validate(tx)


@finanzas_router.post(
    "/transactions/settlement", response_model=TransactionOut, status_code=status.HTTP_201_CREATED
)
async def create_settlement(
    data: SettlementCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    tx = await FinanzasService.create_settlement(db, user.id, household_id, data)
    return TransactionOut.model_validate(tx)


@finanzas_router.get(
    "/balance/couple-net", response_model=CoupleBalanceOut, status_code=status.HTTP_200_OK
)
async def get_couple_balance(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    return await FinanzasService.get_couple_net_balance(db, user.id, household_id)


# ==============================================================================
# Shopping Lists & Discounts
# ==============================================================================
@finanzas_router.post(
    "/shopping/lists", response_model=ShoppingListOut, status_code=status.HTTP_201_CREATED
)
async def create_shopping_list(
    data: ShoppingListCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    shopping_list = await FinanzasService.create_shopping_list(db, household_id, data)
    return await FinanzasService.get_shopping_list_details(db, shopping_list.id)


@finanzas_router.get(
    "/shopping/lists/{id}", response_model=ShoppingListOut, status_code=status.HTTP_200_OK
)
async def get_shopping_list(
    id: uuid.UUID,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.get_shopping_list_details(db, id)


@finanzas_router.post(
    "/shopping/lists/{id}/items",
    response_model=ShoppingItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_shopping_item(
    id: uuid.UUID,
    data: ShoppingItemCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    item = await FinanzasService.add_shopping_item(db, id, data)
    list_details = await FinanzasService.get_shopping_list_details(db, id)
    item_out = next((it for it in list_details.items if it.id == item.id), None)
    return item_out


@finanzas_router.post(
    "/shopping/lists/{id}/checkout", response_model=TransactionOut, status_code=status.HTTP_200_OK
)
async def checkout_shopping_list(
    id: uuid.UUID,
    data: ShoppingCheckoutRequest,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    return await FinanzasService.checkout_shopping_list(db, user.id, household_id, id, data)


# ==============================================================================
# Savings & Emergency Fund
# ==============================================================================
@finanzas_router.get(
    "/savings/goals", response_model=list[SavingsGoalOut], status_code=status.HTTP_200_OK
)
async def get_savings_goals(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.get_savings_goals(db, household_id)


@finanzas_router.post(
    "/savings/goals", response_model=SavingsGoalOut, status_code=status.HTTP_201_CREATED
)
async def create_savings_goal(
    data: SavingsGoalCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    goal = await FinanzasService.create_savings_goal(db, household_id, data)
    return SavingsGoalOut.model_validate(goal)


@finanzas_router.post(
    "/savings/goals/{id}/contribute", response_model=SavingsGoalOut, status_code=status.HTTP_200_OK
)
async def contribute_to_goal(
    id: uuid.UUID,
    data: GoalContributionCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, _ = current_auth
    goal = await FinanzasService.contribute_to_goal(db, user.id, id, data)
    return SavingsGoalOut.model_validate(goal)


@finanzas_router.get(
    "/savings/emergency-fund-calculator",
    response_model=EmergencyFundCalculationOut,
    status_code=status.HTTP_200_OK,
)
async def get_emergency_fund_calculation(
    meses_cobertura: int = Query(3, ge=1, le=24),
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.calculate_emergency_fund(db, household_id, meses_cobertura)


# ==============================================================================
# Brokers
# ==============================================================================
@finanzas_router.get(
    "/investments/brokers", response_model=list[BrokerOut], status_code=status.HTTP_200_OK
)
async def get_brokers(
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    _, household_id = current_auth
    return await FinanzasService.get_brokers(db, household_id)


@finanzas_router.post(
    "/investments/brokers", response_model=BrokerOut, status_code=status.HTTP_201_CREATED
)
async def create_broker(
    data: BrokerCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    user, household_id = current_auth
    return await FinanzasService.create_broker(db, user.id, household_id, data)


@finanzas_router.post(
    "/investments/brokers/{id}/transactions",
    status_code=status.HTTP_201_CREATED,
)
async def record_broker_transaction(
    id: uuid.UUID,
    data: BrokerTxCreate,
    current_auth: tuple[User, uuid.UUID | None] = Depends(get_current_user_and_household),
    db: AsyncSession = Depends(get_db),
):
    return await FinanzasService.record_broker_transaction(db, id, data)
