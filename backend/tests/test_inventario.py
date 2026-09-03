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

    # 3. Create Item
    res_item = await client.post(
        "/api/v1/inventario/items",
        headers=headers,
        json={
            "nombre": "Leche Descremada 1L",
            "location_id": loc_id,
            "stock_actual": "3.00",
            "stock_minimo": "2.00",
            "unidad_medida": "unidades",
        },
    )
    assert res_item.status_code == 201, res_item.text
    item_id = res_item.json()["id"]
    assert res_item.json()["es_stock_bajo"] is False

    # 4. Consume 2 units -> Stock becomes 1.00 (Low Stock!)
    res_adjust = await client.patch(
        f"/api/v1/inventario/items/{item_id}/stock",
        headers=headers,
        json={"cantidad_cambio": "-2.00", "nota": "Consumo semanal"},
    )
    assert res_adjust.status_code == 200, res_adjust.text
    assert float(res_adjust.json()["stock_actual"]) == 1.0
    assert res_adjust.json()["es_stock_bajo"] is True

    # 5. Get Low Stock Items
    res_low = await client.get("/api/v1/inventario/low-stock", headers=headers)
    assert res_low.status_code == 200, res_low.text
    low_items = res_low.json()
    assert len(low_items) == 1
    assert low_items[0]["nombre"] == "Leche Descremada 1L"
