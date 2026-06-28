import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../api/client'
import { CreditCard, Plus, Minus, ShoppingCart, Trash2 } from 'lucide-react'

interface Producto {
  id: number
  nombre: string
  precio_venta: number
  stock: number
  codigo: string | null
}

interface CartItem {
  producto: Producto
  cantidad: number
}

export default function RopPOS() {
  const qc = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [metodo, setMetodo] = useState('efectivo')
  const [descuento, setDescuento] = useState(0)

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['rop-productos'],
    queryFn: async () => (await apiClient.get('/roperia/productos/')).data,
  })

  const addToCart = (p: Producto) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.producto.id === p.id)
      if (existing) return prev.map((i) => i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { producto: p, cantidad: 1 }]
    })
  }

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev
      .map((i) => i.producto.id === id ? { ...i, cantidad: i.cantidad + delta } : i)
      .filter((i) => i.cantidad > 0)
    )
  }

  const total = cart.reduce((sum, i) => sum + i.producto.precio_venta * i.cantidad, 0) - descuento

  const { mutate: finalizarVenta, isPending } = useMutation({
    mutationFn: async () => {
      await apiClient.post('/roperia/ventas/', {
        items: cart.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
        metodo_pago: metodo,
        descuento,
      })
    },
    onSuccess: () => {
      setCart([])
      setDescuento(0)
      qc.invalidateQueries({ queryKey: ['rop-productos'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      alert('✅ Venta registrada')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert('Error: ' + (msg ?? 'No se pudo procesar'))
    },
  })

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Catálogo */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="text-violet-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Caja (POS)</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {productos.map((p) => (
            <button
              key={p.id}
              onClick={() => p.stock > 0 && addToCart(p)}
              disabled={p.stock === 0}
              className="bg-white rounded-xl border border-gray-100 p-3 text-left hover:border-violet-400 hover:shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <p className="font-medium text-gray-800 text-sm truncate">{p.nombre}</p>
              <p className="text-violet-600 font-bold text-sm">Gs. {p.precio_venta.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Stock: {p.stock}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 self-start lg:sticky lg:top-4">
        <div className="flex items-center gap-2 font-bold text-gray-800">
          <ShoppingCart size={18} /> Carrito
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="ml-auto text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Seleccioná productos</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.producto.id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-gray-800">{item.producto.nombre}</p>
                  <p className="text-gray-500 text-xs">Gs. {(item.producto.precio_venta * item.cantidad).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.producto.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100"><Minus size={10} /></button>
                  <span className="w-6 text-center font-medium">{item.cantidad}</span>
                  <button onClick={() => updateQty(item.producto.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100"><Plus size={10} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Descuento</span>
            <input
              type="number"
              value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value))}
              className="w-24 text-right border rounded px-1 py-0.5 text-sm"
              min={0}
            />
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-violet-600">Gs. {Math.max(0, total).toLocaleString()}</span>
          </div>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="efectivo">💵 Efectivo</option>
            <option value="tarjeta">💳 Tarjeta</option>
            <option value="transferencia">📱 Transferencia</option>
          </select>
          <button
            onClick={() => finalizarVenta()}
            disabled={cart.length === 0 || isPending}
            className="w-full py-2.5 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Procesando...' : '✅ Finalizar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}
