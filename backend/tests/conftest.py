"""
Fixtures globales para tests de integración.

Diseño para pytest-asyncio 0.24.0:
  - pytest-asyncio 0.24 crea un event loop distinto por test.
  - Si un fixture async crea conexiones asyncpg, esas conexiones quedan en el
    pool atadas al loop del fixture (distinto al del test) → "Future attached
    to a different loop".
  - Solución: toda creación de datos usa psycopg2 (sync, sin asyncpg).
    El fixture `client` es async pero NO crea conexiones asyncpg (pool vacío).
    Los fixtures de setup (vet_setup etc.) son SYNC y usan psycopg2.
    Así, la primera conexión asyncpg la crea el TEST en su propio event loop.
"""
import os
import pytest
import pytest_asyncio
from sqlalchemy import create_engine as _sync_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from httpx import AsyncClient, ASGITransport

from app.core.database import Base, get_db
from app.core.security import hash_password
import main as app_module


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rubro:rubro_dev@localhost:5432/rubro_test",
)

_SYNC_URL = TEST_DATABASE_URL.replace("+asyncpg", "+psycopg2")


# ─── Helpers sync (psycopg2, sin asyncpg) ────────────────────────────────────

def _reset_schema() -> None:
    """Drop + recreate schema y tablas usando psycopg2 puro."""
    eng = _sync_engine(_SYNC_URL, isolation_level="AUTOCOMMIT")
    with eng.connect() as conn:
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    eng.dispose()

    eng2 = _sync_engine(_SYNC_URL)
    Base.metadata.create_all(eng2, checkfirst=False)
    eng2.dispose()


def _insert_org_user(rubro: str, org_nombre: str, email: str, password: str) -> dict:
    """Inserta organización + usuario admin vía psycopg2 (sin asyncpg)."""
    eng = _sync_engine(_SYNC_URL)
    with eng.connect() as conn:
        with conn.begin():
            result = conn.execute(
                text("""
                    INSERT INTO organizaciones
                        (nombre, rubro, plan, estado, activo, configuracion)
                    VALUES
                        (:nombre, CAST(:rubro AS rubronegocio), 'free', 'prueba', true, '{}')
                    RETURNING id
                """),
                {"nombre": org_nombre, "rubro": rubro},
            )
            org_id = result.scalar()

            conn.execute(
                text("""
                    INSERT INTO usuarios
                        (nombre, apellido, email, password_hash, rol, organizacion_id, activo)
                    VALUES
                        ('Test', 'Admin', :email, :pwd, 'org_admin'::rolusuario, :org_id, true)
                """),
                {"email": email, "pwd": hash_password(password), "org_id": org_id},
            )
    eng.dispose()
    return {"email": email, "password": password}


# ─── HTTP client fixture (async, pool asyncpg vacío al salir) ─────────────────

@pytest_asyncio.fixture
async def client():
    """
    HTTP client con schema limpio.

    Importante: NO se crean conexiones asyncpg aquí. El pool del test_engine
    permanece vacío hasta que el TEST hace el primer request (en su propio
    event loop), evitando así el error "Future attached to a different loop".
    """
    _reset_schema()   # sync — no toca asyncpg

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


# ─── Login helper ─────────────────────────────────────────────────────────────

async def login(client: AsyncClient, email: str, password: str = "Test1234!") -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Login failed ({email}): {resp.text}"
    return resp.json()["access_token"]


# ─── Setup fixtures SYNC (psycopg2, cero conexiones asyncpg) ──────────────────
# Dependen de `client` para garantizar que el schema ya existe.

@pytest.fixture
def vet_setup(client):
    """Org veterinaria + admin vía psycopg2."""
    return _insert_org_user("veterinaria", "Vet Test", "vet@test.com", "Test1234!")


@pytest.fixture
def bel_setup(client):
    """Org belleza + admin vía psycopg2."""
    return _insert_org_user("belleza", "Bel Test", "bel@test.com", "Test1234!")


@pytest.fixture
def rop_setup(client):
    """Org ropería + admin vía psycopg2."""
    return _insert_org_user("roperia", "Rop Test", "rop@test.com", "Test1234!")
