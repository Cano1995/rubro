import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Venta {
  id: number
  total: number
  descuento: number
  metodo_pago: string
  estado: string
  cliente_nombre: string | null
  created_at: string
}

const METODO_ICON: Record<string, string> = {
  efectivo: '💵', tarjeta: '💳', transferencia: '📱', credito: '🔖',
}

export default function RopVentas() {
  const { data: ventas = [], isLoading } = useQuery<Venta[]>({
    queryKey: ['rop-ventas'],
    queryFn: async () => (await apiClient.get('/roperia/ventas/')).data,
  })

  const totalHoy = ventas
    .filter((v) => new Date(v.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, v) => sum + v.total, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="text-violet-600" size={20} />
        <h1 className="text-xl font-bold text-gray-800">Ventas</h1>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <p className="text-sm text-violet-600 font-medium">Total de hoy</p>
        <p className="text-2xl font-bold text-violet-700">Gs. {totalHoy.toLocaleString()}</p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-10 text-gray-400">Sin ventas registradas</div>
        ) : (
          ventas.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
              <div className="text-2xl">{METODO_ICON[v.metodo_pago] ?? '💰'}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Gs. {v.total.toLocaleString()}</p>
                <p className="text-xs text-gray-400">
                  {format(new Date(v.created_at), "d MMM · HH:mm", { locale: es })}
                  {v.cliente_nombre ? ` · ${v.cliente_nombre}` : ''}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium capitalize">{v.estado}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
