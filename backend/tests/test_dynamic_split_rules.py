import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dynamic_split_rules_and_retroactive_recalculation(client: AsyncClient):
    # 1. Register User 1
    u1_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "pablo_split@mypapps.com", "password": "password123", "nombre": "Pablo"},
    )
    assert u1_res.status_code == 201, u1_res.text
    token1 = u1_res.json()["access_token"]
    u1_id = u1_res.json()["user"]["id"]
    household_id = u1_res.json()["household_id"]
    auth_headers = {"Authorization": f"Bearer {token1}"}

    # 2. Register User 2 in the same household
    u2_res = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "martu_split@mypapps.com",
            "password": "password123",
            "nombre": "Martu",
            "household_id": household_id,
        },
    )
    assert u2_res.status_code == 201, u2_res.text
    u2_id = u2_res.json()["user"]["id"]

    # 2. Query default split for 2026/10 (should be SYSTEM_DEFAULT 50/50)
    eff_res = await client.get("/api/v1/finanzas/split-rules/2026/10", headers=auth_headers)
    assert eff_res.status_code == 200
    eff_data = eff_res.json()
    assert eff_data["source"] in ("SYSTEM_DEFAULT", "HOUSEHOLD_DEFAULT")
    assert eff_data["user_ratios"][u1_id] == 0.5
    assert eff_data["user_ratios"][u2_id] == 0.5

    # 3. Create categories: Fixed Household & Leisure Couple
    cat_fixed_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=auth_headers,
        json={
            "nombre": "Alquiler y Expensas",
            "tipo_gasto": "FIXED_HOUSEHOLD",
            "color": "#10b981",
        },
    )
    assert cat_fixed_res.status_code == 201
    cat_fixed_id = cat_fixed_res.json()["id"]

    cat_leisure_res = await client.post(
        "/api/v1/finanzas/categories",
        headers=auth_headers,
        json={
            "nombre": "Salidas y Cenas",
            "tipo_gasto": "LEISURE_COUPLE",
            "color": "#ec4899",
        },
    )
    assert cat_leisure_res.status_code == 201
    cat_leisure_id = cat_leisure_res.json()["id"]

    # 4. Create shared expenses in 2026/10 paid by User 1 (Pablo)
    # 4a. Fixed expense $1000
    tx1_res = await client.post(
        "/api/v1/finanzas/transactions",
        headers=auth_headers,
        json={
            "user_id": u1_id,
            "category_id": cat_fixed_id,
            "tipo": "EXPENSE",
            "monto": 1000.0,
            "descripcion": "Expensas Octubre",
            "es_compartido": True,
            "fecha": "2026-10-05T12:00:00Z",
        },
    )
    assert tx1_res.status_code == 201
    tx1_id = tx1_res.json()["id"]
    assert float(tx1_res.json()["split_ratio"]) == 0.50

    # 4b. Leisure expense $1000
    tx_leisure_res = await client.post(
        "/api/v1/finanzas/transactions",
        headers=auth_headers,
        json={
            "user_id": u1_id,
            "category_id": cat_leisure_id,
            "tipo": "EXPENSE",
            "monto": 1000.0,
            "descripcion": "Cena Rapanui",
            "es_compartido": True,
            "fecha": "2026-10-06T12:00:00Z",
        },
    )
    assert tx_leisure_res.status_code == 201
    tx_leisure_id = tx_leisure_res.json()["id"]
    assert float(tx_leisure_res.json()["split_ratio"]) == 0.50

    # 5. Create a monthly split rule for 2026/10 ONLY for FIXED_HOUSEHOLD: User 1: 70%, User 2: 30%
    rule_res = await client.post(
        "/api/v1/finanzas/split-rules",
        headers=auth_headers,
        json={
            "year": 2026,
            "month": 10,
            "user_ratios": {
                u1_id: 0.70,
                u2_id: 0.30,
            },
            "applicable_expense_types": ["FIXED_HOUSEHOLD"],
        },
    )
    assert rule_res.status_code == 201
    rule_id = rule_res.json()["id"]
    assert rule_res.json()["user_ratios"][u1_id] == 0.70
    assert rule_res.json()["applicable_expense_types"] == ["FIXED_HOUSEHOLD"]

    # 6. Verify tx1 (Fixed) split_ratio was retroactively updated to 0.30 (what Martu owes Pablo)
    # AND verify tx_leisure (Leisure) remained at 0.50 (not included in applicable_expense_types)!
    txs_res = await client.get("/api/v1/finanzas/transactions", headers=auth_headers)
    assert txs_res.status_code == 200
    tx1_reloaded = next(t for t in txs_res.json() if t["id"] == tx1_id)
    assert float(tx1_reloaded["split_ratio"]) == 0.30

    tx_leisure_reloaded = next(t for t in txs_res.json() if t["id"] == tx_leisure_id)
    assert float(tx_leisure_reloaded["split_ratio"]) == 0.50

    # 7. Create another shared expense in 2026/10 paid by User 2 (Martu) in FIXED_HOUSEHOLD
    tx2_res = await client.post(
        "/api/v1/finanzas/transactions",
        headers=auth_headers,
        json={
            "user_id": u2_id,
            "category_id": cat_fixed_id,
            "tipo": "EXPENSE",
            "monto": 1000.0,
            "descripcion": "Internet Octubre",
            "es_compartido": True,
            "fecha": "2026-10-10T12:00:00Z",
        },
    )
    assert tx2_res.status_code == 201
    # For Martu's fixed transaction, Pablo owes 70% to Martu -> split_ratio must be 0.70
    assert float(tx2_res.json()["split_ratio"]) == 0.70

    # 8. Verify Couple Net Balance calculation:
    # - tx1 (Pablo paid $1000 fixed, Martu owes 30%): +$300 for Pablo
    # - tx_leisure (Pablo paid $1000 leisure, Martu owes 50%): +$500 for Pablo
    # - tx2 (Martu paid $1000 fixed, Pablo owes 70%): -$700 for Pablo
    # Net balance for Pablo: +300 + 500 - 700 = +$100.00 (Martu te adeuda $100.00)
    bal_res = await client.get("/api/v1/finanzas/balance/couple-net", headers=auth_headers)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()
    assert float(bal_data["net_balance"]) == 100.00

    # 9. Test Suggest Split from Incomes
    # Add income for User 1 ($1,500,000) and User 2 ($500,000) in 2026/11
    inc1 = await client.post(
        "/api/v1/finanzas/transactions",
        headers=auth_headers,
        json={
            "user_id": u1_id,
            "tipo": "INCOME",
            "monto": 1500000.0,
            "descripcion": "Sueldo Pablo",
            "es_compartido": False,
            "fecha": "2026-11-01T12:00:00Z",
        },
    )
    assert inc1.status_code == 201

    inc2 = await client.post(
        "/api/v1/finanzas/transactions",
        headers=auth_headers,
        json={
            "user_id": u2_id,
            "tipo": "INCOME",
            "monto": 500000.0,
            "descripcion": "Sueldo Martu",
            "es_compartido": False,
            "fecha": "2026-11-01T12:00:00Z",
        },
    )
    assert inc2.status_code == 201

    sug_res = await client.get("/api/v1/finanzas/split-rules/suggest/2026/11", headers=auth_headers)
    assert sug_res.status_code == 200
    sug_data = sug_res.json()
    assert sug_data["is_sufficient"] is True
    assert sug_data["suggested_ratios"][u1_id] == 0.75
    assert sug_data["suggested_ratios"][u2_id] == 0.25

    # 10. Test Household Default Split Update
    hh_update_res = await client.put(
        "/api/v1/finanzas/household-split-default",
        headers=auth_headers,
        json={
            "default_split_ratios": {
                u1_id: 0.60,
                u2_id: 0.40,
            }
        },
    )
    assert hh_update_res.status_code == 200

    # 11. Delete monthly rule and verify fallback
    del_res = await client.delete(f"/api/v1/finanzas/split-rules/{rule_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Re-check tx1 split_ratio after rule deletion: should fallback to household default (Martu owes 40%)
    txs_res2 = await client.get("/api/v1/finanzas/transactions", headers=auth_headers)
    tx1_final = next(t for t in txs_res2.json() if t["id"] == tx1_id)
    assert float(tx1_final["split_ratio"]) == 0.40
