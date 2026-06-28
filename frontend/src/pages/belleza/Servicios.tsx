import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Scissors, Plus, Clock } from 'lucide-react'

interface Servicio {
  id: number
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  precio: number
}

export default function BelServicios() {
  const { data: servicios = [], isLoading } = useQuery<Servicio[]>({
    queryKey: ['bel-servicios'],
    queryFn: async () => (await apiClient.get('/belleza/servicios/')).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="text-pink-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Servicios</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
          </div>
        ) : servicios.length === 0 ? (
          <div className="col-span-full text-center py-10 text-gray-400">Sin servicios</div>
        ) : (
          servicios.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="font-semibold text-gray-800">{s.nombre}</p>
              {s.descripcion && <p className="text-xs text-gray-500 mt-0.5">{s.descripcion}</p>}
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm font-bold text-pink-600">Gs. {s.precio.toLocaleString()}</p>
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} /> {s.duracion_minutos} min
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
