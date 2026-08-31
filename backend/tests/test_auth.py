import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register Pablo
    register_payload = {
        "email": "pablo@mypapps.com",
        "password": "password123",
        "pin": "1234",
        "nombre": "Pablo",
        "color_avatar": "#16a34a",
        "household_name": "Casa Pablo & Pareja",
    }
    res = await client.post("/api/v1/auth/register", json=register_payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["nombre"] == "Pablo"
    assert data["household_id"] is not None

    # 2. Login with valid credentials
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "pablo@mypapps.com", "password": "password123"},
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["email"] == "pablo@mypapps.com"


@pytest.mark.asyncio
async def test_switch_profile_with_pin(client: AsyncClient):
    # Register Pablo
    res_pablo = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pablo_pin@mypapps.com",
            "password": "password123",
            "pin": "1111",
            "nombre": "Pablo",
            "household_name": "Casa Test",
        },
    )
    assert res_pablo.status_code == 201, res_pablo.text
    token_pablo = res_pablo.json()["access_token"]

    # Register Partner
    res_partner = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pareja_pin@mypapps.com",
            "password": "password123",
            "pin": "2222",
            "nombre": "Pareja",
        },
    )
    assert res_partner.status_code == 201, res_partner.text
    partner_id = res_partner.json()["user"]["id"]

    # Switch from Pablo to Partner with PIN
    switch_res = await client.post(
        "/api/v1/auth/switch-profile",
        headers={"Authorization": f"Bearer {token_pablo}"},
        json={"target_user_id": partner_id, "pin": "2222"},
    )
    assert switch_res.status_code == 200, switch_res.text
    switch_data = switch_res.json()
    assert switch_data["user"]["nombre"] == "Pareja"

    # Switch with wrong PIN
    bad_pin_res = await client.post(
        "/api/v1/auth/switch-profile",
        headers={"Authorization": f"Bearer {token_pablo}"},
        json={"target_user_id": partner_id, "pin": "9999"},
    )
    assert bad_pin_res.status_code == 401
