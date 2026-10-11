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
        json={
            "nombre": "Aceite de Oliva",
            "precio_unitario": "5000.00",
            "cantidad": 1,
            "descuento_especifico_porcentaje": "20.00",
        },
    )
    assert item2_res.status_code == 201, item2_res.text

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


@pytest.mark.asyncio
async def test_supermarket_discount_types_and_custom_checkout_amount(client: AsyncClient):
    # 1. Setup Auth & Category
    res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "carrefour_user@mypapps.com",
            "password": "password123",
            "nombre": "CarrefourTester",
        },
    )
    assert res.status_code == 201, res.text
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    cat_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=headers,
        json={
            "nombre": "Alimentos Carrefour",
            "tipo_gasto": "VARIABLE_HOUSEHOLD",
            "icono": "shopping-cart",
            "color": "blue",
        },
    )
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # 2. Create Supermarket with CART_TOTAL (Carrefour)
    carrefour_res = await client.post(
        "/api/v1/finanzas/supermarkets",
        headers=headers,
        json={
            "nombre": "Carrefour Market",
            "tipo_descuento": "CART_TOTAL",
            "descuento_habitual_porcentaje": "10.00",
            "dia_promocion_habitual": "Martes",
        },
    )
    assert carrefour_res.status_code == 201, carrefour_res.text
    carrefour = carrefour_res.json()
    assert carrefour["tipo_descuento"] == "CART_TOTAL"
    carrefour_id = carrefour["id"]

    # 3. Create Supermarket with ITEM_BY_ITEM (Coto)
    coto_res = await client.post(
        "/api/v1/finanzas/supermarkets",
        headers=headers,
        json={
            "nombre": "Coto Digital",
            "tipo_descuento": "ITEM_BY_ITEM",
            "descuento_habitual_porcentaje": "15.00",
            "dia_promocion_habitual": "Jueves",
        },
    )
    assert coto_res.status_code == 201
    coto_id = coto_res.json()["id"]

    # 4. Create empty shopping list and then update its supermarket to Carrefour
    list_res = await client.post(
        "/api/v1/finanzas/shopping/lists",
        headers=headers,
        json={"nombre": "Compra Quincenal"},
    )
    assert list_res.status_code == 201
    list_id = list_res.json()["id"]

    # Update supermarket to Carrefour
    update_res = await client.put(
        f"/api/v1/finanzas/shopping/lists/{list_id}",
        headers=headers,
        json={"supermarket_id": carrefour_id},
    )
    assert update_res.status_code == 200, update_res.text
    updated_list = update_res.json()
    assert updated_list["supermarket_id"] == carrefour_id
    assert updated_list["tipo_descuento"] == "CART_TOTAL"
    assert Decimal(str(updated_list["descuento_general_porcentaje"])) == Decimal("10.00")

    # 5. Add items to test CART_TOTAL calculations
    # Item 1: $1000 x 2 = $2000 (no specific discount)
    await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={"nombre": "Galletitas", "precio_unitario": "1000.00", "cantidad": 2},
    )

    # Item 2: $2000 x 1 = $2000 with 20% item discount -> $1600
    await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/items",
        headers=headers,
        json={
            "nombre": "Vino Malbec",
            "precio_unitario": "2000.00",
            "cantidad": 1,
            "descuento_especifico_porcentaje": "20.00",
        },
    )

    # 6. Verify CART_TOTAL calculation
    # Subtotal bruto = 4000.00
    # Item 2 has specific 20% -> 1600.00
    # Item 1 has no specific discount -> eligible for cart discount: 2000.00 * 10% = 200.00
    # Total con descuentos = 1600.00 + 1800.00 = 3400.00
    # Monto descuento total = 4000.00 - 3400.00 = 600.00
    details_res = await client.get(f"/api/v1/finanzas/shopping/lists/{list_id}", headers=headers)
    assert details_res.status_code == 200
    details = details_res.json()
    assert Decimal(str(details["subtotal_bruto"])) == Decimal("4000.00")
    assert Decimal(str(details["total_con_descuentos"])) == Decimal("3400.00")
    assert Decimal(str(details["monto_descuento_total"])) == Decimal("600.00")
    assert Decimal(str(details["division_50_50"])) == Decimal("1700.00")

    # 7. Checkout with custom monto_total_pagado (e.g. slight difference on real receipt)
    checkout_res = await client.post(
        f"/api/v1/finanzas/shopping/lists/{list_id}/checkout",
        headers=headers,
        json={
            "category_id": cat_id,
            "descripcion": "Ticket Carrefour",
            "monto_total_pagado": "3425.50",
        },
    )
    assert checkout_res.status_code == 200, checkout_res.text
    tx = checkout_res.json()
    assert Decimal(str(tx["monto"])) == Decimal("3425.50")

    # 8. Send low stock items from inventory assigning supermarket_id
    loc_res = await client.post(
        "/api/v1/inventario/locations",
        headers=headers,
        json={"nombre": "Alacena Principal"},
    )
    assert loc_res.status_code == 201
    loc_id = loc_res.json()["id"]

    inv_item_res = await client.post(
        "/api/v1/inventario/items",
        headers=headers,
        json={
            "nombre": "Café Molido",
            "ubicacion_id": loc_id,
            "stock_minimo": 2,
            "stock_actual": 0,
        },
    )
    assert inv_item_res.status_code == 201
    inv_item_id = inv_item_res.json()["id"]

    send_res = await client.post(
        "/api/v1/inventario/send-to-shopping-list",
        headers=headers,
        json={
            "shopping_list_name": "Reposición Coto",
            "supermarket_id": coto_id,
            "items": [{"item_id": inv_item_id, "nombre": "Café Molido", "cantidad": 2}],
        },
    )
    assert send_res.status_code == 200, send_res.text
    coto_list = send_res.json()
    assert coto_list["supermarket_id"] == coto_id
    assert coto_list["tipo_descuento"] == "ITEM_BY_ITEM"
    assert Decimal(str(coto_list["descuento_general_porcentaje"])) == Decimal("15.00")
