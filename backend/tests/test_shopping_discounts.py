from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_shopping_list_hierarchical_discounts_and_checkout(client: AsyncClient):
    # 1. Setup Auth, Account & Category
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "shop_user@mypapps.com", "password": "password123", "nombre": "Pablo"},
    )
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    acc_res = await client.post(
        "/api/v1/finanzas/accounts",
        headers=headers,
        json={
            "nombre": "MercadoPago",
            "tipo": "FINTECH",
            "moneda": "ARS",
            "saldo_actual": "100000.00",
        },
    )
    assert acc_res.status_code == 201, acc_res.text
    acc_id = acc_res.json()["id"]

    cat_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=headers,
        json={
            "nombre": "Supermercado",
            "tipo_gasto": "VARIABLE_HOUSEHOLD",
            "icono": "cart",
            "color": "emerald",
        },
    )
    assert cat_res.status_code == 201, cat_res.text
    cat_id = cat_res.json()["id"]

    # 2. Create Shopping List with 20% global discount
    list_res = await client.post(
        "/api/v1/finanzas/shopping/lists",
        headers=headers,
        json={"nombre": "Supermercado Día", "descuento_general_porcentaje": "20.00"},
    )
    assert list_res.status_code == 201, list_res.text
    list_id = list_res.json()["id"]

    # 3. Add Item 1: No specific discount -> Should inherit 20%
    # Price: 1000 x 2 = 2000 - 20% = 1600
    await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={"nombre": "Leche", "precio_unitario": "1000.00", "cantidad": 2},
    )

    # 4. Add Item 2: Specific discount of 15% -> Should override 20% and use 15%
    # Price: 2000 x 1 = 2000 - 15% = 1700
    await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={
            "nombre": "Queso",
            "precio_unitario": "2000.00",
            "cantidad": 1,
            "descuento_especifico_porcentaje": "15.00",
        },
    )

    # 5. Fetch List Details & Check calculated totals
    # Total = 1600 + 1700 = 3300
    details_res = await client.get(f"/api/v1/finanzas/shopping/lists/{list_id}", headers=headers)
    assert details_res.status_code == 200, details_res.text
    details = details_res.json()
    assert Decimal(str(details["total_con_descuentos"])) == Decimal("3300.00")
    assert Decimal(str(details["division_50_50"])) == Decimal("1650.00")

    # 6. Checkout -> Creates 50/50 Shared Transaction
    checkout_res = await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/checkout",
        headers=headers,
        json={
            "account_id": acc_id,
            "category_id": cat_id,
            "descripcion": "Compra Supermercado Día",
        },
    )
    assert checkout_res.status_code == 200, checkout_res.text
    tx_data = checkout_res.json()
    assert tx_data["es_compartido"] is True
    assert Decimal(str(tx_data["monto"])) == Decimal("3300.00")
