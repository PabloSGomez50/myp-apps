import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_add_household_member_and_pre_register_flow(client: AsyncClient):
    # 1. Register Pablo
    res_pablo = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pablo_prereg@mypapps.com",
            "password": "password123",
            "pin": "1234",
            "nombre": "Pablo",
            "household_name": "Casa Pablo & Martu",
        },
    )
    assert res_pablo.status_code == 201
    pablo_data = res_pablo.json()
    token_pablo = pablo_data["access_token"]
    headers_pablo = {"Authorization": f"Bearer {token_pablo}"}

    # 2. Pablo adds Martu as pending household member
    res_add_member = await client.post(
        "/api/v1/core/household/members",
        headers=headers_pablo,
        json={"email": "martu_prereg@mypapps.com", "nombre": "Martu"},
    )
    assert res_add_member.status_code == 201
    household_info = res_add_member.json()
    assert len(household_info["members"]) == 2

    member_names = [m["user"]["nombre"] for m in household_info["members"]]
    assert "Pablo" in member_names
    assert "Martu" in member_names

    # 3. Martu registers with their email
    res_reg_martu = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "martu_prereg@mypapps.com",
            "password": "martupassword",
            "pin": "5678",
            "nombre": "Martu",
        },
    )
    assert res_reg_martu.status_code == 201
    martu_data = res_reg_martu.json()
    assert martu_data["household_id"] == pablo_data["household_id"]
    assert martu_data["user"]["nombre"] == "Martu"
