import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Shield, Building2, Users, Activity } from 'lucide-react'

interface Stats {
  total_organizaciones: number
  total_usuarios: number
  organizaciones_activas: number
}

interface OrgAdmin {
  id: number
  nombre: string
  rubro: string
  plan: string
  estado: string
  activo: boolean
  total_usuarios: number
}

const RUBRO_BADGE: Record<string, string> = {
  veterinaria: 'bg-emerald-100 text-emerald-700',
  belleza: 'bg-pink-100 text-pink-700',
  roperia: 'bg-violet-100 text-violet-700',
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basico: 'bg-blue-100 text-blue-700',
  pro: 'bg-amber-100 text-amber-700',
}

export default function AdminPanel() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-stats'],
    queryFn: async () => (await apiClient.get('/admin/stats')).data,
  })

  const { data: orgs = [] } = useQuery<OrgAdmin[]>({
    queryKey: ['admin-orgs'],
    queryFn: async () => (await apiClient.get('/admin/organizaciones')).data,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="text-indigo-600" size={20} />
        <h1 className="text-xl font-bold text-gray-800">Panel Superadmin</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Organizaciones" value={stats.total_organizaciones} />
          <StatCard icon={Users} label="Usuarios" value={stats.total_usuarios} />
          <StatCard icon={Activity} label="Activas" value={stats.organizaciones_activas} color="text-green-600" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-left">
              <th className="py-2 px-3 font-medium">Organización</th>
              <th className="py-2 px-3 font-medium">Rubro</th>
              <th className="py-2 px-3 font-medium">Plan</th>
              <th className="py-2 px-3 font-medium text-right">Usuarios</th>
              <th className="py-2 px-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgs.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="py-2.5 px-3 font-medium text-gray-800">{o.nombre}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RUBRO_BADGE[o.rubro] ?? 'bg-gray-100'}`}>
                    {o.rubro}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_BADGE[o.plan] ?? 'bg-gray-100'}`}>
                    {o.plan}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right text-gray-600">{o.total_usuarios}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${o.activo ? 'bg-green-500' : 'bg-red-400'}`} />
                  {' '}{o.activo ? 'Activa' : 'Inactiva'}
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">Sin organizaciones</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color = 'text-indigo-600' }: {
  icon: React.ElementType; label: string; value: number; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <Icon size={16} className={`${color} mb-2`} />
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
