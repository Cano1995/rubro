"""
Fixtures globales para tests de integración.
Usa PostgreSQL real — no mocks.
Requiere: TEST_DATABASE_URL en el entorno.

Diseño: cada test recibe un AsyncClient con su PROPIA fábrica de sesiones
(cada request HTTP genera una sesión nueva y la cierra al terminar).
No se comparte ninguna sesión entre fixtures — así evitamos el
InterfaceError de asyncpg por operaciones concurrentes en la misma conexión.
Entre test y test, un fixture autouse trunca todas las tablas.
"""
import os
import pytest
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


# ─── Engine (session-scoped) ────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ─── Limpieza entre tests ────────────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def clean_tables(test_engine):
    """Trunca todas las tablas DESPUÉS de cada test (orden inverso de FK)."""
    yield
    async with test_engine.begin() as conn:
        names = ", ".join(
            f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables)
        )
        await conn.execute(text(f"TRUNCATE TABLE {names} RESTART IDENTITY CASCADE"))


# ─── HTTP client con sesiones propias ────────────────────────────────────────

@pytest_asyncio.fixture
async def client(test_engine):
    """
    AsyncClient cuya dependencia get_db genera una AsyncSession NUEVA
    por cada request — nunca se comparte con otros fixtures.
    """
    Session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with Session() as db:
            yield db

    app_module.app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app_module.app),
        base_url="http://test",
    ) as ac:
        yield ac

    app_module.app.dependency_overrides.clear()


# ─── Helper de login ─────────────────────────────────────────────────────────

async def login(client: AsyncClient, email: str, password: str = "Test1234!") -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed ({email}): {resp.text}"
    return resp.json()["access_token"]


# ─── Setup fixtures (crean datos vía HTTP) ───────────────────────────────────

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
