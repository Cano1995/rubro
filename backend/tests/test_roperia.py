"""Tests del módulo ropería: categorías, productos, ventas (POS)."""
import pytest
from httpx import AsyncClient
from tests.conftest import login


async def auth_headers(client, setup):
    token = await login(client, setup["email"], setup["password"])
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_categoria(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    resp = await client.post("/roperia/categorias/", json={"nombre": "Camisas"}, headers=h)
    assert resp.status_code == 201
    assert resp.json()["nombre"] == "Camisas"


@pytest.mark.asyncio
async def test_update_categoria(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    cat = (await client.post("/roperia/categorias/", json={"nombre": "Jeans"}, headers=h)).json()
    resp = await client.patch(f"/roperia/categorias/{cat['id']}", json={"nombre": "Pantalones"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Pantalones"


@pytest.mark.asyncio
async def test_create_producto(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    resp = await client.post("/roperia/productos/", json={
        "nombre": "Camisa Oxford Azul",
        "precio_venta": 85000,
        "stock": 10,
        "stock_minimo": 3,
    }, headers=h)
    assert resp.status_code == 201
    data = resp.json()
    assert data["stock"] == 10


@pytest.mark.asyncio
async def test_bajo_stock_endpoint(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    await client.post("/roperia/productos/", json={
        "nombre": "Producto Escaso",
        "precio_venta": 50000,
        "stock": 1,
        "stock_minimo": 5,
    }, headers=h)

    resp = await client.get("/roperia/productos/bajo-stock", headers=h)
    assert resp.status_code == 200
    assert any(p["nombre"] == "Producto Escaso" for p in resp.json())


@pytest.mark.asyncio
async def test_venta_pos_descuenta_stock(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    prod = (await client.post("/roperia/productos/", json={
        "nombre": "Jean Negro",
        "precio_venta": 120000,
        "stock": 5,
        "stock_minimo": 1,
    }, headers=h)).json()

    resp = await client.post("/roperia/ventas/", json={
        "items": [{"producto_id": prod["id"], "cantidad": 2}],
        "metodo_pago": "efectivo",
    }, headers=h)
    assert resp.status_code == 201
    assert resp.json()["total"] == 240000

    # Verificar stock descontado
    prod_resp = await client.get("/roperia/productos/", headers=h)
    updated = next(p for p in prod_resp.json() if p["id"] == prod["id"])
    assert updated["stock"] == 3


@pytest.mark.asyncio
async def test_venta_sin_stock_falla(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    prod = (await client.post("/roperia/productos/", json={
        "nombre": "Agotado",
        "precio_venta": 50000,
        "stock": 0,
        "stock_minimo": 0,
    }, headers=h)).json()

    resp = await client.post("/roperia/ventas/", json={
        "items": [{"producto_id": prod["id"], "cantidad": 1}],
        "metodo_pago": "tarjeta",
    }, headers=h)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_update_producto(client: AsyncClient, rop_setup):
    h = await auth_headers(client, rop_setup)
    prod = (await client.post("/roperia/productos/", json={
        "nombre": "Cinturón",
        "precio_venta": 45000,
        "stock": 10,
        "stock_minimo": 2,
    }, headers=h)).json()

    resp = await client.patch(f"/roperia/productos/{prod['id']}", json={"precio_venta": 50000}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["precio_venta"] == 50000
