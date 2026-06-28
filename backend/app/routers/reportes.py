"""
Reportes por rubro — devuelve datos para el dashboard de reportes.
El cliente puede exportar el JSON a CSV/Excel usando la lógica del frontend.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from app.core.database import get_db
from app.core.deps import get_current_org
from app.models.organizacion import RubroNegocio

# Veterinaria
from app.models.veterinaria.cita import CitaVet, EstadoCita
from app.models.veterinaria.paciente import Paciente
from app.models.veterinaria.propietario import Propietario

# Belleza
from app.models.belleza.cita import CitaBelleza
from app.models.belleza.servicio import Servicio
from app.models.belleza.cliente import ClienteBelleza

# Ropería
from app.models.roperia.venta import Venta, EstadoVenta
from app.models.roperia.producto import Producto

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _range(periodo: str) -> tuple[datetime, datetime]:
    """Convierte string periodo → (inicio, fin) UTC."""
    now = datetime.now(tz=timezone.utc)
    if periodo == "semana":
        inicio = now - timedelta(days=7)
    elif periodo == "mes":
        inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "trimestre":
        inicio = now - timedelta(days=90)
    else:  # año
        inicio = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    return inicio, now


# ─── VETERINARIA ─────────────────────────────────────────────────────────────
@router.get("/veterinaria")
async def reporte_veterinaria(
    periodo: str = Query("mes", enum=["semana", "mes", "trimestre", "anio"]),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    inicio, fin = _range(periodo)

    # Citas por estado en el período
    citas_res = await db.execute(
        select(CitaVet.estado, func.count().label("total"))
        .where(
            CitaVet.organizacion_id == org.id,
            CitaVet.fecha_hora.between(inicio, fin)
        )
        .group_by(CitaVet.estado)
    )
    citas_por_estado = {r.estado: r.total for r in citas_res}

    # Total pacientes activos
    pac_total = await db.scalar(
        select(func.count()).where(Paciente.organizacion_id == org.id, Paciente.activo == True)
    )

    # Pacientes nuevos en el período
    pac_nuevos = await db.scalar(
        select(func.count()).where(
            Paciente.organizacion_id == org.id,
            Paciente.created_at.between(inicio, fin)
        )
    )

    # Especies más frecuentes
    especies_res = await db.execute(
        select(Paciente.especie, func.count().label("total"))
        .where(Paciente.organizacion_id == org.id, Paciente.activo == True)
        .group_by(Paciente.especie)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_especies = [{"especie": r.especie, "total": r.total} for r in especies_res]

    # Citas por día (últimos 30 días)
    hace30 = datetime.now(tz=timezone.utc) - timedelta(days=30)
    citas_dia_res = await db.execute(
        select(
            func.date(CitaVet.fecha_hora).label("dia"),
            func.count().label("total")
        )
        .where(CitaVet.organizacion_id == org.id, CitaVet.fecha_hora >= hace30)
        .group_by(func.date(CitaVet.fecha_hora))
        .order_by(func.date(CitaVet.fecha_hora))
    )
    citas_por_dia = [{"dia": str(r.dia), "total": r.total} for r in citas_dia_res]

    return {
        "periodo": periodo,
        "resumen": {
            "pacientes_total": pac_total,
            "pacientes_nuevos": pac_nuevos,
            "citas_total": sum(citas_por_estado.values()),
            "citas_completadas": citas_por_estado.get("completada", 0),
            "citas_canceladas": citas_por_estado.get("cancelada", 0),
        },
        "citas_por_estado": citas_por_estado,
        "top_especies": top_especies,
        "citas_por_dia": citas_por_dia,
    }


# ─── BELLEZA ─────────────────────────────────────────────────────────────────
@router.get("/belleza")
async def reporte_belleza(
    periodo: str = Query("mes", enum=["semana", "mes", "trimestre", "anio"]),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    inicio, fin = _range(periodo)

    # Citas por estado
    citas_res = await db.execute(
        select(CitaBelleza.estado, func.count().label("total"))
        .where(CitaBelleza.organizacion_id == org.id, CitaBelleza.fecha_hora.between(inicio, fin))
        .group_by(CitaBelleza.estado)
    )
    citas_por_estado = {r.estado: r.total for r in citas_res}

    # Ingresos del período
    ingresos = await db.scalar(
        select(func.coalesce(func.sum(CitaBelleza.precio_cobrado), 0))
        .where(
            CitaBelleza.organizacion_id == org.id,
            CitaBelleza.fecha_hora.between(inicio, fin),
            CitaBelleza.estado == "completada",
        )
    )

    # Servicios más solicitados
    top_srv_res = await db.execute(
        select(Servicio.nombre, func.count(CitaBelleza.id).label("total"))
        .join(CitaBelleza, CitaBelleza.servicio_id == Servicio.id)
        .where(CitaBelleza.organizacion_id == org.id, CitaBelleza.fecha_hora.between(inicio, fin))
        .group_by(Servicio.nombre)
        .order_by(func.count(CitaBelleza.id).desc())
        .limit(5)
    )
    top_servicios = [{"servicio": r.nombre, "total": r.total} for r in top_srv_res]

    # Clientes activos
    clientes_total = await db.scalar(
        select(func.count()).where(ClienteBelleza.organizacion_id == org.id, ClienteBelleza.activo == True)
    )
    clientes_nuevos = await db.scalar(
        select(func.count()).where(
            ClienteBelleza.organizacion_id == org.id,
            ClienteBelleza.created_at.between(inicio, fin)
        )
    )

    # Ingresos por día
    ing_dia_res = await db.execute(
        select(
            func.date(CitaBelleza.fecha_hora).label("dia"),
            func.coalesce(func.sum(CitaBelleza.precio_cobrado), 0).label("total")
        )
        .where(
            CitaBelleza.organizacion_id == org.id,
            CitaBelleza.fecha_hora.between(inicio, fin),
            CitaBelleza.estado == "completada",
        )
        .group_by(func.date(CitaBelleza.fecha_hora))
        .order_by(func.date(CitaBelleza.fecha_hora))
    )
    ingresos_por_dia = [{"dia": str(r.dia), "total": float(r.total)} for r in ing_dia_res]

    return {
        "periodo": periodo,
        "resumen": {
            "clientes_total": clientes_total,
            "clientes_nuevos": clientes_nuevos,
            "citas_total": sum(citas_por_estado.values()),
            "citas_completadas": citas_por_estado.get("completada", 0),
            "ingresos": float(ingresos or 0),
        },
        "citas_por_estado": citas_por_estado,
        "top_servicios": top_servicios,
        "ingresos_por_dia": ingresos_por_dia,
    }


# ─── ROPERÍA ─────────────────────────────────────────────────────────────────
@router.get("/roperia")
async def reporte_roperia(
    periodo: str = Query("mes", enum=["semana", "mes", "trimestre", "anio"]),
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    inicio, fin = _range(periodo)

    # Ventas y totales del período
    ventas_res = await db.execute(
        select(
            func.count(Venta.id).label("cantidad"),
            func.coalesce(func.sum(Venta.total), 0).label("total"),
        )
        .where(
            Venta.organizacion_id == org.id,
            Venta.created_at.between(inicio, fin),
            Venta.estado == EstadoVenta.completada,
        )
    )
    ventas_row = ventas_res.first()

    # Ventas por método de pago
    metodo_res = await db.execute(
        select(Venta.metodo_pago, func.count().label("cantidad"), func.sum(Venta.total).label("total"))
        .where(
            Venta.organizacion_id == org.id,
            Venta.created_at.between(inicio, fin),
            Venta.estado == EstadoVenta.completada,
        )
        .group_by(Venta.metodo_pago)
    )
    por_metodo = [{"metodo": r.metodo_pago, "cantidad": r.cantidad, "total": float(r.total or 0)} for r in metodo_res]

    # Productos con bajo stock
    bajo_stock_res = await db.execute(
        select(Producto.nombre, Producto.stock, Producto.stock_minimo)
        .where(
            Producto.organizacion_id == org.id,
            Producto.stock <= Producto.stock_minimo,
            Producto.activo == True,
        )
        .order_by(Producto.stock)
    )
    bajo_stock = [{"nombre": r.nombre, "stock": r.stock, "minimo": r.stock_minimo} for r in bajo_stock_res]

    # Ventas por día
    ventas_dia_res = await db.execute(
        select(
            func.date(Venta.created_at).label("dia"),
            func.count(Venta.id).label("cantidad"),
            func.sum(Venta.total).label("total"),
        )
        .where(
            Venta.organizacion_id == org.id,
            Venta.created_at.between(inicio, fin),
            Venta.estado == EstadoVenta.completada,
        )
        .group_by(func.date(Venta.created_at))
        .order_by(func.date(Venta.created_at))
    )
    ventas_por_dia = [{"dia": str(r.dia), "cantidad": r.cantidad, "total": float(r.total or 0)} for r in ventas_dia_res]

    # Total productos activos
    productos_total = await db.scalar(
        select(func.count()).where(Producto.organizacion_id == org.id, Producto.activo == True)
    )

    return {
        "periodo": periodo,
        "resumen": {
            "productos_total": productos_total,
            "ventas_cantidad": ventas_row.cantidad if ventas_row else 0,
            "ventas_total": float(ventas_row.total) if ventas_row else 0,
            "bajo_stock_cantidad": len(bajo_stock),
        },
        "por_metodo_pago": por_metodo,
        "bajo_stock": bajo_stock,
        "ventas_por_dia": ventas_por_dia,
    }
