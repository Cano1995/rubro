from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import engine, Base
from app.core.limiter import limiter

# Routers base
from app.routers import auth, organizaciones, usuarios, dashboard, admin, suscripciones

# Módulo veterinaria
from app.routers.veterinaria import pacientes as vet_pacientes
from app.routers.veterinaria import propietarios as vet_propietarios
from app.routers.veterinaria import citas as vet_citas
from app.routers.veterinaria import historiales as vet_historiales
from app.routers.veterinaria import vacunas as vet_vacunas

# Módulo belleza
from app.routers.belleza import clientes as bel_clientes
from app.routers.belleza import servicios as bel_servicios
from app.routers.belleza import citas as bel_citas
from app.routers.belleza import staff as bel_staff

# Módulo ropería
from app.routers.roperia import productos as rop_productos
from app.routers.roperia import categorias as rop_categorias
from app.routers.roperia import ventas as rop_ventas

# Para agregar un nuevo módulo:
# 1. from app.routers.<rubro> import ...
# 2. app.include_router(...)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Rubro API",
    description="""
## Rubro — SaaS Multirubro

Sistema de gestión adaptable por rubro de negocio.

### Arquitectura
- **Organizaciones** se registran eligiendo su **rubro** (veterinaria, belleza, ropería)
- **Usuarios** pertenecen a una organización con roles (org_admin, staff, cliente)
- **Módulos** se activan automáticamente según el rubro de la organización
- **Suscripciones** controlan el acceso a funcionalidades (free, basico, pro)

### Módulos disponibles
| Módulo | Rubro | Descripción |
|--------|-------|-------------|
| Pacientes, Propietarios | veterinaria | Fichas clínicas, razas, dueños |
| Citas | veterinaria | Agenda de consultas |
| Historiales, Vacunas | veterinaria | Registros médicos y sanidad |
| Clientes | belleza | Base de clientes del salón |
| Servicios | belleza | Catálogo de cortes, tratamientos |
| Citas | belleza | Agenda del salón |
| Productos, Categorías | ropería | Inventario con tallas/colores |
| Ventas (POS) | ropería | Caja con descuento de stock |

### Extensibilidad
Para agregar un nuevo rubro: añadir el valor al enum `RubroNegocio`,
crear las carpetas `models/<rubro>` y `routers/<rubro>`, registrar en `main.py`.
""",
    version=settings.VERSION,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers base ---
app.include_router(auth.router)
app.include_router(organizaciones.router)
app.include_router(usuarios.router)
app.include_router(dashboard.router)
app.include_router(admin.router)
app.include_router(suscripciones.router)

# --- Módulo: veterinaria ---
app.include_router(vet_propietarios.router)
app.include_router(vet_pacientes.router)
app.include_router(vet_citas.router)
app.include_router(vet_historiales.router)
app.include_router(vet_vacunas.router)

# --- Módulo: belleza ---
app.include_router(bel_clientes.router)
app.include_router(bel_servicios.router)
app.include_router(bel_citas.router)
app.include_router(bel_staff.router)

# --- Módulo: ropería ---
app.include_router(rop_categorias.router)
app.include_router(rop_productos.router)
app.include_router(rop_ventas.router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.VERSION}


@app.get("/")
async def root():
    return {
        "app": "rubro",
        "descripcion": "SaaS Multirubro — veterinaria · belleza · ropería",
        "docs": "/docs",
        "version": settings.VERSION,
    }
