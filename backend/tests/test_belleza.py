"""Tests del módulo belleza: clientes, servicios, citas."""
import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from tests.conftest import login


async def auth_headers(client, setup):
    token = await login(client, setup["email"], setup["password"])
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_and_search_cliente(client: AsyncClient, bel_setup):
    h = await auth_headers(client, bel_setup)
    resp = await client.post("/belleza/clientes/", json={
        "nombre": "Lucía",
        "apellido": "Mendoza",
        "telefono": "0981-999888",
        "email": "lucia@bel.com",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "Lucía"

    list_resp = await client.get("/belleza/clientes/", headers=h)
    assert any(c["email"] == "lucia@bel.com" for c in list_resp.json())


@pytest.mark.asyncio
async def test_update_cliente(client: AsyncClient, bel_setup):
    h = await auth_headers(client, bel_setup)
    cli = (await client.post("/belleza/clientes/", json={"nombre": "Paula", "apellido": "Ruiz"}, headers=h)).json()

    resp = await client.patch(f"/belleza/clientes/{cli['id']}", json={"telefono": "0991-123456"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["telefono"] == "0991-123456"


@pytest.mark.asyncio
async def test_create_servicio(client: AsyncClient, bel_setup):
    h = await auth_headers(client, bel_setup)
    resp = await client.post("/belleza/servicios/", json={
        "nombre": "Corte de cabello",
        "precio": 50000,
        "duracion_minutos": 30,
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "Corte de cabello"


@pytest.mark.asyncio
async def test_create_cita_and_patch_estado(client: AsyncClient, bel_setup):
    h = await auth_headers(client, bel_setup)
    cli = (await client.post("/belleza/clientes/", json={"nombre": "Vera", "apellido": "Paz"}, headers=h)).json()
    srv = (await client.post("/belleza/servicios/", json={"nombre": "Manicure", "precio": 35000}, headers=h)).json()

    fecha = (datetime.now(tz=timezone.utc) + timedelta(hours=3)).isoformat()
    cita = (await client.post("/belleza/citas/", json={
        "cliente_id": cli["id"],
        "servicio_id": srv["id"],
        "fecha_hora": fecha,
    }, headers=h)).json()
    assert cita["estado"] == "pendiente"

    resp = await client.patch(f"/belleza/citas/{cita['id']}", json={
        "estado": "completada",
        "precio_cobrado": 35000,
    }, headers=h)
    assert resp.status_code == 200
    assert resp.json()["estado"] == "completada"


@pytest.mark.asyncio
async def test_rubro_guard_blocks_cross_module(client: AsyncClient, vet_setup):
    """Un usuario de veterinaria no puede acceder a endpoints de belleza."""
    h = await auth_headers(client, vet_setup)
    resp = await client.get("/belleza/clientes/", headers=h)
    assert resp.status_code == 403
