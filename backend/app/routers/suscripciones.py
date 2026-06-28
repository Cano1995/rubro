from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.core.deps import get_current_org
from app.models.suscripcion import Suscripcion, EstadoSuscripcion

router = APIRouter(prefix="/suscripciones", tags=["suscripciones"])


class SuscripcionOut(BaseModel):
    id: int
    plan: str
    estado: str
    monto_mensual: float | None
    fecha_inicio: datetime
    fecha_vencimiento: datetime | None

    class Config:
        from_attributes = True


@router.get("/mi-suscripcion", response_model=list[SuscripcionOut])
async def get_mi_suscripcion(
    org=Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Suscripcion)
        .where(Suscripcion.organizacion_id == org.id)
        .order_by(Suscripcion.created_at.desc())
    )
    return result.scalars().all()
