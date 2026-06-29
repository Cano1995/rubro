from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.deps import require_superadmin
from app.core.security import hash_password
from app.models.organizacion import Organizacion, PlanOrg, EstadoOrg, RubroNegocio
from app.models.usuario import Usuario, RolUsuario
from app.models.suscripcion import Suscripcion, EstadoSuscripcion
from app.models.facturacion.models import FacConfig

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class OrgAdminOut(BaseModel):
    id: int
    nombre: str
    rubro: str
    plan: str
    estado: str
    activo: bool
    created_at: datetime
    total_usuarios: int = 0
    mrr: float = 0.0
    fecha_vencimiento: datetime | None = None
    factura_electronica_activa: bool = False

    class Config:
        from_attributes = True


class OrgCreate(BaseModel):
    nombre: str
    rubro: RubroNegocio
    plan: PlanOrg = PlanOrg.free
    monto_mensual: float | None = None
    dias_prueba: int = 30
    admin_nombre: str
    admin_apellido: str
    admin_email: EmailStr
    admin_password: str


class PlanUpdate(BaseModel):
    plan: PlanOrg
    estado: EstadoOrg
    fecha_vencimiento: datetime | None = None
    monto_mensual: float | None = None


class ExtenderSuscripcion(BaseModel):
    dias: int = 30
    monto_mensual: float | None = None
    metodo_pago: str = "transferencia"
    referencia: str | None = None


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(_=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    total_orgs = await db.scalar(select(func.count()).select_from(Organizacion))
    total_usuarios = await db.scalar(
        select(func.count()).select_from(Usuario).where(Usuario.rol != "superadmin")
    )
    orgs_activas = await db.scalar(
        select(func.count()).select_from(Organizacion).where(Organizacion.activo == True)
    )

    # MRR: suma de la última suscripción activa por org
    mrr_result = await db.execute(
        select(func.coalesce(func.sum(Suscripcion.monto_mensual), 0))
        .where(Suscripcion.estado == EstadoSuscripcion.activa)
    )
    mrr = float(mrr_result.scalar() or 0)

    # Vencimientos en los próximos 7 días
    ahora = datetime.now(tz=timezone.utc)
    en_7_dias = ahora + timedelta(days=7)
    venc_proximos = await db.scalar(
        select(func.count()).select_from(Suscripcion).where(
            Suscripcion.fecha_vencimiento >= ahora,
            Suscripcion.fecha_vencimiento <= en_7_dias,
            Suscripcion.estado.in_([EstadoSuscripcion.activa, EstadoSuscripcion.prueba]),
        )
    )

    # Breakdown por rubro
    rubro_counts_res = await db.execute(
        select(Organizacion.rubro, func.count().label("n"))
        .group_by(Organizacion.rubro)
    )
    by_rubro = {str(r): n for r, n in rubro_counts_res.all()}

    return {
        "total_organizaciones": total_orgs,
        "total_usuarios": total_usuarios,
        "organizaciones_activas": orgs_activas,
        "mrr_guaranies": mrr,
        "vencimientos_proximos_7_dias": venc_proximos or 0,
        "by_rubro": by_rubro,
    }


# ─── Organizaciones ───────────────────────────────────────────────────────────

@router.get("/organizaciones", response_model=list[OrgAdminOut])
async def list_orgs_admin(_=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organizacion).order_by(Organizacion.created_at.desc()))
    orgs = result.scalars().all()

    out = []
    for org in orgs:
        count = await db.scalar(select(func.count()).where(Usuario.organizacion_id == org.id))
        sus_res = await db.execute(
            select(Suscripcion)
            .where(Suscripcion.organizacion_id == org.id)
            .order_by(Suscripcion.created_at.desc())
            .limit(1)
        )
        sus = sus_res.scalar_one_or_none()
        fac_res = await db.execute(select(FacConfig).where(FacConfig.organizacion_id == org.id))
        fac_cfg = fac_res.scalar_one_or_none()
        out.append({
            **org.__dict__,
            "total_usuarios": count or 0,
            "mrr": float(sus.monto_mensual or 0) if sus else 0.0,
            "fecha_vencimiento": sus.fecha_vencimiento if sus else None,
            "factura_electronica_activa": fac_cfg.factura_electronica_activa if fac_cfg else False,
        })
    return out


