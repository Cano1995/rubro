"""
Fixtures globales para tests de integración.
Usa PostgreSQL real — no mocks.

Diseño:
  pytest-asyncio 0.24.0 crea un event loop nuevo por cada test function, pero
  los fixtures async pueden correr en un loop diferente al del test. Esto hace
  que asyncpg lance "Future attached to a different loop" cuando el pool
  reutiliza conexiones entre el fixture y el test.

  Soluciones combinadas:
  1. `event_loop` fixture session-scoped — fuerza un único loop para todo
     (deprecated en 0.21+ pero funcional en 0.24.0).
  2. psycopg2 para schema reset — evita crear conexiones asyncpg en el
     fixture setup (que corren antes del primer test).
"""
import asyncio
import os
import pytest
import pytest_asyncio
from sqlalchemy import create_engine as _sync_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport

from app.core.database import Base, get_db
import main as app_module


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rubro:rubro_dev@localhost:5432/rubro_test",
)

_SYNC_URL = TEST_DATABASE_URL.replace("+asyncpg", "+psycopg2")


# ─── Event loop session-scoped ───────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """
    Único event loop para toda la sesión de tests.
    Evita 'Future attached to a different loop' cuando los fixtures async
    crean conexiones asyncpg que luego son reutilizadas por los tests.
    Deprecated en pytest-asyncio >=0.21, pero funcional en 0.24.0.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


# ─── Schema sync (psycopg2) ──────────────────────────────────────────────────

def _reset_schema() -> None:
    """Drop + recreate schema y crea tablas — puro psycopg2, sin asyncpg."""
    eng = _sync_engine(_SYNC_URL, isolation_level="AUTOCOMMIT")
    with eng.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    eng.dispose()

    eng2 = _sync_engine(_SYNC_URL)
    Base.metadata.create_all(eng2, checkfirst=False)
    eng2.dispose()


# ─── HTTP client fixture ──────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    """HTTP client con schema limpio, sesiones DB propias por request."""
    _reset_schema()

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
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


# ─── Helper de login ─────────────────────────────────────────────────────────

async def login(client: AsyncClient, email: str, password: str = "Test1234!") -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed ({email}): {resp.text}"
    return resp.json()["access_token"]


# ─── Setup fixtures ───────────────────────────────────────────────────────────

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
