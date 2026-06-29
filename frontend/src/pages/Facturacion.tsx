import { useState, type ElementType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, Users, Settings, Check, X, ChevronDown, ChevronUp, Trash2, Hash } from 'lucide-react'
import apiClient from '../api/client'
import { clsx } from 'clsx'

type TasaIVA = 'IVA_10' | 'IVA_5' | 'EXENTO'
type EstadoFactura = 'pendiente' | 'pagada' | 'cancelada' | 'vencida'

interface FacCliente { id: number; nombre: string; ruc: string | null; email: string | null; telefono: string | null }
interface ItemOut { id: number; descripcion: string; cantidad: number; precio_unitario: number; tasa_iva: TasaIVA; precio_incluye_iva: boolean; subtotal: number; monto_iva: number; total: number }
interface PagoOut { id: number; monto: number; fecha: string; metodo_pago: string }
interface FacturaOut { id: number; numero: string; fecha: string; condicion: string; estado: EstadoFactura; total_base: number; total_iva10: number; total_iva5: number; total_exento: number; total_general: number; notas: string | null; cliente: { id: number; nombre: string; ruc: string | null } | null; items: ItemOut[]; pagos: PagoOut[] }
interface FacConfig {
  codigo_establecimiento: string
  punto_expedicion: string
  siguiente_numero: number
  timbrado: string | null
  timbrado_vigencia_desde: string | null
  timbrado_vigencia_hasta: string | null
  tasa_iva_default: TasaIVA
  precio_incluye_iva: boolean
  ruc: string | null
  razon_social: string | null
  direccion_fiscal: string | null
  telefono_fiscal: string | null
}

const TASA_LABELS: Record<TasaIVA, string> = { IVA_10: 'IVA 10%', IVA_5: 'IVA 5%', EXENTO: 'Exento' }
const ESTADO_COLORS: Record<EstadoFactura, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  pagada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
  vencida: 'bg-orange-100 text-orange-800',
}

function gs(n: number) { return `Gs. ${Math.round(n).toLocaleString('es-PY')}` }

// ─── Lista de Facturas ────────────────────────────────────────────────────────