@router.post("/organizaciones", status_code=201)
async def create_org(
    data: OrgCreate,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    email_exists = await db.scalar(select(func.count()).where(Usuario.email == data.admin_email))
    if email_exists:
        raise HTTPException(400, "Ya existe un usuario con ese email")

    org = Organizacion(
        nombre=data.nombre,
        rubro=data.rubro,
        plan=data.plan,
        estado=EstadoOrg.prueba,
        activo=True,
    )
    db.add(org)
    await db.flush()

    vencimiento = datetime.now(tz=timezone.utc) + timedelta(days=data.dias_prueba)
    sus = Suscripcion(
        organizacion_id=org.id,
        plan=data.plan.value,
        estado=EstadoSuscripcion.prueba,
        monto_mensual=data.monto_mensual,
        fecha_vencimiento=vencimiento,
    )
    db.add(sus)

    admin = Usuario(
        nombre=data.admin_nombre,
        apellido=data.admin_apellido,
        email=data.admin_email,
        password_hash=hash_password(data.admin_password),
        rol=RolUsuario.org_admin,
        organizacion_id=org.id,
        activo=True,
    )
    db.add(admin)

    return {"id": org.id, "nombre": org.nombre, "admin_email": data.admin_email}


@router.patch("/organizaciones/{org_id}/plan")
async def update_plan(
    org_id: int,
    data: PlanUpdate,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organización no encontrada")

    org.plan = data.plan
    org.estado = data.estado
    sus = Suscripcion(
        organizacion_id=org.id,
        plan=data.plan.value,
        estado=data.estado.value,
        monto_mensual=data.monto_mensual,
        fecha_vencimiento=data.fecha_vencimiento,
    )
    db.add(sus)
    return {"ok": True, "org_id": org_id, "plan": data.plan, "estado": data.estado}


@router.patch("/organizaciones/{org_id}/facturacion-electronica")
async def toggle_facturacion_electronica(
    org_id: int,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    """Activa o desactiva la facturación electrónica SIFEN para una organización."""
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404)

    fac_res = await db.execute(select(FacConfig).where(FacConfig.organizacion_id == org_id))
    cfg = fac_res.scalar_one_or_none()
    if not cfg:
        cfg = FacConfig(organizacion_id=org_id, factura_electronica_activa=True)
        db.add(cfg)
    else:
        cfg.factura_electronica_activa = not cfg.factura_electronica_activa

    await db.flush()
    return {"org_id": org_id, "factura_electronica_activa": cfg.factura_electronica_activa}


@router.patch("/organizaciones/{org_id}/toggle")
async def toggle_org(org_id: int, _=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404)
    org.activo = not org.activo
    return {"org_id": org_id, "activo": org.activo}


@router.post("/organizaciones/{org_id}/extender")
async def extender_suscripcion(
    org_id: int,
    data: ExtenderSuscripcion,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Organizacion).where(Organizacion.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organización no encontrada")

    sus_res = await db.execute(
        select(Suscripcion)
        .where(Suscripcion.organizacion_id == org_id)
        .order_by(Suscripcion.created_at.desc())
        .limit(1)
    )
    ultima = sus_res.scalar_one_or_none()

    ahora = datetime.now(tz=timezone.utc)
    base = max(ahora, ultima.fecha_vencimiento.replace(tzinfo=timezone.utc) if ultima and ultima.fecha_vencimiento else ahora)
    nuevo_venc = base + timedelta(days=data.dias)

    nueva_sus = Suscripcion(
        organizacion_id=org_id,
        plan=ultima.plan if ultima else org.plan.value,
        estado=EstadoSuscripcion.activa,
        monto_mensual=data.monto_mensual or (ultima.monto_mensual if ultima else None),
        fecha_vencimiento=nuevo_venc,
        referencia_pago=data.referencia,
    )
    db.add(nueva_sus)
    org.estado = EstadoOrg.activa

    return {
        "ok": True,
        "org_id": org_id,
        "nueva_vencimiento": nuevo_venc.isoformat(),
        "dias_extendidos": data.dias,
    }


# ─── Vencimientos próximos ────────────────────────────────────────────────────

@router.get("/vencimientos")
async def get_vencimientos(
    dias: int = 30,
    _=Depends(require_superadmin),
    db: AsyncSession = Depends(get_db),
):
    ahora = datetime.now(tz=timezone.utc)
    limite = ahora + timedelta(days=dias)

    result = await db.execute(
        select(Suscripcion, Organizacion)
        .join(Organizacion, Suscripcion.organizacion_id == Organizacion.id)
        .where(
            Suscripcion.fecha_vencimiento >= ahora,
            Suscripcion.fecha_vencimiento <= limite,
            Suscripcion.estado.in_([EstadoSuscripcion.activa, EstadoSuscripcion.prueba]),
        )
        .order_by(Suscripcion.fecha_vencimiento.asc())
    )

    rows = result.all()
    out = []
    for sus, org in rows:
        out.append({
            "suscripcion_id": sus.id,
            "org_id": org.id,
            "org_nombre": org.nombre,
            "rubro": str(org.rubro.value) if hasattr(org.rubro, 'value') else str(org.rubro),
            "plan": sus.plan,
            "estado": str(sus.estado.value) if hasattr(sus.estado, 'value') else str(sus.estado),
            "fecha_vencimiento": sus.fecha_vencimiento.isoformat() if sus.fecha_vencimiento else None,
            "monto_mensual": float(sus.monto_mensual or 0),
            "dias_restantes": max(0, (sus.fecha_vencimiento.replace(tzinfo=timezone.utc) - ahora).days),
        })
    return out


# ─── Usuarios ─────────────────────────────────────────────────────────────────

@router.get("/usuarios")
async def list_usuarios_admin(_=Depends(require_superadmin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Usuario)
        .where(Usuario.rol != RolUsuario.superadmin)
        .order_by(Usuario.created_at.desc())
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "nombre": f"{u.nombre} {u.apellido}",
            "email": u.email,
            "rol": str(u.rol.value) if hasattr(u.rol, 'value') else str(u.rol),
            "activo": u.activo,
            "organizacion_id": u.organizacion_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]
