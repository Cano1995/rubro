import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Stethoscope, Plus } from 'lucide-react'

interface Paciente {
  id: number
  nombre: string
  especie: string
  raza: string | null
  sexo: string
  activo: boolean
}

export default function VetPacientes() {
  const { data: pacientes = [], isLoading } = useQuery<Paciente[]>({
    queryKey: ['vet-pacientes'],
    queryFn: async () => (await apiClient.get('/veterinaria/pacientes/')).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="text-emerald-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Pacientes</h1>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {pacientes.length}
          </span>
        </div>
        <button className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : pacientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay pacientes registrados aún</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.nombre}</p>
                  <p className="text-sm text-gray-500">{p.especie}{p.raza ? ` · ${p.raza}` : ''}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{p.sexo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