function FilaFactura({ f, onPagar, onCancelar }: { f: FacturaOut; onPagar: () => void; onCancelar: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{f.numero}</span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', ESTADO_COLORS[f.estado])}>
              {f.estado}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {f.cliente?.nombre ?? 'Sin cliente'} · {new Date(f.fecha).toLocaleDateString('es-PY')}
          </p>
        </div>
        <span className="font-bold text-gray-800 text-sm shrink-0">{gs(f.total_general)}</span>
        {open ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
      </div>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* Ítems */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pb-1">Descripción</th>
                <th className="text-right pb-1">Cant.</th>
                <th className="text-right pb-1">Precio</th>
                <th className="text-right pb-1">IVA</th>
                <th className="text-right pb-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {f.items.map(it => (
                <tr key={it.id} className="border-t border-gray-50">
                  <td className="py-1 pr-2">{it.descripcion}</td>
                  <td className="py-1 text-right">{it.cantidad}</td>
                  <td className="py-1 text-right">{gs(it.precio_unitario)}</td>
                  <td className="py-1 text-right text-gray-500">{TASA_LABELS[it.tasa_iva]}</td>
                  <td className="py-1 text-right font-medium">{gs(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales IVA */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
            {f.total_base > 0 && <div className="flex justify-between"><span className="text-gray-500">Base gravada</span><span>{gs(f.total_base)}</span></div>}
            {f.total_iva10 > 0 && <div className="flex justify-between"><span className="text-gray-500">IVA 10%</span><span>{gs(f.total_iva10)}</span></div>}
            {f.total_iva5 > 0 && <div className="flex justify-between"><span className="text-gray-500">IVA 5%</span><span>{gs(f.total_iva5)}</span></div>}
            {f.total_exento > 0 && <div className="flex justify-between"><span className="text-gray-500">Exento</span><span>{gs(f.total_exento)}</span></div>}
            <div className="flex justify-between font-bold border-t border-gray-200 pt-1">
              <span>Total</span><span>{gs(f.total_general)}</span>
            </div>
          </div>

          {/* Pagos registrados */}
          {f.pagos.length > 0 && (
            <div className="text-xs space-y-1">
              <p className="font-medium text-gray-600">Pagos</p>
              {f.pagos.map(p => (
                <div key={p.id} className="flex justify-between text-gray-600">
                  <span>{new Date(p.fecha).toLocaleDateString('es-PY')} · {p.metodo_pago}</span>
                  <span className="font-medium text-green-700">{gs(p.monto)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            {f.estado === 'pendiente' && (
              <button
                onClick={onPagar}
                className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Check size={12} /> Registrar pago
              </button>
            )}
            {f.estado !== 'cancelada' && f.estado !== 'pagada' && (
              <button
                onClick={onCancelar}
                className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X size={12} /> Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal pago ───────────────────────────────────────────────────────────────

function ModalPago({ factura, onClose, onSuccess }: { factura: FacturaOut; onClose: () => void; onSuccess: () => void }) {
  const [monto, setMonto] = useState(String(factura.total_general))
  const [metodo, setMetodo] = useState('efectivo')
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: () => apiClient.post(`/facturacion/facturas/${factura.id}/pagos`, { monto: Number(monto), metodo_pago: metodo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facturas'] }); onSuccess(); onClose() },
  })
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 mb-4">Registrar pago — {factura.numero}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Monto (Gs.)</label>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Método</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {mut.isPending ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulario nueva factura ─────────────────────────────────────────────────

interface ItemForm { descripcion: string; cantidad: string; precio_unitario: string; tasa_iva: TasaIVA; precio_incluye_iva: boolean }

function calcItem(it: ItemForm) {
  const pu = Number(it.precio_unitario) || 0
  const qty = Number(it.cantidad) || 0
  const bruto = pu * qty
  const tasa = it.tasa_iva === 'IVA_10' ? 0.10 : it.tasa_iva === 'IVA_5' ? 0.05 : 0
  const subtotal = it.precio_incluye_iva && tasa > 0 ? bruto / (1 + tasa) : bruto
  const iva = it.precio_incluye_iva && tasa > 0 ? bruto - subtotal : bruto * tasa
  return { subtotal: Math.round(subtotal), monto_iva: Math.round(iva), total: Math.round(subtotal + iva) }
}

function NuevaFactura({ clientes, config, onSuccess }: { clientes: FacCliente[]; config: FacConfig; onSuccess: () => void }) {
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState('')
  const [condicion, setCondicion] = useState('contado')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemForm[]>([
    { descripcion: '', cantidad: '1', precio_unitario: '', tasa_iva: config.tasa_iva_default, precio_incluye_iva: config.precio_incluye_iva },
  ])

  const addItem = () => setItems(v => [...v, { descripcion: '', cantidad: '1', precio_unitario: '', tasa_iva: config.tasa_iva_default, precio_incluye_iva: config.precio_incluye_iva }])
  const removeItem = (i: number) => setItems(v => v.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof ItemForm, val: string | boolean) =>
    setItems(v => v.map((it, idx) => idx === i ? { ...it, [field]: val } : it))

  const totales = items.reduce((acc, it) => {
    const c = calcItem(it)
    return { base: acc.base + (it.tasa_iva !== 'EXENTO' ? c.subtotal : 0), iva10: acc.iva10 + (it.tasa_iva === 'IVA_10' ? c.monto_iva : 0), iva5: acc.iva5 + (it.tasa_iva === 'IVA_5' ? c.monto_iva : 0), exento: acc.exento + (it.tasa_iva === 'EXENTO' ? c.total : 0), total: acc.total + c.total }
  }, { base: 0, iva10: 0, iva5: 0, exento: 0, total: 0 })

  const mut = useMutation({
    mutationFn: () => apiClient.post('/facturacion/facturas/', {
      cliente_id: clienteId ? Number(clienteId) : null,
      condicion,
      notas: notas || null,
      items: items.map(it => ({
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        tasa_iva: it.tasa_iva,
        precio_incluye_iva: it.precio_incluye_iva,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facturas'] }); onSuccess() },
  })

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cliente (opcional)</label>
          <select value={clienteId} onChange={e => setClienteId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Sin cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.ruc ? ` — RUC: ${c.ruc}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Condición</label>
          <select value={condicion} onChange={e => setCondicion(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>
        </div>
      </div>

      {/* Ítems */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Ítems</p>
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
            <Plus size={12} /> Agregar ítem
          </button>
        </div>
        {items.map((it, i) => {
          const c = calcItem(it)
          return (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="Descripción"
                  value={it.descripcion}
                  onChange={e => updateItem(i, 'descripcion', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                />
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Cantidad</label>
                  <input type="number" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">Precio (Gs.)</label>
                  <input type="number" value={it.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-0.5">IVA</label>
                  <select value={it.tasa_iva} onChange={e => updateItem(i, 'tasa_iva', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                    <option value="IVA_10">10%</option>
                    <option value="IVA_5">5%</option>
                    <option value="EXENTO">Exento</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <label className="text-xs text-gray-500 mb-1">
                    <input type="checkbox" checked={it.precio_incluye_iva}
                      onChange={e => updateItem(i, 'precio_incluye_iva', e.target.checked)}
                      className="mr-1" />
                    Precio c/IVA
                  </label>
                  <span className="text-xs font-semibold text-indigo-700">{gs(c.total)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Resumen */}
      <div className="bg-indigo-50 rounded-xl p-4 text-sm space-y-1">
        {totales.base > 0 && <div className="flex justify-between text-gray-600"><span>Base gravada</span><span>{gs(totales.base)}</span></div>}
        {totales.iva10 > 0 && <div className="flex justify-between text-gray-600"><span>IVA 10%</span><span>{gs(totales.iva10)}</span></div>}
        {totales.iva5 > 0 && <div className="flex justify-between text-gray-600"><span>IVA 5%</span><span>{gs(totales.iva5)}</span></div>}
        {totales.exento > 0 && <div className="flex justify-between text-gray-600"><span>Exento</span><span>{gs(totales.exento)}</span></div>}
        <div className="flex justify-between font-bold text-gray-800 border-t border-indigo-200 pt-1">
          <span>Total</span><span>{gs(totales.total)}</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      {mut.isError && <p className="text-xs text-red-600">Error al crear la factura. Revisá los datos.</p>}

      <button onClick={() => mut.mutate()} disabled={mut.isPending || items.some(it => !it.descripcion || !it.precio_unitario)}
        className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {mut.isPending ? 'Creando...' : 'Emitir factura'}
      </button>
    </div>
  )
}

// ─── Tab Clientes ─────────────────────────────────────────────────────────────

function TabClientes() {
  const qc = useQueryClient()
  const { data: clientes = [] } = useQuery<FacCliente[]>({ queryKey: ['fac-clientes'], queryFn: () => apiClient.get('/facturacion/clientes/').then(r => r.data) })
  const [form, setForm] = useState({ nombre: '', ruc: '', email: '', telefono: '' })
  const [showForm, setShowForm] = useState(false)

  const crear = useMutation({
    mutationFn: () => apiClient.post('/facturacion/clientes/', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fac-clientes'] }); setForm({ nombre: '', ruc: '', email: '', telefono: '' }); setShowForm(false) },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">{clientes.length} clientes</p>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            {(['nombre', 'ruc', 'email', 'telefono'] as const).map(f => (
              <div key={f}>
                <label className="text-xs font-medium text-gray-600 block mb-1 capitalize">{f === 'ruc' ? 'RUC' : f}</label>
                <input value={form[f]} onChange={e => setForm(v => ({ ...v, [f]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={() => crear.mutate()} disabled={!form.nombre || crear.isPending}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {crear.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {clientes.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="font-medium text-gray-800 text-sm">{c.nombre}</p>
            <div className="flex gap-4 mt-1">
              {c.ruc && <span className="text-xs text-gray-500">RUC: {c.ruc}</span>}
              {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
              {c.telefono && <span className="text-xs text-gray-500">{c.telefono}</span>}
            </div>
          </div>
        ))}
        {clientes.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Sin clientes aún</p>}
      </div>
    </div>
  )
}

// ─── Tab Numeración DNIT ──────────────────────────────────────────────────────

interface NumeracionOut {
  codigo_establecimiento: string
  punto_expedicion: string
  siguiente_numero: number
  serie: string | null
  timbrado: string | null
  timbrado_vigencia_desde: string | null
  timbrado_vigencia_hasta: string | null
  proximo_numero_formateado: string
}

function TabNumeracion() {
  const qc = useQueryClient()
  const { data: num } = useQuery<NumeracionOut>({
    queryKey: ['fac-numeracion'],
    queryFn: () => apiClient.get('/facturacion/numeracion/').then(r => r.data),
  })

  // Estado secciones
  const [estForm, setEstForm] = useState({ codigo_establecimiento: '', punto_expedicion: '' })
  const [estSaved, setEstSaved] = useState(false)

  const [timbForm, setTimbForm] = useState({ timbrado: '', timbrado_vigencia_desde: '', timbrado_vigencia_hasta: '' })
  const [timbSaved, setTimbSaved] = useState(false)

  const [resetNum, setResetNum] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetOk, setResetOk] = useState(false)

  const mutEst = useMutation({
    mutationFn: () => apiClient.patch('/facturacion/numeracion/establecimiento-expedicion', {
      codigo_establecimiento: estForm.codigo_establecimiento || undefined,
      punto_expedicion: estForm.punto_expedicion || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fac-numeracion'] }); setEstSaved(true); setTimeout(() => setEstSaved(false), 2000) },
  })

  const mutTimb = useMutation({
    mutationFn: () => apiClient.patch('/facturacion/numeracion/timbrado', {
      timbrado: timbForm.timbrado,
      timbrado_vigencia_desde: timbForm.timbrado_vigencia_desde,
      timbrado_vigencia_hasta: timbForm.timbrado_vigencia_hasta,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fac-numeracion'] }); setTimbSaved(true); setTimeout(() => setTimbSaved(false), 2000) },
  })

  const mutReset = useMutation({
    mutationFn: () => apiClient.post('/facturacion/numeracion/resetear-correlativo', {
      nuevo_numero: Number(resetNum),
      confirmacion: resetConfirm,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fac-numeracion'] }); setResetOk(true); setResetNum(''); setResetConfirm(''); setTimeout(() => setResetOk(false), 3000) },
    onError: (e: { response?: { data?: { detail?: string } } }) => setResetErr(e?.response?.data?.detail ?? 'Error al resetear'),
  })

  if (!num) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  // Preview en vivo con los cambios del form
  const estPrev = (estForm.codigo_establecimiento || num.codigo_establecimiento).padStart(3, '0')
  const ptoPrev = (estForm.punto_expedicion || num.punto_expedicion).padStart(3, '0')
  const numPrev = String(num.siguiente_numero).padStart(7, '0')
  const preview = num.serie ? `${estPrev}-${ptoPrev}-${num.serie}${numPrev}` : `${estPrev}-${ptoPrev}-${numPrev}`

  return (
    <div className="space-y-6 max-w-lg">

      {/* Estado actual */}
      <div className="bg-indigo-50 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Próxima factura</p>
        <p className="font-mono font-bold text-indigo-700 text-2xl tracking-widest">{preview}</p>
        {num.serie && (
          <p className="text-xs text-indigo-500 mt-1">Serie activa: <span className="font-mono font-bold">{num.serie}</span></p>
        )}
        <div className="flex gap-6 mt-3 text-xs text-gray-500">
          <span>Establecimiento: <span className="font-mono font-bold text-gray-700">{num.codigo_establecimiento}</span></span>
          <span>Punto exp.: <span className="font-mono font-bold text-gray-700">{num.punto_expedicion}</span></span>
          <span>Correlativo: <span className="font-mono font-bold text-gray-700">{num.siguiente_numero.toLocaleString('es-PY')}</span></span>
        </div>
      </div>

      {/* Timbrado actual */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Timbrado DNIT vigente</p>
        {num.timbrado ? (
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-500">N° Timbrado:</span> <span className="font-mono font-bold text-gray-800">{num.timbrado}</span></p>
            <p><span className="text-gray-500">Vigencia:</span> {num.timbrado_vigencia_desde?.slice(0, 10)} → {num.timbrado_vigencia_hasta?.slice(0, 10)}</p>
          </div>
        ) : (
          <p className="text-sm text-orange-600 font-medium">Sin timbrado registrado — requerido para emitir facturas legales</p>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Sección 1: Establecimiento y punto de expedición */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Establecimiento y punto de expedición</p>
        <p className="text-xs text-gray-400">Ceros obligatorios. Cambiar el punto de expedición NO reinicia el correlativo.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Código establecimiento</label>
            <input
              value={estForm.codigo_establecimiento}
              onChange={e => setEstForm(v => ({ ...v, codigo_establecimiento: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
              placeholder={num.codigo_establecimiento}
              maxLength={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Punto de expedición</label>
            <input
              value={estForm.punto_expedicion}
              onChange={e => setEstForm(v => ({ ...v, punto_expedicion: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
              placeholder={num.punto_expedicion}
              maxLength={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <button
          onClick={() => mutEst.mutate()}
          disabled={mutEst.isPending || (!estForm.codigo_establecimiento && !estForm.punto_expedicion)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {estSaved ? <><Check size={12} /> Guardado</> : mutEst.isPending ? 'Guardando...' : 'Actualizar'}
        </button>
      </div>

      <hr className="border-gray-100" />

      {/* Sección 2: Timbrado */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Registrar nuevo timbrado</p>
        <p className="text-xs text-gray-400">Al activar un nuevo timbrado podés reiniciar el correlativo desde 1 en la sección inferior.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">N° Timbrado</label>
            <input
              value={timbForm.timbrado}
              onChange={e => setTimbForm(v => ({ ...v, timbrado: e.target.value.replace(/\D/g, '') }))}
              placeholder="12345678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Vigencia desde</label>
            <input type="date" value={timbForm.timbrado_vigencia_desde}
              onChange={e => setTimbForm(v => ({ ...v, timbrado_vigencia_desde: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Vigencia hasta</label>
            <input type="date" value={timbForm.timbrado_vigencia_hasta}
              onChange={e => setTimbForm(v => ({ ...v, timbrado_vigencia_hasta: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        {mutTimb.isError && <p className="text-xs text-red-600">Verificá que las fechas sean válidas y el timbrado sea numérico.</p>}
        <button
          onClick={() => mutTimb.mutate()}
          disabled={mutTimb.isPending || !timbForm.timbrado || !timbForm.timbrado_vigencia_desde || !timbForm.timbrado_vigencia_hasta}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {timbSaved ? <><Check size={12} /> Timbrado registrado</> : mutTimb.isPending ? 'Guardando...' : 'Registrar timbrado'}
        </button>
      </div>

      <hr className="border-gray-100" />

      {/* Sección 3: Resetear correlativo */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Resetear correlativo</p>
        <p className="text-xs text-gray-400">
          Solo se puede retroceder hasta 1 (nuevo timbrado). No se puede retroceder a un número intermedio.
          La DNIT exige correlatividad ininterrumpida.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nuevo número desde</label>
            <input
              type="number"
              min={1}
              max={9999999}
              value={resetNum}
              onChange={e => { setResetNum(e.target.value); setResetErr('') }}
              placeholder="1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Escribí CONFIRMAR</label>
            <input
              value={resetConfirm}
              onChange={e => { setResetConfirm(e.target.value); setResetErr('') }}
              placeholder="CONFIRMAR"
              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        {resetErr && <p className="text-xs text-red-600">{resetErr}</p>}
        {resetOk && <p className="text-xs text-green-700 font-medium flex items-center gap-1"><Check size={12} /> Correlativo actualizado</p>}
        <button
          onClick={() => { setResetErr(''); mutReset.mutate() }}
          disabled={mutReset.isPending || !resetNum || resetConfirm !== 'CONFIRMAR'}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {mutReset.isPending ? 'Procesando...' : 'Resetear correlativo'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab Configuración general ────────────────────────────────────────────────

function TabConfig() {
  const qc = useQueryClient()
  const { data: cfg } = useQuery<FacConfig>({ queryKey: ['fac-config'], queryFn: () => apiClient.get('/facturacion/config/').then(r => r.data) })
  const [form, setForm] = useState<Partial<FacConfig>>({})
  const [saved, setSaved] = useState(false)

  const mut = useMutation({
    mutationFn: () => apiClient.put('/facturacion/config/', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fac-config'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  if (!cfg) return null
  const strVal = (k: keyof FacConfig) => String((form[k] !== undefined ? form[k] : cfg[k]) ?? '')

  return (
    <div className="space-y-4 max-w-lg">
      <div className="grid sm:grid-cols-2 gap-3">
        {([
          ['ruc', 'RUC emisor'],
          ['razon_social', 'Razón social'],
          ['direccion_fiscal', 'Dirección fiscal'],
          ['telefono_fiscal', 'Teléfono'],
        ] as [keyof FacConfig, string][]).map(([k, label]) => (
          <div key={k}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
            <input value={strVal(k)} onChange={e => setForm(v => ({ ...v, [k]: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        ))}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">IVA por defecto</label>
          <select value={strVal('tasa_iva_default')} onChange={e => setForm(v => ({ ...v, tasa_iva_default: e.target.value as TasaIVA }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="IVA_10">10%</option>
            <option value="IVA_5">5%</option>
            <option value="EXENTO">Exento</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(form.precio_incluye_iva ?? cfg.precio_incluye_iva)}
          onChange={e => setForm(v => ({ ...v, precio_incluye_iva: e.target.checked }))} />
        Los precios incluyen IVA por defecto
      </label>
      <button onClick={() => mut.mutate()} disabled={mut.isPending}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        {saved ? <><Check size={14} /> Guardado</> : mut.isPending ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = 'facturas' | 'nueva' | 'clientes' | 'numeracion' | 'config'

export default function Facturacion() {
  const [tab, setTab] = useState<Tab>('facturas')
  const [pagarFactura, setPagarFactura] = useState<FacturaOut | null>(null)
  const qc = useQueryClient()

  const { data: facturas = [], isLoading } = useQuery<FacturaOut[]>({
    queryKey: ['facturas'],
    queryFn: () => apiClient.get('/facturacion/facturas/').then(r => r.data),
  })
  const { data: clientes = [] } = useQuery<FacCliente[]>({
    queryKey: ['fac-clientes'],
    queryFn: () => apiClient.get('/facturacion/clientes/').then(r => r.data),
  })
  const { data: config } = useQuery<FacConfig>({
    queryKey: ['fac-config'],
    queryFn: () => apiClient.get('/facturacion/config/').then(r => r.data),
  })

  const cancelarMut = useMutation({
    mutationFn: (id: number) => apiClient.post(`/facturacion/facturas/${id}/cancelar`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })

  const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: 'facturas', label: 'Facturas', icon: FileText },
    { id: 'nueva', label: 'Nueva', icon: Plus },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'numeracion', label: 'Numeración', icon: Hash },
    { id: 'config', label: 'Config.', icon: Settings },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FileText className="text-gray-500" size={20} />
        <h1 className="text-xl font-bold text-gray-800">Facturación</h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'facturas' && (
        <div className="space-y-3">
          {isLoading && <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}
          {!isLoading && facturas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin facturas aún</p>
              <button onClick={() => setTab('nueva')} className="mt-3 text-indigo-600 text-sm hover:underline">Crear primera factura</button>
            </div>
          )}
          {facturas.map(f => (
            <FilaFactura key={f.id} f={f}
              onPagar={() => setPagarFactura(f)}
              onCancelar={() => cancelarMut.mutate(f.id)}
            />
          ))}
        </div>
      )}

      {tab === 'nueva' && config && (
        <NuevaFactura clientes={clientes} config={config} onSuccess={() => setTab('facturas')} />
      )}

      {tab === 'clientes' && <TabClientes />}
      {tab === 'numeracion' && <TabNumeracion />}
      {tab === 'config' && <TabConfig />}

      {pagarFactura && (
        <ModalPago factura={pagarFactura} onClose={() => setPagarFactura(null)} onSuccess={() => setPagarFactura(null)} />
      )}
    </div>
  )
}
