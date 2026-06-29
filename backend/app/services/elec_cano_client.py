"""
Cliente async para la API de elec-cano (facturación electrónica SIFEN Paraguay).

Mapea los modelos internos de Rubro al schema de DocumentoElectronicoCreate
de elec-cano y devuelve el resultado (CDC, QR, estado_sifen).
"""
import httpx
from app.models.facturacion.models import Factura, FacConfig


# Mapeos entre enums de Rubro y los valores enteros de elec-cano
_TASA_IVA_MAP = {"IVA_10": 10, "IVA_5": 5, "EXENTO": 0}
_CONDICION_MAP = {"contado": 1, "credito": 2}
_FORMA_PAGO_MAP = {
    "efectivo": 1, "cheque": 2, "tarjeta": 3,
    "transferencia": 5, "billetera": 9,
}


def _precio_con_iva(precio: float, incluye_iva: bool, tasa_str: str) -> float:
    """
    elec-cano siempre espera el precio incluyendo IVA (extrae el IVA internamente).
    Si el precio de Rubro no incluye IVA, lo convertimos aquí.
    """
    if incluye_iva or tasa_str == "EXENTO":
        return precio
    tasa = 0.10 if tasa_str == "IVA_10" else 0.05
    return round(precio * (1 + tasa), 2)


def _build_payload(factura: Factura, cfg: FacConfig, tipo_transaccion: int = 3, enviar_sifen: bool = True) -> dict:
    """Construye el payload para POST /api/v1/de/generar de elec-cano."""

    # Número correlativo (7 dígitos, sin la serie)
    partes = factura.numero.split("-")
    # Formato: "001-001-0000001" o "001-001-AA0000001"
    if len(partes) == 3:
        est, pto, num_raw = partes
        # Si el num_raw tiene serie alfanumérica al inicio (ej: AA0000001)
        serie = None
        if len(num_raw) > 7 and not num_raw[:2].isdigit():
            serie = num_raw[:2]
            num_raw = num_raw[2:]
        numero_7 = num_raw.zfill(7)
    else:
        est = cfg.codigo_establecimiento.zfill(3)
        pto = cfg.punto_expedicion.zfill(3)
        numero_7 = "0000001"
        serie = cfg.serie

    # Receptor
    receptor: dict = {"nombre": "Sin identificar", "es_contribuyente": False, "pais": "PRY"}
    if factura.cliente:
        receptor["nombre"] = factura.cliente.nombre
        if factura.cliente.ruc:
            ruc_parts = factura.cliente.ruc.replace(" ", "").split("-")
            receptor["ruc"] = ruc_parts[0]
            receptor["dv"] = ruc_parts[1] if len(ruc_parts) > 1 else "0"
            receptor["es_contribuyente"] = True
        if factura.cliente.email:
            receptor["email"] = factura.cliente.email
        if factura.cliente.telefono:
            receptor["telefono"] = factura.cliente.telefono

    # Ítems
    items = []
    for it in factura.items:
        tasa_str = str(it.tasa_iva.value) if hasattr(it.tasa_iva, 'value') else str(it.tasa_iva)
        tasa_int = _TASA_IVA_MAP.get(tasa_str, 10)
        precio_incluye = bool(it.precio_incluye_iva)
        pu_elec = _precio_con_iva(float(it.precio_unitario), precio_incluye, tasa_str)

        items.append({
            "descripcion": it.descripcion,
            "cantidad": float(it.cantidad),
            "precio_unitario": pu_elec,
            "tasa_iva": tasa_int,
            "tipo_impuesto": 1 if tasa_str != "EXENTO" else 4,
            "unidad_medida": 77,  # Unidad (código SIFEN)
            "descuento": 0.0,
            "anticipo": 0.0,
            "ivaPorItem": True,
        })

    # Pagos (solo para condición contado)
    condicion_str = str(factura.condicion.value) if hasattr(factura.condicion, 'value') else str(factura.condicion)
    pagos = None
    if condicion_str == "contado" and factura.pagos:
        pagos = [
            {
                "forma_pago": _FORMA_PAGO_MAP.get(str(p.metodo_pago), 1),
                "monto": float(p.monto),
                "moneda": "PYG",
            }
            for p in factura.pagos
        ]
    elif condicion_str == "contado":
        # Sin pagos registrados aún — pago en efectivo por el total
        pagos = [{"forma_pago": 1, "monto": float(factura.total_general), "moneda": "PYG"}]

    payload: dict = {
        "tipo_documento": 1,  # Factura
        "tipo_emision": 1,    # Normal
        "tipo_transaccion": tipo_transaccion,
        "establecimiento": est,
        "punto": pto,
        "numero": numero_7,
        "condicion_venta": _CONDICION_MAP.get(condicion_str, 1),
        "receptor": receptor,
        "items": items,
        "enviar_sifen": enviar_sifen,
    }
    if serie:
        payload["serie"] = serie
    if pagos:
        payload["pagos"] = pagos
    if factura.notas:
        payload["observacion"] = factura.notas

    return payload


async def emitir_electronica(
    factura: Factura,
    cfg: FacConfig,
    tipo_transaccion: int = 3,
    enviar_sifen: bool = True,
) -> dict:
    """
    Llama a elec-cano POST /api/v1/de/generar.
    Retorna dict con: success, cdc, estado, qr, error.
    """
    if not cfg.elec_url or not cfg.elec_api_key:
        raise ValueError("Configurá la URL y API Key de elec-cano en la configuración de facturación")

    payload = _build_payload(factura, cfg, tipo_transaccion, enviar_sifen)
    url = cfg.elec_url.rstrip("/") + "/api/v1/de/generar"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"X-API-Key": cfg.elec_api_key, "Content-Type": "application/json"},
        )

    if resp.status_code >= 500:
        raise RuntimeError(f"Error en elec-cano ({resp.status_code}): {resp.text[:300]}")

    return resp.json()


async def cancelar_electronica(cdc: str, motivo: str, cfg: FacConfig) -> dict:
    """Cancela un DE aprobado en SIFEN vía elec-cano POST /api/v1/evento/cancelar."""
    if not cfg.elec_url or not cfg.elec_api_key:
        raise ValueError("Configurá la URL y API Key de elec-cano")

    url = cfg.elec_url.rstrip("/") + "/api/v1/evento/cancelar"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json={"cdc": cdc, "motivo": motivo},
            headers={"X-API-Key": cfg.elec_api_key},
        )
    return resp.json()
