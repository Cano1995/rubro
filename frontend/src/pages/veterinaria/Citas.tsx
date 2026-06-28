import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Calendar, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CitaVet {
  id: number
  paciente_id: number
  fecha_hora: string
  motivo: string
  estado: string
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  en_curso: 'bg-purple-100 text-purple-700',
}

export default function VetCitas() {
  const { data: citas = [], isLoading } = useQuery<CitaVet[]>({
    queryKey: ['vet-citas'],
    queryFn: async () => (await apiClient.get('/veterinaria/citas/')).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-emerald-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Citas</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus size={16} /> Nueva cita
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {citas.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{c.motivo}</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(c.fecha_hora), "d MMM yyyy · HH:mm", { locale: es })}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${ESTADO_COLOR[c.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                {c.estado}
              </span>
            </div>
          ))}
          {citas.length === 0 && (
            <div className="text-center py-10 text-gray-400">No hay citas programadas</div>
          )}
        </div>
      )}
    </div>
  )
}
