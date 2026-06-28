import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { useOrganizacion } from '../hooks/useOrganizacion'

interface DashboardData {
  rubro: string
  org_nombre: string
  plan: string
  kpis: Record<string, number>
}

const KPI_LABELS: Record<string, Record<string, string>> = {
  veterinaria: { total_pacientes: 'Pacientes activos', citas_hoy: 'Citas hoy' },
  belleza: { total_clientes: 'Clientes', citas_hoy: 'Citas hoy' },
  roperia: { total_productos: 'Productos', productos_bajo_stock: 'Bajo stock ⚠️', ventas_hoy: 'Ventas hoy' },
}

const RUBRO_BG: Record<string, string> = {
  veterinaria: 'from-emerald-500 to-teal-600',
  belleza: 'from-pink-500 to-rose-600',
  roperia: 'from-violet-500 to-purple-600',
}

export default function Dashboard() {
  const { org } = useOrganizacion()
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await apiClient.get('/dashboard/')).data,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const bg = RUBRO_BG[data.rubro] ?? 'from-indigo-500 to-purple-600'
  const labels = KPI_LABELS[data.rubro] ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl bg-gradient-to-r ${bg} p-6 text-white`}>
        <p className="text-white/70 text-sm font-medium uppercase tracking-wide">{data.rubro}</p>
        <h2 className="text-2xl font-bold mt-1">{data.org_nombre}</h2>
        <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">
          Plan {data.plan}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.entries(data.kpis).map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">{labels[key] ?? key}</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
