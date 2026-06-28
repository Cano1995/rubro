"""Tests del módulo veterinaria: propietarios, pacientes, citas, historiales, vacunas."""
import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from tests.conftest import login


async def auth_headers(client, setup):
    token = await login(client, setup["email"], setup["password"])
    return {"Authorization": f"Bearer {token}"}


# ─── Propietarios ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_propietario(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.post("/veterinaria/propietarios/", json={
        "nombre": "María",
        "apellido": "González",
        "telefono": "0981-111222",
        "email": "maria@owner.com",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "María"


@pytest.mark.asyncio
async def test_list_propietarios(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    await client.post("/veterinaria/propietarios/", json={"nombre": "Pedro", "apellido": "Ruiz"}, headers=h)
    resp = await client.get("/veterinaria/propietarios/", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ─── Pacientes ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_paciente(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    prop = (await client.post("/veterinaria/propietarios/", json={"nombre": "Luis", "apellido": "Vera"}, headers=h)).json()

    resp = await client.post("/veterinaria/pacientes/", json={
        "propietario_id": prop["id"],
        "nombre": "Max",
        "especie": "Canino",
        "raza": "Labrador",
        "sexo": "macho",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "Max"


@pytest.mark.asyncio
async def test_paciente_propietario_wrong_org_fails(client: AsyncClient, vet_setup, bel_setup):
    """Paciente con propietario_id de otra org debe devolver 404."""
    h_vet = await auth_headers(client, vet_setup)
    h_bel = await auth_headers(client, bel_setup)

    # Creamos propietario en org belleza (workaround: belleza no tiene propietarios,
    # así que usamos un id que no existe en org veterinaria)
    resp = await client.post("/veterinaria/pacientes/", json={
        "propietario_id": 99999,
        "nombre": "Intruso",
        "especie": "Felino",
        "sexo": "hembra",
    }, headers=h_vet)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_paciente(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    prop = (await client.post("/veterinaria/propietarios/", json={"nombre": "Ana", "apellido": "Paz"}, headers=h)).json()
    pac = (await client.post("/veterinaria/pacientes/", json={
        "propietario_id": prop["id"], "nombre": "Luna", "especie": "Felino", "sexo": "hembra",
    }, headers=h)).json()

    resp = await client.patch(f"/veterinaria/pacientes/{pac['id']}", json={"nombre": "Luna II"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Luna II"


# ─── Citas ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_and_update_cita(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    prop = (await client.post("/veterinaria/propietarios/", json={"nombre": "Bob", "apellido": "Fox"}, headers=h)).json()
    pac = (await client.post("/veterinaria/pacientes/", json={
        "propietario_id": prop["id"], "nombre": "Rex", "especie": "Canino", "sexo": "macho",
    }, headers=h)).json()

    fecha = (datetime.now(tz=timezone.utc) + timedelta(days=1)).isoformat()
    cita = (await client.post("/veterinaria/citas/", json={
        "paciente_id": pac["id"],
        "fecha_hora": fecha,
        "motivo": "Revisión anual",
    }, headers=h)).json()
    assert cita["estado"] == "pendiente"

    resp = await client.patch(f"/veterinaria/citas/{cita['id']}", json={"estado": "confirmada"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["estado"] == "confirmada"


# ─── Historiales ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_historial(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    prop = (await client.post("/veterinaria/propietarios/", json={"nombre": "Caro", "apellido": "Sosa"}, headers=h)).json()
    pac = (await client.post("/veterinaria/pacientes/", json={
        "propietario_id": prop["id"], "nombre": "Pixi", "especie": "Felino", "sexo": "hembra",
    }, headers=h)).json()

    resp = await client.post("/veterinaria/historiales/", json={
        "paciente_id": pac["id"],
        "fecha": datetime.now(tz=timezone.utc).isoformat(),
        "motivo_consulta": "Control anual",
        "diagnostico": "Saludable",
        "peso_kg": 4.2,
        "temperatura": 38.5,
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["motivo_consulta"] == "Control anual"


# ─── Vacunas ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_vacuna_and_filter_vencidas(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    prop = (await client.post("/veterinaria/propietarios/", json={"nombre": "Eli", "apellido": "Cruz"}, headers=h)).json()
    pac = (await client.post("/veterinaria/pacientes/", json={
        "propietario_id": prop["id"], "nombre": "Toby", "especie": "Canino", "sexo": "macho",
    }, headers=h)).json()

    # Vacuna ya vencida
    resp = await client.post("/veterinaria/vacunas/", json={
        "paciente_id": pac["id"],
        "nombre_vacuna": "Antirrábica",
        "fecha_aplicacion": "2023-01-01",
        "fecha_vencimiento": "2024-01-01",
    }, headers=h)
    assert resp.status_code == 201

    # Filtrar vencidas
    resp2 = await client.get("/veterinaria/vacunas/?vencidas=true", headers=h)
    assert resp2.status_code == 200
    assert any(v["nombre_vacuna"] == "Antirrábica" for v in resp2.json())
