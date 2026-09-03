import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_csv_parse_and_bulk_import_flow(client: AsyncClient):
    # 1. Register Pablo
    res_pablo = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pablo_csv@mypapps.com",
            "password": "password123",
            "pin": "1234",
            "nombre": "Pablo",
            "household_name": "Casa CSV Test",
        },
    )
    assert res_pablo.status_code == 201
    pablo_data = res_pablo.json()
    token_pablo = pablo_data["access_token"]
    household_id = pablo_data["household_id"]
    pablo_id = pablo_data["user"]["id"]
    headers_pablo = {"Authorization": f"Bearer {token_pablo}"}

    # 2. Register Martu
    res_martu = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "martu_csv@mypapps.com",
            "password": "password123",
            "pin": "5678",
            "nombre": "Martu",
            "household_id": household_id,
        },
    )
    assert res_martu.status_code == 201
    martu_id = res_martu.json()["user"]["id"]

    # 3. Create Custom Category Mapping for "coto"
    cats_res = await client.get("/api/v1/finanzas/categories", headers=headers_pablo)
    assert cats_res.status_code == 200
    categories = cats_res.json()
    cat_super = next(c for c in categories if c["tipo_gasto"] == "VARIABLE_HOUSEHOLD")

    map_res = await client.post(
        "/api/v1/finanzas/category-mappings",
        headers=headers_pablo,
        json={"patron": "coto", "category_id": cat_super["id"]},
    )
    assert map_res.status_code == 201

    # 4. Parse CSV Content
    csv_content = """Fecha,Concepto,Monto,Quien Pago
12/6/2026,Coto,"151312,32",Martu
13/6/2026,Verduleria,9400,Pablo
14/6/2026,Rapanui,11680,Martu
"""
    files = {"file": ("test.csv", csv_content.encode("utf-8"), "text/csv")}
    parse_res = await client.post(
        "/api/v1/finanzas/transactions/parse-csv",
        headers=headers_pablo,
        files=files,
    )
    assert parse_res.status_code == 200, parse_res.text
    parse_data = parse_res.json()
    assert parse_data["total_rows"] == 3
    assert parse_data["unmatched_users"] == 0

    rows = parse_data["rows"]
    assert rows[0]["concepto"] == "Coto"
    assert rows[0]["monto"] == 151312.32
    assert rows[0]["user_name"] == "Martu"
    assert rows[0]["category_matched"] is True

    # 5. Bulk Import
    bulk_payload = {
        "rows": [
            {
                "fecha": "2026-06-12T00:00:00Z",
                "concepto": "Coto",
                "monto": 151312.32,
                "user_id": martu_id,
                "category_id": cat_super["id"],
                "es_compartido": True,
            },
            {
                "fecha": "2026-06-13T00:00:00Z",
                "concepto": "Verduleria",
                "monto": 9400.00,
                "user_id": pablo_id,
                "category_id": cat_super["id"],
                "es_compartido": True,
            },
        ],
        "new_mappings": [],
    }

    import_res = await client.post(
        "/api/v1/finanzas/transactions/bulk-import",
        headers=headers_pablo,
        json=bulk_payload,
    )
    assert import_res.status_code == 201, import_res.text
    assert import_res.json()["imported_count"] == 2

    # 6. Verify Couple Balance (Martu paid 151312.32, Pablo paid 9400 -> Net balance)
    bal_res = await client.get("/api/v1/finanzas/balance/couple-net", headers=headers_pablo)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()
    # Pablo owes Martu (151312.32 - 9400)/2 = 70956.16
    assert float(bal_data["net_balance"]) < 0
