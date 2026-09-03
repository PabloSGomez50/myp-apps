from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_accounts_and_splitwise_flow(client: AsyncClient):
    # 1. Register Pablo (creates Household)
    res_pablo = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pablo_fin@mypapps.com",
            "password": "password123",
            "pin": "1234",
            "nombre": "Pablo",
            "household_name": "Casa Pablo & Martu",
        },
    )
    assert res_pablo.status_code == 201, res_pablo.text
    pablo_data = res_pablo.json()
    token_pablo = pablo_data["access_token"]
    household_id = pablo_data["household_id"]
    headers_pablo = {"Authorization": f"Bearer {token_pablo}"}

    # 2. Register Partner Martu (joins Pablo's Household)
    res_partner = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "partner_fin@mypapps.com",
            "password": "password123",
            "pin": "5678",
            "nombre": "Martu",
            "household_id": household_id,
        },
    )
    assert res_partner.status_code == 201, res_partner.text
    token_partner = res_partner.json()["access_token"]
    headers_partner = {"Authorization": f"Bearer {token_partner}"}

    # 3. Create Accounts
    acc_pablo_res = await client.post(
        "/api/v1/finanzas/accounts",
        headers=headers_pablo,
        json={
            "nombre": "Galicia Pablo",
            "tipo": "BANK",
            "moneda": "ARS",
            "saldo_actual": "500000.00",
        },
    )
    assert acc_pablo_res.status_code == 201, acc_pablo_res.text
    acc_pablo_id = acc_pablo_res.json()["id"]

    acc_partner_res = await client.post(
        "/api/v1/finanzas/accounts",
        headers=headers_partner,
        json={
            "nombre": "Uala Martu",
            "tipo": "FINTECH",
            "moneda": "ARS",
            "saldo_actual": "200000.00",
        },
    )
    assert acc_partner_res.status_code == 201, acc_partner_res.text
    acc_partner_id = acc_partner_res.json()["id"]

    # 4. Create Category
    cat_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=headers_pablo,
        json={
            "nombre": "Supermercado",
            "tipo_gasto": "VARIABLE_HOUSEHOLD",
            "icono": "shopping-cart",
            "color": "emerald",
        },
    )
    assert cat_res.status_code == 201, cat_res.text
    cat_id = cat_res.json()["id"]

    # 5. Pablo pays a 50/50 shared expense of $40,000 ARS
    split_res = await client.post(
        "/api/v1/finanzas/transactions/split",
        headers=headers_pablo,
        json={
            "account_id": acc_pablo_id,
            "category_id": cat_id,
            "monto": "40000.00",
            "moneda": "ARS",
            "descripcion": "Supermercado Semanal Coto",
        },
    )
    assert split_res.status_code == 201, split_res.text

    # 6. Check Couple Balance
    bal_res = await client.get("/api/v1/finanzas/balance/couple-net", headers=headers_pablo)
    assert bal_res.status_code == 200, bal_res.text
    bal_data = bal_res.json()
    # Pablo paid $40k -> Partner owes Pablo $20k (+20000)
    assert Decimal(str(bal_data["net_balance"])) == Decimal("20000.00")

    # 7. Partner executes a partial Settlement of $15,000 ARS to Pablo
    settle_res = await client.post(
        "/api/v1/finanzas/transactions/settlement",
        headers=headers_partner,
        json={
            "source_account_id": acc_partner_id,
            "target_account_id": acc_pablo_id,
            "monto": "15000.00",
            "moneda": "ARS",
            "descripcion": "Transferencia de ajuste parcial",
        },
    )
    assert settle_res.status_code == 201, settle_res.text

    # 8. Check remaining balance (should now be $5,000 ARS)
    bal_res_after = await client.get("/api/v1/finanzas/balance/couple-net", headers=headers_pablo)
    assert bal_res_after.status_code == 200, bal_res_after.text
    bal_data_after = bal_res_after.json()
    assert Decimal(str(bal_data_after["net_balance"])) == Decimal("5000.00")
