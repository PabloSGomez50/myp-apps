import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_savings_goals_and_decoupled_contributions(client: AsyncClient):
    # 1. Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "savings_user@mypapps.com",
            "password": "password123",
            "nombre": "Pablo Savings",
            "household_name": "Hogar Ahorro",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create a Savings Goal (Emergency Fund)
    goal_res = await client.post(
        "/api/v1/finanzas/savings/goals",
        headers=headers,
        json={
            "nombre": "Fondo de Emergencia 6 Meses",
            "monto_objetivo": 2700000.00,
            "moneda": "ARS",
        },
    )
    assert goal_res.status_code == 201, goal_res.text
    goal_data = goal_res.json()
    goal_id = goal_data["id"]
    assert goal_data["nombre"] == "Fondo de Emergencia 6 Meses"
    assert float(goal_data["monto_acumulado"]) == 0.0

    # 3. Contribute without providing account_id (decoupled accounts)
    contrib_res = await client.post(
        f"/api/v1/finanzas/savings/goals/{goal_id}/contribute",
        headers=headers,
        json={
            "monto": 450000.00,
        },
    )
    assert contrib_res.status_code == 200, contrib_res.text
    updated_goal = contrib_res.json()
    assert float(updated_goal["monto_acumulado"]) == 450000.00
    assert float(updated_goal["porcentaje_avance"]) > 0

    # 4. List Savings Goals
    list_res = await client.get("/api/v1/finanzas/savings/goals", headers=headers)
    assert list_res.status_code == 200
    goals = list_res.json()
    assert len(goals) >= 1
    assert goals[0]["id"] == goal_id
    assert "contributions" in goals[0]
    assert len(goals[0]["contributions"]) == 1
    assert float(goals[0]["contributions"][0]["monto"]) == 450000.00

    # 5. Edit Savings Goal
    edit_res = await client.put(
        f"/api/v1/finanzas/savings/goals/{goal_id}",
        headers=headers,
        json={"nombre": "Fondo de Emergencia Actualizado", "monto_objetivo": 3000000.00},
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["nombre"] == "Fondo de Emergencia Actualizado"

    # 6. Delete Savings Goal
    del_res = await client.delete(
        f"/api/v1/finanzas/savings/goals/{goal_id}",
        headers=headers,
    )
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_brokers_and_broker_transactions(client: AsyncClient):
    # 1. Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "broker_user@mypapps.com",
            "password": "password123",
            "nombre": "Martu Investments",
            "household_name": "Hogar Inversión",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Broker
    broker_res = await client.post(
        "/api/v1/finanzas/investments/brokers",
        headers=headers,
        json={
            "nombre": "Balanz Capital",
            "saldo_total_ars": 100000.00,
            "saldo_total_usd": 500.00,
        },
    )
    assert broker_res.status_code == 201, broker_res.text
    broker_data = broker_res.json()
    broker_id = broker_data["id"]
    assert broker_data["nombre"] == "Balanz Capital"

    # 3. Record Broker Deposit
    tx_res = await client.post(
        f"/api/v1/finanzas/investments/brokers/{broker_id}/transactions",
        headers=headers,
        json={
            "tipo": "DEPOSIT",
            "monto": 50000.00,
            "moneda": "ARS",
            "descripcion": "Depósito para compra de FCI",
        },
    )
    assert tx_res.status_code == 201, tx_res.text
    tx_data = tx_res.json()
    assert tx_data["tipo"] == "DEPOSIT"
    assert float(tx_data["monto"]) == 50000.00

    # 4. List Brokers
    brokers_list = await client.get("/api/v1/finanzas/investments/brokers", headers=headers)
    assert brokers_list.status_code == 200
    b_data = brokers_list.json()
    assert len(b_data) >= 1
    assert float(b_data[0]["saldo_total_ars"]) == 150000.00


@pytest.mark.asyncio
async def test_currency_quotes_historical_tracking(client: AsyncClient):
    # 1. Register user
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "quotes_user@mypapps.com",
            "password": "password123",
            "nombre": "Pablo Quotes",
            "household_name": "Hogar Cotizaciones",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Currency Quote for USD_MEP
    quote1 = await client.post(
        "/api/v1/finanzas/currency-quotes",
        headers=headers,
        json={
            "moneda_origen": "USD_MEP",
            "moneda_destino": "ARS",
            "cotizacion": 1280.50,
        },
    )
    assert quote1.status_code == 201, quote1.text
    assert quote1.json()["moneda_origen"] == "USD_MEP"

    # 3. Create Currency Quote for USD_BLUE
    quote2 = await client.post(
        "/api/v1/finanzas/currency-quotes",
        headers=headers,
        json={
            "moneda_origen": "USD_BLUE",
            "moneda_destino": "ARS",
            "cotizacion": 1310.00,
        },
    )
    assert quote2.status_code == 201, quote2.text

    # 4. Get Latest Currency Quotes Map
    latest_res = await client.get("/api/v1/finanzas/currency-quotes/latest", headers=headers)
    assert latest_res.status_code == 200
    latest_map = latest_res.json()
    assert float(latest_map["USD_MEP"]) == 1280.50
    assert float(latest_map["USD_BLUE"]) == 1310.00

    # 5. List Historical Quotes
    history_res = await client.get(
        "/api/v1/finanzas/currency-quotes?moneda_origen=USD_MEP", headers=headers
    )
    assert history_res.status_code == 200
    history_list = history_res.json()
    assert len(history_list) >= 1
    assert history_list[0]["moneda_origen"] == "USD_MEP"


@pytest.mark.asyncio
async def test_investment_assets_crud(client: AsyncClient):
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "assets_user@mypapps.com",
            "password": "password123",
            "nombre": "Pablo Assets",
            "household_name": "Hogar Activos",
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Asset (CEDEAR SPY)
    create_res = await client.post(
        "/api/v1/finanzas/investments/assets",
        headers=headers,
        json={
            "ticker": "SPY",
            "nombre": "CEDEAR S&P 500",
            "tipo": "CEDEAR",
            "cantidad": 10.0,
            "precio_compra": 15000.0,
            "precio_actual": 16500.0,
            "rentabilidad_esperada_anual": 12.5,
            "moneda": "ARS",
        },
    )
    assert create_res.status_code == 201, create_res.text
    asset_id = create_res.json()["id"]

    # 2. Update Asset
    update_res = await client.put(
        f"/api/v1/finanzas/investments/assets/{asset_id}",
        headers=headers,
        json={"precio_actual": 17000.0, "cantidad": 12.0},
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["precio_actual"]) == 17000.0
    assert float(update_res.json()["cantidad"]) == 12.0

    # 3. List Assets
    list_res = await client.get("/api/v1/finanzas/investments/assets", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Delete Asset
    del_res = await client.delete(f"/api/v1/finanzas/investments/assets/{asset_id}", headers=headers)
    assert del_res.status_code == 204

