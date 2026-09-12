import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_transaction_crud_and_user_settlement(client: AsyncClient):
    # 1. Register Pablo
    res_pablo = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pablo_crud@mypapps.com",
            "password": "password123",
            "pin": "1234",
            "nombre": "Pablo",
            "household_name": "Casa CRUD Test",
        },
    )
    assert res_pablo.status_code == 201
    pablo_data = res_pablo.json()
    token_pablo = pablo_data["access_token"]
    household_id = pablo_data["household_id"]
    pablo_id = pablo_data["user"]["id"]
    headers_pablo = {"Authorization": f"Bearer {token_pablo}"}

    # 2. Register Martu in same household
    res_martu = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "martu_crud@mypapps.com",
            "password": "password123",
            "pin": "5678",
            "nombre": "Martu",
            "household_id": household_id,
        },
    )
    assert res_martu.status_code == 201
    martu_id = res_martu.json()["user"]["id"]

    # 3. Get Supermercado Category
    cats_res = await client.get("/api/v1/finanzas/categories", headers=headers_pablo)
    categories = cats_res.json()
    cat_super = next(c for c in categories if c["tipo_gasto"] == "VARIABLE_HOUSEHOLD")

    # 4. Create Transaction (Martu paid 20000 50/50)
    tx_res = await client.post(
        "/api/v1/finanzas/transactions/split",
        headers=headers_pablo,
        json={
            "user_id": martu_id,
            "category_id": cat_super["id"],
            "monto": 20000,
            "descripcion": "Supermercado Coto",
        },
    )
    assert tx_res.status_code == 201
    tx_data = tx_res.json()
    tx_id = tx_data["id"]
    assert float(tx_data["monto"]) == 20000

    # 5. Get List of Transactions
    tx_list_res = await client.get("/api/v1/finanzas/transactions", headers=headers_pablo)
    assert tx_list_res.status_code == 200
    assert len(tx_list_res.json()) >= 1

    # 6. Update Transaction (Change monto to 30000)
    update_res = await client.put(
        f"/api/v1/finanzas/transactions/{tx_id}",
        headers=headers_pablo,
        json={"monto": 30000, "descripcion": "Supermercado Coto Editado"},
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["monto"]) == 30000
    assert update_res.json()["descripcion"] == "Supermercado Coto Editado"

    # 7. Create User-to-User Settlement (Pablo pays Martu 15000)
    settle_res = await client.post(
        "/api/v1/finanzas/transactions/settlement",
        headers=headers_pablo,
        json={
            "source_user_id": pablo_id,
            "target_user_id": martu_id,
            "monto": 15000,
            "descripcion": "Devolución por MercadoPago",
        },
    )
    assert settle_res.status_code == 201
    assert settle_res.json()["tipo"] == "SETTLEMENT"

    # 8. Delete Transaction
    del_res = await client.delete(f"/api/v1/finanzas/transactions/{tx_id}", headers=headers_pablo)
    assert del_res.status_code == 204

    # 9. Bulk Delete Transactions with specific IDs
    bulk_del_res = await client.post(
        "/api/v1/finanzas/transactions/bulk-delete",
        headers=headers_pablo,
        json={"ids": [settle_res.json()["id"]]},
    )
    assert bulk_del_res.status_code == 200
    assert bulk_del_res.json()["deleted_count"] == 1

    # 10. Delete All Remaining Transactions for Household
    del_all_res = await client.delete("/api/v1/finanzas/transactions/all", headers=headers_pablo)
    assert del_all_res.status_code == 204

    tx_empty_res = await client.get("/api/v1/finanzas/transactions", headers=headers_pablo)
    assert tx_empty_res.status_code == 200
    assert len(tx_empty_res.json()) == 0
