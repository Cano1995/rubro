"""
Lógica de cálculo de IVA paraguayo.

Portado del FacturaCalculoService de ARANDU-FAKT (TypeScript → Python).

Algoritmo (precio INCLUYE IVA):
  base     = bruto / (1 + tasa)
  montoIVA = bruto - base
  total    = bruto

Algoritmo (precio NO incluye IVA):
  base     = bruto
  montoIVA = bruto * tasa
  total    = bruto + montoIVA
"""


MAX_CORRELATIVO = 9_999_999


def siguiente_serie(serie: str | None) -> str:
    """
    Incrementa la serie alfanumérica de 2 chars para e-kuatia.
    None → "AA", "AA" → "AB", ..., "AZ" → "BA", ..., "ZZ" → error (límite absoluto).
    """
    if serie is None:
        return "AA"
    if len(serie) != 2:
        raise ValueError(f"Serie inválida: {serie!r}")
    letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    segundo = letras.find(serie[1])
    primero = letras.find(serie[0])
    if segundo == -1 or primero == -1:
        raise ValueError(f"Serie con caracteres inválidos: {serie!r}")
    if segundo < len(letras) - 1:
        return serie[0] + letras[segundo + 1]
    if primero < len(letras) - 1:
        return letras[primero + 1] + "A"
    raise OverflowError("Serie de numeración agotada (ZZ). Se requiere un nuevo timbrado.")


def generar_numero_factura(cfg) -> tuple[str, int, str | None]:
    """
    Genera el número de factura en formato DNIT paraguayo: XXX-YYY-NNNNNNN.
    Retorna (numero_str, nuevo_siguiente_numero, nueva_serie).
    Maneja el overflow al llegar a 9999999 activando la serie alfanumérica.
    """
    num = cfg.siguiente_numero
    serie = cfg.serie

    if num > MAX_CORRELATIVO:
        serie = siguiente_serie(serie)
        num = 1

    est = cfg.codigo_establecimiento.zfill(3)
    pto = cfg.punto_expedicion.zfill(3)
    correlativo = str(num).zfill(7)

    if serie:
        numero = f"{est}-{pto}-{serie}{correlativo}"
    else:
        numero = f"{est}-{pto}-{correlativo}"

    return numero, num + 1, serie


def _round2(n: float) -> float:
    return round(n, 2)


def calcular_item_iva(
    precio_unitario: float,
    cantidad: float,
    tasa: str,
    incluye_iva: bool,
) -> dict:
    bruto = precio_unitario * cantidad

    if tasa == "IVA_10":
        t = 0.10
    elif tasa == "IVA_5":
        t = 0.05
    else:
        t = 0.00

    if incluye_iva:
        subtotal = bruto / (1 + t) if t > 0 else bruto
        monto_iva = bruto - subtotal
        total = bruto
    else:
        subtotal = bruto
        monto_iva = bruto * t
        total = bruto + monto_iva

    return {
        "subtotal": _round2(subtotal),
        "monto_iva": _round2(monto_iva),
        "total": _round2(total),
    }


def calcular_totales(items_calculados: list[dict]) -> dict:
    """
    Suma IVA de todos los ítems.

    total_base    = suma de subtotales de ítems IVA_10 e IVA_5 (gravado)
    total_iva10   = suma de montos IVA al 10%
    total_iva5    = suma de montos IVA al 5%
    total_exento  = suma de totales de ítems EXENTO
    total_general = total_base + total_iva10 + total_iva5 + total_exento
    """
    total_base = 0.0
    total_iva10 = 0.0
    total_iva5 = 0.0
    total_exento = 0.0

    for it in items_calculados:
        tasa = it["tasa_iva"]
        if tasa == "EXENTO":
            total_exento += it["total"]
        else:
            total_base += it["subtotal"]
            if tasa == "IVA_10":
                total_iva10 += it["monto_iva"]
            elif tasa == "IVA_5":
                total_iva5 += it["monto_iva"]

    return {
        "total_base": _round2(total_base),
        "total_iva10": _round2(total_iva10),
        "total_iva5": _round2(total_iva5),
        "total_exento": _round2(total_exento),
        "total_general": _round2(total_base + total_iva10 + total_iva5 + total_exento),
    }
