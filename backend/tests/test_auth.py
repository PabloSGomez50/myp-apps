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
        "household_name": "Casa Pablo & Martu",
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

    # Register Partner Martu
    res_partner = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "martu_pin@mypapps.com",
            "password": "password123",
            "pin": "2222",
            "nombre": "Martu",
        },
    )
    assert res_partner.status_code == 201, res_partner.text
    partner_id = res_partner.json()["user"]["id"]

    # Switch from Pablo to Martu with PIN
    switch_res = await client.post(
        "/api/v1/auth/switch-profile",
        headers={"Authorization": f"Bearer {token_pablo}"},
        json={"target_user_id": partner_id, "pin": "2222"},
    )
    assert switch_res.status_code == 200, switch_res.text
    switch_data = switch_res.json()
    assert switch_data["user"]["nombre"] == "Martu"

    # Switch with wrong PIN
    bad_pin_res = await client.post(
        "/api/v1/auth/switch-profile",
        headers={"Authorization": f"Bearer {token_pablo}"},
        json={"target_user_id": partner_id, "pin": "9999"},
    )
    assert bad_pin_res.status_code == 401


@pytest.mark.asyncio
async def test_update_user_color(client: AsyncClient):
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "user_color@mypapps.com",
            "password": "password123",
            "nombre": "ColorUser",
            "color_avatar": "#16a34a",
        },
    )
    assert reg.status_code == 201
    user_id = reg.json()["user"]["id"]
    token = reg.json()["access_token"]

    update_res = await client.put(
        f"/api/v1/core/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"color_avatar": "#8b5cf6"},
    )
    assert update_res.status_code == 200, update_res.text
    assert update_res.json()["color_avatar"] == "#8b5cf6"

