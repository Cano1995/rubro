"""Tests del módulo de facturación: clientes, facturas, pagos, configuración."""
import pytest
from httpx import AsyncClient
from tests.conftest import login


async def auth_headers(client, setup):
    token = await login(client, setup["email"], setup["password"])
    return {"Authorization": f"Bearer {token}"}


ITEM_BASICO = {
    "descripcion": "Consulta veterinaria",
    "cantidad": 1,
    "precio_unitario": 110000,
    "tasa_iva": "IVA_10",
    "precio_incluye_iva": True,
}


@pytest.mark.asyncio
async def test_config_default(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.get("/facturacion/config/", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["codigo_establecimiento"] == "001"
    assert data["punto_expedicion"] == "001"
    assert data["tasa_iva_default"] == "IVA_10"
    assert data["precio_incluye_iva"] is True
    assert data["timbrado"] is None


@pytest.mark.asyncio
async def test_update_config(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.put("/facturacion/config/", json={
        "codigo_establecimiento": "002",
        "punto_expedicion": "001",
        "timbrado": "12345678",
        "ruc": "80012345-1",
        "razon_social": "Veterinaria Test S.A.",
    }, headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert data["codigo_establecimiento"] == "002"
    assert data["timbrado"] == "12345678"
    assert data["ruc"] == "80012345-1"


@pytest.mark.asyncio
async def test_crear_cliente(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.post("/facturacion/clientes/", json={
        "nombre": "Juan Pérez",
        "ruc": "1234567-8",
        "email": "juan@test.com",
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["nombre"] == "Juan Pérez"
    assert data["activo"] is True


@pytest.mark.asyncio
async def test_crear_factura_iva10_incluye(client: AsyncClient, vet_setup):
    """Precio incluye IVA 10%: 110000 bruto → base 100000, iva 10000."""
    h = await auth_headers(client, vet_setup)
    resp = await client.post("/facturacion/facturas/", json={
        "items": [ITEM_BASICO],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["total_general"] == 110000.0
    assert data["total_iva10"] == 10000.0
    assert data["total_base"] == 100000.0
    assert data["estado"] == "pendiente"
    # Formato paraguayo: XXX-YYY-NNNNNNN
    import re
    assert re.match(r'^\d{3}-\d{3}-\d{7}$', data["numero"]), f"Número inválido: {data['numero']}"
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_crear_factura_sin_incluir_iva(client: AsyncClient, vet_setup):
    """Precio NO incluye IVA 10%: 100000 base → monto_iva 10000, total 110000."""
    h = await auth_headers(client, vet_setup)
    resp = await client.post("/facturacion/facturas/", json={
        "items": [{
            "descripcion": "Vacuna antirrábica",
            "cantidad": 1,
            "precio_unitario": 100000,
            "tasa_iva": "IVA_10",
            "precio_incluye_iva": False,
        }],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["total_general"] == 110000.0
    assert data["total_iva10"] == 10000.0
    assert data["total_base"] == 100000.0


@pytest.mark.asyncio
async def test_numeracion_correlativa(client: AsyncClient, vet_setup):
    """Dos facturas consecutivas deben terminar en 0000001 y 0000002."""
    h = await auth_headers(client, vet_setup)
    f1 = (await client.post("/facturacion/facturas/", json={"items": [ITEM_BASICO]}, headers=h)).json()
    f2 = (await client.post("/facturacion/facturas/", json={"items": [ITEM_BASICO]}, headers=h)).json()
    assert f1["numero"].endswith("-0000001"), f"Esperado xxx-xxx-0000001, got {f1['numero']}"
    assert f2["numero"].endswith("-0000002"), f"Esperado xxx-xxx-0000002, got {f2['numero']}"
    # La parte de establecimiento/expedición por defecto es 001-001
    assert f1["numero"] == "001-001-0000001"
    assert f2["numero"] == "001-001-0000002"


@pytest.mark.asyncio
async def test_registrar_pago_marca_pagada(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    factura = (await client.post("/facturacion/facturas/", json={"items": [ITEM_BASICO]}, headers=h)).json()
    fid = factura["id"]

    resp = await client.post(f"/facturacion/facturas/{fid}/pagos", json={
        "monto": 110000,
        "metodo_pago": "efectivo",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["estado"] == "pagada"
    assert len(resp.json()["pagos"]) == 1


@pytest.mark.asyncio
async def test_pago_parcial_no_marca_pagada(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    factura = (await client.post("/facturacion/facturas/", json={"items": [ITEM_BASICO]}, headers=h)).json()
    fid = factura["id"]

    resp = await client.post(f"/facturacion/facturas/{fid}/pagos", json={
        "monto": 50000,
        "metodo_pago": "transferencia",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["estado"] == "pendiente"


@pytest.mark.asyncio
async def test_cancelar_factura(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    factura = (await client.post("/facturacion/facturas/", json={"items": [ITEM_BASICO]}, headers=h)).json()
    fid = factura["id"]

    resp = await client.post(f"/facturacion/facturas/{fid}/cancelar", headers=h)
    assert resp.status_code == 200
    assert resp.json()["estado"] == "cancelada"

    # No se puede cancelar dos veces
    resp2 = await client.post(f"/facturacion/facturas/{fid}/cancelar", headers=h)
    assert resp2.status_code == 400


@pytest.mark.asyncio
async def test_exento_no_suma_iva(client: AsyncClient, vet_setup):
    h = await auth_headers(client, vet_setup)
    resp = await client.post("/facturacion/facturas/", json={
        "items": [{
            "descripcion": "Medicamento exento",
            "cantidad": 2,
            "precio_unitario": 50000,
            "tasa_iva": "EXENTO",
            "precio_incluye_iva": True,
        }],
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["total_exento"] == 100000.0
    assert data["total_iva10"] == 0.0
    assert data["total_iva5"] == 0.0
    assert data["total_general"] == 100000.0
