import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Building2, CreditCard, User, AlertTriangle } from 'lucide-react'
import { orgApi } from '../api/organizacion'
import { useToast } from '../components/ui/Toast'
import { InputField } from '../components/ui/FormField'
import { useAuth } from '../hooks/useAuth'
import { useSuscripcion } from '../hooks/useSuscripcion'

function gs(n: number) {
  return `₲${Math.round(n).toLocaleString('es-PY')}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-PY')
}

const RUBRO_LABEL: Record<string, string> = {
  veterinaria: '🐾 Veterinaria',
  belleza: '✂️ Belleza',
  roperia: '👗 Ropería',
}

const PLAN_INFO: Record<string, { label: string; color: string; features: string[] }> = {
  free: { label: 'Free', color: 'bg-gray-100 text-gray-600', features: ['1 usuario', 'Funciones básicas'] },
  basico: { label: 'Básico', color: 'bg-blue-100 text-blue-700', features: ['5 usuarios', 'Todas las funciones', 'Soporte por email'] },
  pro: { label: 'Pro', color: 'bg-amber-100 text-amber-700', features: ['Usuarios ilimitados', 'Reportes', 'Soporte prioritario', 'Exportación PDF/Excel'] },
}

export default function Configuracion() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const vencido = searchParams.get('vencido') === '1'

  const { data: org } = useQuery({
    queryKey: ['organizacion'],
    queryFn: orgApi.getMiOrg,
  })

  const [nombre, setNombre] = useState(org?.nombre ?? '')
  const [ruc, setRuc] = useState(org?.ruc ?? '')

  const { mutate: update, isPending } = useMutation({
    mutationFn: () => orgApi.update({ nombre, ruc: ruc || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organizacion'] }); toast('Configuración guardada') },
    onError: () => toast('Error al guardar', 'error'),
  })

  const plan = org?.plan ? PLAN_INFO[org.plan] : null
  const { suscripcion } = useSuscripcion()
  const esPerpetua = suscripcion?.tipo === 'perpetua'

  return (
    <div className="max-w-2xl space-y-6">
      {vencido && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <p>
            Tu {esPerpetua ? 'mantenimiento anual' : 'suscripción'} está vencida y algunas funciones quedaron
            bloqueadas. Renová para recuperar el acceso completo.
          </p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Settings className="text-gray-500" size={20} />
        <h1 className="text-xl font-bold text-gray-800">Configuración</h1>
      </div>

      {/* Organización */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-700">Mi negocio</h2>
        </div>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <div className="text-2xl">{RUBRO_LABEL[org?.rubro ?? '']?.split(' ')[0]}</div>
          <div>
            <p className="text-xs text-gray-500">Rubro</p>
            <p className="font-medium text-gray-800">{RUBRO_LABEL[org?.rubro ?? ''] ?? '—'}</p>
          </div>
        </div>
        <InputField label="Nombre del negocio" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <InputField label="RUC" value={ruc} onChange={(e) => setRuc(e.target.value)} />
        <button onClick={() => update()} disabled={isPending || !nombre}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60">
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </section>

      {/* Plan */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-700">Plan actual</h2>
        </div>
        {plan && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${plan.color}`}>{plan.label}</span>
              <ul className="mt-3 space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            {org?.plan !== 'pro' && (
              <button className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 shrink-0">
                Mejorar plan
              </button>
            )}
          </div>
        )}
        {suscripcion && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600 space-y-1">
            {esPerpetua ? (
              <>
                <p>Licencia perpetua — pago único{suscripcion.monto_pago_unico ? `: ${gs(suscripcion.monto_pago_unico)}` : ''}.</p>
                {suscripcion.monto_mantenimiento_anual ? (
                  <p>Mantenimiento anual: {gs(suscripcion.monto_mantenimiento_anual)} · próxima renovación {fmtDate(suscripcion.fecha_vencimiento)}.</p>
                ) : (
                  <p>Sin mantenimiento recurrente — esta licencia no vence.</p>
                )}
              </>
            ) : (
              <p>Suscripción mensual{suscripcion.monto_mensual ? `: ${gs(suscripcion.monto_mensual)}` : ''} · próximo vencimiento {fmtDate(suscripcion.fecha_vencimiento)}.</p>
            )}
          </div>
        )}
      </section>

      {/* Usuario */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-700">Mi cuenta</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            {user?.nombre?.[0]}{user?.apellido?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-800">{user?.nombre} {user?.apellido}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{user?.rol}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
