from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.models.organizacion import RubroNegocio

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/")
async def get_dashboard(
    current_user=Depends(get_current_user),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """
    Dashboard adaptativo: retorna KPIs según el rubro de la organización.
    El frontend consume este único endpoint y renderiza según el campo 'rubro'.
    """
    base = {
        "rubro": org.rubro,
        "org_nombre": org.nombre,
        "plan": org.plan,
    }

    if org.rubro == RubroNegocio.veterinaria:
        from app.models.veterinaria.paciente import Paciente
        from app.models.veterinaria.cita import CitaVet, EstadoCita
        from datetime import datetime, timezone, timedelta

        total_pacientes = await db.scalar(
            select(func.count()).where(
                Paciente.organizacion_id == org.id, Paciente.activo == True
            )
        )
        hoy = datetime.now(timezone.utc).date()
        citas_hoy = await db.scalar(
            select(func.count()).where(
                CitaVet.organizacion_id == org.id,
                func.date(CitaVet.fecha_hora) == hoy,
                CitaVet.estado != EstadoCita.cancelada,
            )
        )
        return {**base, "kpis": {"total_pacientes": total_pacientes, "citas_hoy": citas_hoy}}

    elif org.rubro == RubroNegocio.belleza:
        from app.models.belleza.cliente import ClienteBelleza
        from app.models.belleza.cita import CitaBelleza, EstadoCitaBelleza
        from datetime import datetime, timezone

        total_clientes = await db.scalar(
            select(func.count()).where(ClienteBelleza.organizacion_id == org.id, ClienteBelleza.activo == True)
        )
        hoy = datetime.now(timezone.utc).date()
        citas_hoy = await db.scalar(
            select(func.count()).where(
                CitaBelleza.organizacion_id == org.id,
                func.date(CitaBelleza.fecha_hora) == hoy,
                CitaBelleza.estado != EstadoCitaBelleza.cancelada,
            )
        )
        return {**base, "kpis": {"total_clientes": total_clientes, "citas_hoy": citas_hoy}}

    elif org.rubro == RubroNegocio.roperia:
        from app.models.roperia.producto import Producto
        from app.models.roperia.venta import Venta, EstadoVenta
        from datetime import datetime, timezone
        from sqlalchemy import and_

        total_productos = await db.scalar(
            select(func.count()).where(Producto.organizacion_id == org.id, Producto.activo == True)
        )
        productos_bajo_stock = await db.scalar(
            select(func.count()).where(
                Producto.organizacion_id == org.id,
                Producto.stock <= Producto.stock_minimo,
                Producto.activo == True,
            )
        )
        hoy = datetime.now(timezone.utc).date()
        ventas_hoy = await db.scalar(
            select(func.count()).where(
                Venta.organizacion_id == org.id,
                func.date(Venta.created_at) == hoy,
                Venta.estado == EstadoVenta.completada,
            )
        )
        return {**base, "kpis": {
            "total_productos": total_productos,
            "productos_bajo_stock": productos_bajo_stock,
            "ventas_hoy": ventas_hoy,
        }}

    return {**base, "kpis": {}}
