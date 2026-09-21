import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_inventario_flow(client: AsyncClient):
    # 1. Register User & Household
    res_user = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "inventario_user@mypapps.com",
            "password": "password123",
            "nombre": "Pablo",
            "household_name": "Casa Inventario",
        },
    )
    assert res_user.status_code == 201, res_user.text
    token = res_user.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Location
    res_loc = await client.post(
        "/api/v1/inventario/locations",
        headers=headers,
        json={"nombre": "Despensa Cocina", "descripcion": "Estante de alimentos secos"},
    )
    assert res_loc.status_code == 201, res_loc.text
    loc_id = res_loc.json()["id"]

    # 3. Create Category
    res_cat = await client.post(
        "/api/v1/inventario/categories",
        headers=headers,
        json={"nombre": "Lácteos", "icono": "milk", "color": "sky"},
    )
    assert res_cat.status_code == 201, res_cat.text
    cat_id = res_cat.json()["id"]

    # 4. Create Item
    res_item = await client.post(
        "/api/v1/inventario/items",
        headers=headers,
        json={
            "nombre": "Leche Descremada 1L",
            "location_id": loc_id,
            "category_id": cat_id,
            "stock_actual": "3.00",
            "stock_minimo": "2.00",
            "unidad_medida": "unidades",
            "fecha_vencimiento": "2026-10-15",
        },
    )
    assert res_item.status_code == 201, res_item.text
    item_id = res_item.json()["id"]
    assert res_item.json()["es_stock_bajo"] is False

    # 5. Update Item
    res_up_item = await client.put(
        f"/api/v1/inventario/items/{item_id}",
        headers=headers,
        json={"nombre": "Leche Descremada La Serenísima 1L"},
    )
    assert res_up_item.status_code == 200, res_up_item.text
    assert res_up_item.json()["nombre"] == "Leche Descremada La Serenísima 1L"

    # 6. Consume 2 units -> Stock becomes 1.00 (Low Stock!)
    res_adjust = await client.patch(
        f"/api/v1/inventario/items/{item_id}/stock",
        headers=headers,
        json={"cantidad_cambio": "-2.00", "nota": "Consumo semanal"},
    )
    assert res_adjust.status_code == 200, res_adjust.text
    assert float(res_adjust.json()["stock_actual"]) == 1.0
    assert res_adjust.json()["es_stock_bajo"] is True

    # 7. Get Low Stock Items
    res_low = await client.get("/api/v1/inventario/low-stock", headers=headers)
    assert res_low.status_code == 200, res_low.text
    low_items = res_low.json()
    assert len(low_items) == 1

    # 8. Get Item Logs
    res_logs = await client.get(f"/api/v1/inventario/items/{item_id}/logs", headers=headers)
    assert res_logs.status_code == 200, res_logs.text
    logs = res_logs.json()
    assert len(logs) == 1
    assert float(logs[0]["cantidad_cambio"]) == -2.0
    assert logs[0]["user"]["nombre"] == "Pablo"

    # 9. Send Low Stock Item to Shopping List
    res_send = await client.post(
        "/api/v1/inventario/send-to-shopping-list",
        headers=headers,
        json={
            "shopping_list_name": "Compras de Reposición Faltantes",
            "items": [
                {"item_id": item_id, "nombre": "Leche Descremada La Serenísima 1L", "cantidad": 2}
            ],
        },
    )
    assert res_send.status_code == 200, res_send.text
    shop_list = res_send.json()
    assert shop_list["nombre"] == "Compras de Reposición Faltantes"
