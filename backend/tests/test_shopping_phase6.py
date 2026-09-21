from decimal import Decimal

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_supermarkets_food_price_history_and_post_checkout_sync(client: AsyncClient):
    # 1. Auth Setup
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "phase6_user@mypapps.com", "password": "password123", "nombre": "Martu"},
    )
    assert res.status_code == 201, res.text
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    acc_res = await client.post(
        "/api/v1/finanzas/accounts",
        headers=headers,
        json={
            "nombre": "Banco Galicia",
            "tipo": "BANK",
            "moneda": "ARS",
            "saldo_actual": "200000.00",
        },
    )
    assert acc_res.status_code == 201, acc_res.text
    acc_id = acc_res.json()["id"]

    cat_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=headers,
        json={
            "nombre": "Comida y Supermercado",
            "tipo_gasto": "VARIABLE_HOUSEHOLD",
            "icono": "shopping-cart",
            "color": "emerald",
        },
    )
    assert cat_res.status_code == 201, cat_res.text
    cat_id = cat_res.json()["id"]

    # 2. Supermarket CRUD
    sm_res = await client.post(
        "/api/v1/finanzas/supermarkets",
        headers=headers,
        json={
            "nombre": "Coto",
            "icono": "shopping-bag",
            "color": "red",
            "descuento_habitual_porcentaje": "15.00",
            "dia_promocion_habitual": "Miércoles",
        },
    )
    assert sm_res.status_code == 201, sm_res.text
    supermarket = sm_res.json()
    sm_id = supermarket["id"]
    assert supermarket["nombre"] == "Coto"

    # Get supermarkets
    sms_res = await client.get("/api/v1/finanzas/supermarkets", headers=headers)
    assert sms_res.status_code == 200
    assert len(sms_res.json()) >= 1

    # 3. Create Multi-list with Supermarket ID
    list_res = await client.post(
        "/api/v1/finanzas/shopping/lists",
        headers=headers,
        json={
            "nombre": "Compra Semanal Coto",
            "descuento_general_porcentaje": "15.00",
            "supermarket_id": sm_id,
        },
    )
    assert list_res.status_code == 201, list_res.text
    list_id = list_res.json()["id"]

    # Add items to list
    item1_res = await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={"nombre": "Arroz 1kg", "precio_unitario": "1200.00", "cantidad": 3},
    )
    assert item1_res.status_code == 201, item1_res.text
    item1_id = item1_res.json()["id"]

    item2_res = await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={"nombre": "Aceite de Oliva", "precio_unitario": "5000.00", "cantidad": 1, "descuento_especifico_porcentaje": "20.00"},
    )
    assert item2_res.status_code == 201, item2_res.text
    item2_id = item2_res.json()["id"]

    # 4. Checkout Shopping List (without account_id, selecting category_id)
    checkout_res = await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/checkout",
        headers=headers,
        json={
            "category_id": cat_id,
            "descripcion": "Compra semanal",
        },
    )
    assert checkout_res.status_code == 200, checkout_res.text

    # 5. Check Food Price History
    history_res = await client.get("/api/v1/finanzas/food-price-history", headers=headers)
    assert history_res.status_code == 200, history_res.text
    history_items = history_res.json()
    assert len(history_items) >= 2
    item_names = [h["item_nombre"] for h in history_items]
    assert "Arroz 1kg" in item_names
    assert "Aceite de Oliva" in item_names

    # 6. Post-Checkout Inventory Sync
    sync_res = await client.post(
        "/api/v1/finanzas/shopping/post-checkout-sync",
        headers=headers,
        json={
            "items": [
                {
                    "shopping_item_id": item1_id,
                    "create_new": True,
                    "nombre_item": "Arroz 1kg",
                    "cantidad": 3,
                    "stock_minimo": 1,
                }
            ]
        },
    )
    assert sync_res.status_code == 200, sync_res.text
    assert sync_res.json()["synced_count"] == 1

    # Check that item was created in inventory
    inv_res = await client.get("/api/v1/inventario/items", headers=headers)
    assert inv_res.status_code == 200, inv_res.text
    inv_items = inv_res.json()
    created_inv_item = next((it for it in inv_items if it["nombre"] == "Arroz 1kg"), None)
    assert created_inv_item is not None
    assert Decimal(str(created_inv_item["stock_actual"])) == Decimal("3.00")
