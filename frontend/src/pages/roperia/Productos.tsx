import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { ShoppingBag, Plus, AlertTriangle } from 'lucide-react'

interface Producto {
  id: number
  nombre: string
  codigo: string | null
  precio_venta: number
  stock: number
  stock_minimo: number
}

export default function RopProductos() {
  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['rop-productos'],
    queryFn: async () => (await apiClient.get('/roperia/productos/')).data,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-violet-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Productos</h1>
          <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full">{productos.length}</span>
        </div>
        <button className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-violet-700">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-medium">Producto</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Precio</th>
              <th className="text-right py-2 px-3 text-gray-500 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="py-10 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto" />
              </td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={3} className="py-10 text-center text-gray-400">Sin productos</td></tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    {p.codigo && <p className="text-xs text-gray-400">#{p.codigo}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">Gs. {p.precio_venta.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`flex items-center justify-end gap-1 ${p.stock <= p.stock_minimo ? 'text-red-600' : 'text-gray-700'}`}>
                      {p.stock <= p.stock_minimo && <AlertTriangle size={12} />}
                      {p.stock}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
