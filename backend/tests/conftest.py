"""
Fixtures globales para tests de integración.
Usa PostgreSQL real — no mocks.

Diseño (importante):
  El problema raíz es que pytest-asyncio ejecuta los fixtures async en un
  event loop distinto al de los tests. Si creamos conexiones asyncpg en el
  fixture y luego las reusamos en el test, asyncpg lanza:
      "Future attached to a different loop"

  Solución: gestionar el schema con psycopg2 (sync, sin event loop) para que
  el pool de conexiones asyncpg no tenga ninguna conexión previa cuando el
  test empieza. La primera conexión asyncpg se crea DENTRO del test (en el
  event loop correcto), no en el fixture.
"""
import os
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

# psycopg2 URL (driver sync)
_SYNC_URL = TEST_DATABASE_URL.replace("+asyncpg", "+psycopg2")


def _reset_schema() -> None:
    """Drop + recreate schema y crea tablas — puro psycopg2, sin event loop."""
    eng = _sync_engine(_SYNC_URL, isolation_level="AUTOCOMMIT")
    with eng.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    eng.dispose()

    eng2 = _sync_engine(_SYNC_URL)
    Base.metadata.create_all(eng2, checkfirst=False)
    eng2.dispose()


@pytest_asyncio.fixture
async def client():
    """
    HTTP client con schema limpio.
    El pool asyncpg queda vacío al crear el fixture — la primera
    conexión asyncpg la crea el test mismo (en su propio event loop).
    """
    # Schema reset SYNC — no toca asyncpg ni el event loop del fixture
    _reset_schema()

    # Engine async vacío: no se abre ninguna conexión aquí
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
