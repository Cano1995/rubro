import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { Users, Plus, Phone } from 'lucide-react'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
}

export default function BelClientes() {
  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['bel-clientes'],
    queryFn: async () => (await apiClient.get('/belleza/clientes/')).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="text-pink-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
          <span className="bg-pink-100 text-pink-700 text-xs font-medium px-2 py-0.5 rounded-full">{clientes.length}</span>
        </div>
        <button className="flex items-center gap-1.5 bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <p className="font-semibold text-gray-800">{c.nombre} {c.apellido}</p>
              {c.telefono && (
                <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Phone size={12} /> {c.telefono}
                </p>
              )}
            </div>
          ))}
          {clientes.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400">Sin clientes aún</div>
          )}
        </div>
      )}
    </div>
  )
}
