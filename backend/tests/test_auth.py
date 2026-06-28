"""Tests de autenticación: register, login, me, refresh."""
import pytest
from httpx import AsyncClient
from tests.conftest import login


@pytest.mark.asyncio
async def test_register_creates_org_and_user(client: AsyncClient):
    resp = await client.post("/auth/register", json={
        "org_nombre": "Clínica Test",
        "rubro": "veterinaria",
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@test.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["email"] == "juan@test.com"
    assert data["rol"] == "org_admin"


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    payload = {
        "org_nombre": "Org A",
        "rubro": "belleza",
        "nombre": "Ana",
        "apellido": "López",
        "email": "dup@test.com",
        "password": "Test1234!",
    }
    r1 = await client.post("/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/auth/register", json={**payload, "org_nombre": "Org B"})
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_login_returns_tokens(client: AsyncClient, vet_setup):
    token = await login(client, vet_setup["email"], vet_setup["password"])
    assert len(token) > 10


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, vet_setup):
    resp = await client.post(
        "/auth/login",
        data={"username": vet_setup["email"], "password": "wrong"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_returns_current_user(client: AsyncClient, vet_setup):
    token = await login(client, vet_setup["email"], vet_setup["password"])
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == vet_setup["email"]


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
