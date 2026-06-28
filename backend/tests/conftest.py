"""
Fixtures globales para tests de integración.
Usa PostgreSQL real — no mocks.
Requiere: TEST_DATABASE_URL en el entorno o .env.test
"""
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.models.organizacion import Organizacion, RubroNegocio, PlanOrg, EstadoOrg
from app.models.usuario import Usuario, RolUsuario
from app.models.suscripcion import Suscripcion, EstadoSuscripcion
import main as app_module


# ─── Test DB URL ──────────────────────────────────────────────────────────────
import os

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://rubro:rubro_dev@localhost:5432/rubro_test",
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


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


@pytest_asyncio.fixture
async def db(test_engine):
    """Sesión que hace rollback al finalizar cada test."""
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest_asyncio.fixture
async def client(db):
    """Cliente HTTP con la DB sobreescrita por la fixture."""
    async def override_get_db():
        yield db

    app_module.app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app_module.app),
        base_url="http://test",
    ) as ac:
        yield ac

    app_module.app.dependency_overrides.clear()


# ─── Factories ────────────────────────────────────────────────────────────────

async def make_org(db: AsyncSession, rubro: str = "veterinaria", nombre: str = "Test Org") -> Organizacion:
    org = Organizacion(
        nombre=nombre,
        rubro=RubroNegocio(rubro),
        plan=PlanOrg.pro,
        estado=EstadoOrg.activa,
    )
    db.add(org)
    await db.flush()
    return org


async def make_user(
    db: AsyncSession,
    org_id: int | None,
    rol: str = "org_admin",
    email: str = "test@test.com",
    password: str = "Test1234!",
) -> Usuario:
    user = Usuario(
        nombre="Test",
        apellido="User",
        email=email,
        password_hash=hash_password(password),
        rol=RolUsuario(rol),
        organizacion_id=org_id,
        activo=True,
    )
    db.add(user)
    await db.flush()
    return user


async def make_suscripcion(db: AsyncSession, org_id: int) -> Suscripcion:
    sub = Suscripcion(
        organizacion_id=org_id,
        plan="pro",
        estado=EstadoSuscripcion.activa,
    )
    db.add(sub)
    await db.flush()
    return sub


async def login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def vet_setup(db):
    """Org veterinaria + admin + suscripcion listos para usar."""
    org = await make_org(db, rubro="veterinaria", nombre="Vet Test")
    user = await make_user(db, org.id, rol="org_admin", email="vet@test.com")
    await make_suscripcion(db, org.id)
    return {"org": org, "user": user, "email": "vet@test.com", "password": "Test1234!"}


@pytest_asyncio.fixture
async def bel_setup(db):
    org = await make_org(db, rubro="belleza", nombre="Bel Test")
    user = await make_user(db, org.id, rol="org_admin", email="bel@test.com")
    await make_suscripcion(db, org.id)
    return {"org": org, "user": user, "email": "bel@test.com", "password": "Test1234!"}


@pytest_asyncio.fixture
async def rop_setup(db):
    org = await make_org(db, rubro="roperia", nombre="Rop Test")
    user = await make_user(db, org.id, rol="org_admin", email="rop@test.com")
    await make_suscripcion(db, org.id)
    return {"org": org, "user": user, "email": "rop@test.com", "password": "Test1234!"}
