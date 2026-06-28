"""Tests del dashboard adaptativo por rubro."""
import pytest
from httpx import AsyncClient
from tests.conftest import login


async def auth_headers(client, setup):
    token = await login(client, setup["email"], setup["password"])
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_dashboard_veterinaria(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.get("/dashboard/", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "pacientes_total" in data or "citas_hoy" in data


@pytest.mark.asyncio
async def test_dashboard_belleza(client: AsyncClient, bel_setup):
    h = await auth_headers(client, bel_setup)
    resp = await client.get("/dashboard/", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "clientes_total" in data or "citas_hoy" in data


@pytest.mark.asyncio
async def test_dashboard_roperia(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    resp = await client.get("/dashboard/", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "productos_total" in data or "ventas_hoy" in data
