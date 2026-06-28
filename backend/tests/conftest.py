"""
Fixtures globales para tests de integración.
Usa PostgreSQL real — no mocks.

Diseño: cada test recrea el schema con SQL puro (DROP SCHEMA CASCADE / CREATE
SCHEMA), evitando completamente las consultas a pg_catalog que hacen que
asyncpg lance InterfaceError. create_all usa checkfirst=False porque el
schema ya está vacío. Sin teardown drop — el próximo test lo resetea.
"""
import os
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.database import Base, get_db
import main as app_module


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rubro:rubro_dev@localhost:5432/rubro_test",
)


@pytest_asyncio.fixture
async def client():
    """
    HTTP client por test.

    Resetea el schema con SQL puro (sin pg_catalog introspection) y crea
    las tablas con checkfirst=False. La dependencia get_db genera sesiones
    propias que commiten igual que en producción.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Reset schema limpio — evita run_sync(drop_all) que usa pg_catalog
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))

    # Crear tablas sin introspección (schema vacío, checkfirst innecesario)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=False)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with Session() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    app_module.app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app_module.app),
        base_url="http://test",
    ) as ac:
        yield ac

    app_module.app.dependency_overrides.clear()
    await engine.dispose()
    # No hace falta DROP aquí — el próximo setUp ya hace DROP SCHEMA CASCADE


async def login(client: AsyncClient, email: str, password: str = "Test1234!") -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed ({email}): {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def vet_setup(client):
    resp = await client.post("/auth/register", json={
        "org_nombre": "Vet Test",
        "rubro": "veterinaria",
        "nombre": "Test",
        "apellido": "Admin",
        "email": "vet@test.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 201, f"vet_setup register failed: {resp.text}"
    return {"email": "vet@test.com", "password": "Test1234!"}


@pytest_asyncio.fixture
async def bel_setup(client):
    resp = await client.post("/auth/register", json={
        "org_nombre": "Bel Test",
        "rubro": "belleza",
        "nombre": "Test",
        "apellido": "Admin",
        "email": "bel@test.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 201, f"bel_setup register failed: {resp.text}"
    return {"email": "bel@test.com", "password": "Test1234!"}


@pytest_asyncio.fixture
async def rop_setup(client):
    resp = await client.post("/auth/register", json={
        "org_nombre": "Rop Test",
        "rubro": "roperia",
        "nombre": "Test",
        "apellido": "Admin",
        "email": "rop@test.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 201, f"rop_setup register failed: {resp.text}"
    return {"email": "rop@test.com", "password": "Test1234!"}
