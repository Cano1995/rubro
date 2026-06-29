import { useState, Fragment, type ElementType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Building2, Users, Activity, TrendingUp, AlertTriangle,
  Plus, ChevronDown, ChevronUp, Check, X, Clock,
} from 'lucide-react'
import apiClient from '../../api/client'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_organizaciones: number
  total_usuarios: number
  organizaciones_activas: number
  mrr_guaranies: number
  vencimientos_proximos_7_dias: number
  by_rubro: Record<string, number>
}

interface OrgAdmin {
  id: number
  nombre: string
  rubro: string
  plan: string
  estado: string
  activo: boolean
  created_at: string
  total_usuarios: number
  mrr: number
  fecha_vencimiento: string | null
}

interface Vencimiento {
  suscripcion_id: number
  org_id: number
  org_nombre: string
  rubro: string
  plan: string
  estado: string
  fecha_vencimiento: string | null
  monto_mensual: number
  dias_restantes: number
}

interface UsuarioAdmin {
  id: number
  nombre: string
  email: string
  rol: string
  activo: boolean
  organizacion_id: number | null
  created_at: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gs(n: number) {
  if (n >= 1_000_000) return `₲${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `₲${(n / 1000).toFixed(0)}k`
  return `₲${Math.round(n).toLocaleString('es-PY')}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PY')
}

function diasBadge(dias: number) {
  if (dias <= 3) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{dias}d</span>
  if (dias <= 7) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{dias}d</span>
  if (dias <= 14) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{dias}d</span>
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{dias}d</span>
}

const RUBRO_BADGE: Record<string, string> = {
  veterinaria: 'bg-emerald-100 text-emerald-700',
  belleza: 'bg-pink-100 text-pink-700',
  roperia: 'bg-violet-100 text-violet-700',
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-500',
  basico: 'bg-blue-100 text-blue-700',
  pro: 'bg-amber-100 text-amber-700',
}

const ESTADO_BADGE: Record<string, string> = {
  activa: 'bg-green-100 text-green-700',
  prueba: 'bg-yellow-100 text-yellow-700',
  suspendida: 'bg-red-100 text-red-700',
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, alert = false }: {
  icon: ElementType; label: string; value: string | number; sub?: string; alert?: boolean
}) {
  return (
    <div className={clsx('bg-white rounded-2xl border p-5 shadow-sm', alert ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-100')}>
      <Icon size={16} className={clsx('mb-2', alert ? 'text-red-500' : 'text-indigo-500')} />
      <p className={clsx('text-2xl font-bold', alert ? 'text-red-600' : 'text-gray-900')}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function TabOverview({ stats }: { stats: Stats | undefined }) {
  if (!stats) return <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Building2} label="Organizaciones" value={stats.total_organizaciones} />
        <KpiCard icon={Activity} label="Activas" value={stats.organizaciones_activas} />
        <KpiCard icon={Users} label="Usuarios" value={stats.total_usuarios} />
        <KpiCard icon={TrendingUp} label="MRR" value={gs(stats.mrr_guaranies)} sub="mensual recurrente" />
        <KpiCard
          icon={AlertTriangle}
          label="Vencen en 7 días"
          value={stats.vencimientos_proximos_7_dias}
          alert={stats.vencimientos_proximos_7_dias > 0}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Por rubro</p>
        <div className="flex gap-6">
          {Object.entries(stats.by_rubro).map(([rubro, n]) => (
            <div key={rubro} className="text-center">
              <span className={clsx('text-xs font-bold px-3 py-1 rounded-full', RUBRO_BADGE[rubro] ?? 'bg-gray-100 text-gray-600')}>
                {rubro}
              </span>
              <p className="text-2xl font-bold text-gray-800 mt-2">{n}</p>
            </div>
          ))}
          {Object.keys(stats.by_rubro).length === 0 && <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Organizaciones ──────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre: '', rubro: 'veterinaria', plan: 'free',
  admin_nombre: '', admin_apellido: '', admin_email: '', admin_password: '',
  monto_mensual: '', dias_prueba: '30',
}

function TabOrganizaciones() {
  const qc = useQueryClient()
  const { data: orgs = [], isLoading } = useQuery<OrgAdmin[]>({
    queryKey: ['admin-orgs'],
    queryFn: () => apiClient.get('/admin/organizaciones').then(r => r.data),
  })

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErr, setFormErr] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const crear = useMutation({
    mutationFn: () => apiClient.post('/admin/organizaciones', {
      ...form,
      monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null,
      dias_prueba: Number(form.dias_prueba),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orgs'] }); setShowForm(false); setForm(EMPTY_FORM) },
    onError: () => setFormErr('Error al crear la organización'),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/admin/organizaciones/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orgs'] }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{orgs.length} organizaciones</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Nueva organización
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-200">
          <p className="font-semibold text-gray-700 text-sm">Nueva organización + administrador</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              ['nombre', 'Nombre organización'],
              ['admin_nombre', 'Nombre admin'],
              ['admin_apellido', 'Apellido admin'],
              ['admin_email', 'Email admin'],
              ['admin_password', 'Contraseña inicial'],
              ['monto_mensual', 'Precio mensual (₲)'],
            ] as [keyof typeof EMPTY_FORM, string][]).map(([k, label]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                <input
                  type={k === 'admin_password' ? 'password' : k === 'monto_mensual' ? 'number' : 'text'}
                  value={form[k]}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Rubro</label>
              <select value={form.rubro} onChange={e => setForm(f => ({ ...f, rubro: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="veterinaria">Veterinaria</option>
                <option value="belleza">Belleza</option>
                <option value="roperia">Ropería</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Plan</label>
              <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="free">Free</option>
                <option value="basico">Básico</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Días de prueba</label>
              <select value={form.dias_prueba} onChange={e => setForm(f => ({ ...f, dias_prueba: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                {[7, 14, 30, 60].map(d => <option key={d} value={d}>{d} días</option>)}
              </select>
            </div>
          </div>
          {formErr && <p className="text-xs text-red-600">{formErr}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setFormErr('') }}
              className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancelar
            </button>
            <button
              onClick={() => { setFormErr(''); crear.mutate() }}
              disabled={crear.isPending || !form.nombre || !form.admin_email || !form.admin_password}
              className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {crear.isPending ? 'Creando...' : 'Crear organización'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['Organización', 'Rubro', 'Plan', 'Usuarios', 'MRR', 'Vence', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
              ))}</tr>
            ))}
            {orgs.map(org => (
              <Fragment key={org.id}>
                <tr className={clsx('hover:bg-gray-50 transition-colors', !org.activo && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold', RUBRO_BADGE[org.rubro]?.replace('text-', 'bg-').split(' ')[0] ?? 'bg-gray-400')}>
                        {org.nombre[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{org.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', RUBRO_BADGE[org.rubro] ?? 'bg-gray-100 text-gray-600')}>
                      {org.rubro}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', PLAN_BADGE[org.plan] ?? 'bg-gray-100 text-gray-600')}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{org.total_usuarios}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{org.mrr ? gs(org.mrr) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(org.fecha_vencimiento)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', ESTADO_BADGE[org.estado] ?? 'bg-gray-100 text-gray-500')}>
                      {org.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      Acciones {expandedId === org.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </td>
                </tr>
                {expandedId === org.id && (
                  <tr className="bg-indigo-50/30">
                    <td colSpan={8} className="px-6 py-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => toggle.mutate(org.id)}
                          className={clsx(
                            'flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            org.activo
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          )}
                        >
                          {org.activo ? <><X size={12} /> Suspender</> : <><Check size={12} /> Activar</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!isLoading && orgs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">Sin organizaciones</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Vencimientos ────────────────────────────────────────────────────────

function TabVencimientos() {
  const qc = useQueryClient()
  const [dias, setDias] = useState(30)
  const [extendiendo, setExtendiendo] = useState<number | null>(null)
  const [diasExt, setDiasExt] = useState(30)
  const [monto, setMonto] = useState('')

  const { data: vencimientos = [], isLoading } = useQuery<Vencimiento[]>({
    queryKey: ['admin-vencimientos', dias],
    queryFn: () => apiClient.get(`/admin/vencimientos?dias=${dias}`).then(r => r.data),
  })

  const extender = useMutation({
    mutationFn: (orgId: number) => apiClient.post(`/admin/organizaciones/${orgId}/extender`, {
      dias: diasExt,
      monto_mensual: monto ? Number(monto) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-vencimientos'] })
      qc.invalidateQueries({ queryKey: ['admin-orgs'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setExtendiendo(null)
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{vencimientos.length} suscripciones</p>
        <select value={dias} onChange={e => setDias(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700">
          {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Próximos {d} días</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading && <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}
        {vencimientos.map(v => (
          <div key={v.suscripcion_id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 text-sm">{v.org_nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', RUBRO_BADGE[v.rubro] ?? 'bg-gray-100')}>{v.rubro}</span>
                    <span className="text-xs text-gray-500">{v.plan}</span>
                    <span className="text-xs text-gray-400">{fmtDate(v.fecha_vencimiento)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {diasBadge(v.dias_restantes)}
                <span className="text-xs font-mono text-gray-700">{v.monto_mensual ? gs(v.monto_mensual) : '—'}</span>
                {extendiendo === v.org_id ? (
                  <div className="flex items-center gap-1">
                    <select value={diasExt} onChange={e => setDiasExt(Number(e.target.value))}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                      {[7, 14, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>{d}d</option>)}
                    </select>
                    <input
                      type="number"
                      value={monto}
                      onChange={e => setMonto(e.target.value)}
                      placeholder="₲ monto"
                      className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1 font-mono"
                    />
                    <button
                      onClick={() => extender.mutate(v.org_id)}
                      disabled={extender.isPending}
                      className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {extender.isPending ? '...' : 'OK'}
                    </button>
                    <button onClick={() => setExtendiendo(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setExtendiendo(v.org_id); setMonto(v.monto_mensual ? String(v.monto_mensual) : '') }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Extender →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!isLoading && vencimientos.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-12">No hay vencimientos en los próximos {dias} días</p>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Pagos / Suscripciones ───────────────────────────────────────────────

function TabPagos() {
  const qc = useQueryClient()
  const { data: orgs = [] } = useQuery<OrgAdmin[]>({
    queryKey: ['admin-orgs'],
    queryFn: () => apiClient.get('/admin/organizaciones').then(r => r.data),
  })

  const [form, setForm] = useState({
    org_id: '',
    dias: '30',
    monto_mensual: '',
    metodo_pago: 'transferencia',
    referencia: '',
  })
  const [success, setSuccess] = useState(false)

  const extender = useMutation({
    mutationFn: () => apiClient.post(`/admin/organizaciones/${form.org_id}/extender`, {
      dias: Number(form.dias),
      monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null,
      metodo_pago: form.metodo_pago,
      referencia: form.referencia || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orgs'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['admin-vencimientos'] })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  function handleOrgChange(id: string) {
    const org = orgs.find(o => String(o.id) === id)
    setForm(f => ({ ...f, org_id: id, monto_mensual: org?.mrr ? String(org.mrr) : f.monto_mensual }))
  }

  const selOrg = orgs.find(o => String(o.id) === form.org_id)

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-gray-600">Registrá un pago y extendé la suscripción de una organización.</p>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Organización</label>
          <select value={form.org_id} onChange={e => handleOrgChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Seleccioná una organización...</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.nombre} — {o.plan}</option>)}
          </select>
          {selOrg && (
            <p className="text-xs text-gray-400 mt-1">
              Vence: {fmtDate(selOrg.fecha_vencimiento)} · Estado: {selOrg.estado}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Monto cobrado (₲)</label>
            <input type="number" value={form.monto_mensual} onChange={e => setForm(f => ({ ...f, monto_mensual: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono" placeholder="490000" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Extender (días)</label>
            <select value={form.dias} onChange={e => setForm(f => ({ ...f, dias: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {[7, 14, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>{d} días</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Método de pago</label>
          <select value={form.metodo_pago} onChange={e => setForm(f => ({ ...f, metodo_pago: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            {['transferencia', 'efectivo', 'cheque', 'tarjeta', 'otro'].map(m => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">N° Referencia / comprobante</label>
          <input type="text" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono" placeholder="TRF-2026-00123" />
        </div>

        {success && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-4 py-3 text-sm">
            <Check size={14} /> Pago registrado y suscripción extendida correctamente.
          </div>
        )}
        {extender.isError && <p className="text-sm text-red-600">Error al registrar el pago.</p>}

        <button
          onClick={() => extender.mutate()}
          disabled={!form.org_id || extender.isPending}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
        >
          {extender.isPending ? 'Procesando...' : 'Registrar pago y extender suscripción'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

function TabUsuarios() {
  const { data: usuarios = [], isLoading } = useQuery<UsuarioAdmin[]>({
    queryKey: ['admin-usuarios'],
    queryFn: () => apiClient.get('/admin/usuarios').then(r => r.data),
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            {['Usuario', 'Rol', 'Org ID', 'Estado', 'Registro'].map(h => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
              <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
            ))}</tr>
          ))}
          {usuarios.map(u => (
            <tr key={u.id} className={clsx('hover:bg-gray-50 transition-colors', !u.activo && 'opacity-50')}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-800">{u.nombre}</p>
                <p className="text-xs text-gray-400">{u.email}</p>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{u.rol}</span>
              </td>
              <td className="px-4 py-3 text-xs font-mono text-gray-500">{u.organizacion_id ?? '—'}</td>
              <td className="px-4 py-3">
                {u.activo
                  ? <span className="text-xs text-green-700 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Activo</span>
                  : <span className="text-xs text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full" />Inactivo</span>
                }
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                {u.created_at ? new Date(u.created_at).toLocaleDateString('es-PY') : '—'}
              </td>
            </tr>
          ))}
          {!isLoading && usuarios.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">Sin usuarios</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'organizaciones' | 'vencimientos' | 'pagos' | 'usuarios'

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('overview')

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient.get('/admin/stats').then(r => r.data),
    refetchInterval: 60_000,
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'organizaciones', label: 'Organizaciones' },
    { id: 'vencimientos', label: `Vencimientos${stats?.vencimientos_proximos_7_dias ? ` (${stats.vencimientos_proximos_7_dias})` : ''}` },
    { id: 'pagos', label: 'Registrar pago' },
    { id: 'usuarios', label: 'Usuarios' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="text-indigo-600" size={20} />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Panel Superadmin</h1>
          <p className="text-xs text-gray-400 mt-0.5">Control total del sistema Rubro</p>
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              tab === t.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <TabOverview stats={stats} />}
      {tab === 'organizaciones' && <TabOrganizaciones />}
      {tab === 'vencimientos' && <TabVencimientos />}
      {tab === 'pagos' && <TabPagos />}
      {tab === 'usuarios' && <TabUsuarios />}
    </div>
  )
}
