import { useState, Fragment, type ElementType } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Shield, Building2, Users, Activity, TrendingUp, AlertTriangle,
  Plus, ChevronDown, ChevronUp, Check, X, Clock, Zap, Wallet, Coins, Banknote,
} from 'lucide-react'
import apiClient from '../../api/client'
import { clsx } from 'clsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_organizaciones: number
  total_usuarios: number
  organizaciones_activas: number
  mrr_guaranies: number
  arr_estimado_guaranies: number
  mantenimiento_anual_guaranies: number
  pago_unico_activos_guaranies: number
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
  tipo_licencia: 'suscripcion' | 'perpetua'
  monto_pago_unico: number | null
  monto_mantenimiento_anual: number | null
  fecha_vencimiento: string | null
  factura_electronica_activa: boolean
}

interface Vencimiento {
  suscripcion_id: number
  org_id: number
  org_nombre: string
  rubro: string
  plan: string
  tipo_licencia: 'suscripcion' | 'perpetua'
  estado: string
  fecha_vencimiento: string | null
  monto_mensual: number
  monto_mantenimiento_anual: number
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

const TIPO_BADGE: Record<string, string> = {
  suscripcion: 'bg-indigo-100 text-indigo-700',
  perpetua: 'bg-teal-100 text-teal-700',
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Wallet} label="ARR estimado" value={gs(stats.arr_estimado_guaranies)} sub="MRR×12 + mantenimientos" />
        <KpiCard icon={Coins} label="Mantenimientos anuales" value={gs(stats.mantenimiento_anual_guaranies)} sub="licencias perpetuas activas" />
        <KpiCard icon={Banknote} label="Pago único (activos)" value={gs(stats.pago_unico_activos_guaranies)} sub="histórico de licencias perpetuas vigentes" />
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
  tipo_licencia: 'suscripcion', monto_mensual: '', dias_prueba: '30',
  monto_pago_unico: '', monto_mantenimiento_anual: '',
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
      monto_pago_unico: form.monto_pago_unico ? Number(form.monto_pago_unico) : null,
      monto_mantenimiento_anual: form.monto_mantenimiento_anual ? Number(form.monto_mantenimiento_anual) : null,
      dias_prueba: Number(form.dias_prueba),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orgs'] }); setShowForm(false); setForm(EMPTY_FORM) },
    onError: () => setFormErr('Error al crear la organización'),
  })

  const toggle = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/admin/organizaciones/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orgs'] }),
  })

  const toggleElec = useMutation({
    mutationFn: (id: number) => apiClient.patch(`/admin/organizaciones/${id}/facturacion-electronica`),
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
            ] as [keyof typeof EMPTY_FORM, string][]).map(([k, label]) => (
              <div key={k}>
                <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                <input
                  type={k === 'admin_password' ? 'password' : 'text'}
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
              <label className="text-xs font-medium text-gray-500 block mb-1">Tipo de licencia</label>
              <select value={form.tipo_licencia} onChange={e => setForm(f => ({ ...f, tipo_licencia: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                <option value="suscripcion">Suscripción (mensual)</option>
                <option value="perpetua">Licencia perpetua (pago único)</option>
              </select>
            </div>
            {form.tipo_licencia === 'perpetua' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Pago único (₲)</label>
                  <input type="number" value={form.monto_pago_unico}
                    onChange={e => setForm(f => ({ ...f, monto_pago_unico: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Mantenimiento anual (₲, opcional)</label>
                  <input type="number" value={form.monto_mantenimiento_anual}
                    onChange={e => setForm(f => ({ ...f, monto_mantenimiento_anual: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Precio mensual (₲)</label>
                  <input type="number" value={form.monto_mensual}
                    onChange={e => setForm(f => ({ ...f, monto_mensual: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Días de prueba</label>
                  <select value={form.dias_prueba} onChange={e => setForm(f => ({ ...f, dias_prueba: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                    {[7, 14, 30, 60].map(d => <option key={d} value={d}>{d} días</option>)}
                  </select>
                </div>
              </>
            )}
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
              {['Organización', 'Rubro', 'Plan', 'Licencia', 'Usuarios', 'MRR / Pago único', 'Vence', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
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
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', TIPO_BADGE[org.tipo_licencia] ?? 'bg-gray-100 text-gray-600')}>
                      {org.tipo_licencia === 'perpetua' ? 'Perpetua' : 'Suscripción'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{org.total_usuarios}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {org.tipo_licencia === 'perpetua'
                      ? (org.monto_pago_unico ? gs(org.monto_pago_unico) : '—')
                      : (org.mrr ? gs(org.mrr) : '—')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(org.fecha_vencimiento)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', ESTADO_BADGE[org.estado] ?? 'bg-gray-100 text-gray-500')}>
                      {org.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {org.factura_electronica_activa && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                          <Zap size={9} /> e-Fac
                        </span>
                      )}
                      <button
                        onClick={() => setExpandedId(expandedId === org.id ? null : org.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        Acciones {expandedId === org.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === org.id && (
                  <tr className="bg-indigo-50/30">
                    <td colSpan={9} className="px-6 py-3">
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
                        <button
                          onClick={() => toggleElec.mutate(org.id)}
                          className={clsx(
                            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                            org.factura_electronica_activa
                              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          )}
                        >
                          <Zap size={11} />
                          {org.factura_electronica_activa ? 'Desactivar e-Factura' : 'Activar e-Factura'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!isLoading && orgs.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">Sin organizaciones</td></tr>
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
  const [syncMsg, setSyncMsg] = useState('')

  const { data: vencimientos = [], isLoading } = useQuery<Vencimiento[]>({
    queryKey: ['admin-vencimientos', dias],
    queryFn: () => apiClient.get(`/admin/vencimientos?dias=${dias}`).then(r => r.data),
  })

  const sincronizar = useMutation({
    mutationFn: () => apiClient.post('/admin/sincronizar-vencimientos').then(r => r.data),
    onSuccess: (data: { suscripciones_marcadas_vencidas: number; organizaciones_suspendidas: number }) => {
      qc.invalidateQueries({ queryKey: ['admin-vencimientos'] })
      qc.invalidateQueries({ queryKey: ['admin-orgs'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      setSyncMsg(`${data.suscripciones_marcadas_vencidas} marcadas vencidas · ${data.organizaciones_suspendidas} suspendidas`)
      setTimeout(() => setSyncMsg(''), 5000)
    },
  })

  const extender = useMutation({
    mutationFn: ({ orgId, esPerpetua }: { orgId: number; esPerpetua: boolean }) =>
      apiClient.post(`/admin/organizaciones/${orgId}/extender`, {
        dias: diasExt,
        monto_mensual: esPerpetua ? null : (monto ? Number(monto) : null),
        monto_mantenimiento_anual: esPerpetua ? (monto ? Number(monto) : null) : null,
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{vencimientos.length} suscripciones</p>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-xs text-gray-500">{syncMsg}</span>}
          <button
            onClick={() => sincronizar.mutate()}
            disabled={sincronizar.isPending}
            title="Marca vencida la suscripción/mantenimiento de orgs cuya fecha ya pasó, y suspende las que superaron el período de gracia"
            className="flex items-center gap-1 text-xs border border-gray-200 rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Clock size={12} /> {sincronizar.isPending ? 'Sincronizando...' : 'Sincronizar vencimientos'}
          </button>
          <select value={dias} onChange={e => setDias(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700">
            {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>Próximos {d} días</option>)}
          </select>
        </div>
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
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', TIPO_BADGE[v.tipo_licencia] ?? 'bg-gray-100')}>
                      {v.tipo_licencia === 'perpetua' ? 'Mantenimiento' : 'Suscripción'}
                    </span>
                    <span className="text-xs text-gray-500">{v.plan}</span>
                    <span className="text-xs text-gray-400">{fmtDate(v.fecha_vencimiento)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {diasBadge(v.dias_restantes)}
                <span className="text-xs font-mono text-gray-700">
                  {v.tipo_licencia === 'perpetua'
                    ? (v.monto_mantenimiento_anual ? gs(v.monto_mantenimiento_anual) : '—')
                    : (v.monto_mensual ? gs(v.monto_mensual) : '—')}
                </span>
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
                      onClick={() => extender.mutate({ orgId: v.org_id, esPerpetua: v.tipo_licencia === 'perpetua' })}
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
                    onClick={() => {
                      setExtendiendo(v.org_id)
                      setDiasExt(v.tipo_licencia === 'perpetua' ? 365 : 30)
                      const actual = v.tipo_licencia === 'perpetua' ? v.monto_mantenimiento_anual : v.monto_mensual
                      setMonto(actual ? String(actual) : '')
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {v.tipo_licencia === 'perpetua' ? 'Renovar →' : 'Extender →'}
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
    monto_mantenimiento_anual: '',
    metodo_pago: 'transferencia',
    referencia: '',
  })
  const [success, setSuccess] = useState(false)

  const selOrg = orgs.find(o => String(o.id) === form.org_id)
  const esPerpetua = selOrg?.tipo_licencia === 'perpetua'
  const sinMantenimiento = esPerpetua && !selOrg?.fecha_vencimiento

  const extender = useMutation({
    mutationFn: () => apiClient.post(`/admin/organizaciones/${form.org_id}/extender`, {
      dias: Number(form.dias),
      monto_mensual: esPerpetua ? null : (form.monto_mensual ? Number(form.monto_mensual) : null),
      monto_mantenimiento_anual: esPerpetua ? (form.monto_mantenimiento_anual ? Number(form.monto_mantenimiento_anual) : null) : null,
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
    setForm(f => ({
      ...f,
      org_id: id,
      monto_mensual: org?.mrr ? String(org.mrr) : f.monto_mensual,
      monto_mantenimiento_anual: org?.monto_mantenimiento_anual ? String(org.monto_mantenimiento_anual) : f.monto_mantenimiento_anual,
      dias: org?.tipo_licencia === 'perpetua' ? '365' : f.dias,
    }))
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-gray-600">
        {esPerpetua ? 'Registrá el cobro de mantenimiento anual de una licencia perpetua.' : 'Registrá un pago y extendé la suscripción de una organización.'}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1.5">Organización</label>
          <select value={form.org_id} onChange={e => handleOrgChange(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">Seleccioná una organización...</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.nombre} — {o.plan} {o.tipo_licencia === 'perpetua' ? '(perpetua)' : ''}</option>)}
          </select>
          {selOrg && (
            <p className="text-xs text-gray-400 mt-1">
              Vence: {fmtDate(selOrg.fecha_vencimiento)} · Estado: {selOrg.estado}
            </p>
          )}
        </div>

        {sinMantenimiento && (
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-xl px-4 py-3 text-xs">
            <AlertTriangle size={14} className="shrink-0" />
            Esta organización tiene licencia perpetua sin mantenimiento recurrente — no vence ni requiere renovación.
            Completá el formulario solo si vas a activarle un mantenimiento anual desde ahora.
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              {esPerpetua ? 'Mantenimiento cobrado (₲)' : 'Monto cobrado (₲)'}
            </label>
            <input
              type="number"
              value={esPerpetua ? form.monto_mantenimiento_anual : form.monto_mensual}
              onChange={e => setForm(f => esPerpetua
                ? { ...f, monto_mantenimiento_anual: e.target.value }
                : { ...f, monto_mensual: e.target.value })}
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
            <Check size={14} /> Pago registrado {esPerpetua ? 'y mantenimiento renovado' : 'y suscripción extendida'} correctamente.
          </div>
        )}
        {extender.isError && <p className="text-sm text-red-600">Error al registrar el pago.</p>}

        <button
          onClick={() => extender.mutate()}
          disabled={!form.org_id || extender.isPending}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
        >
          {extender.isPending ? 'Procesando...' : esPerpetua ? 'Registrar pago y renovar mantenimiento' : 'Registrar pago y extender suscripción'}
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
