import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingBag, AlertTriangle, Search } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField, SelectField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Producto {
  id: number
  nombre: string
  codigo: string | null
  precio_venta: number
  precio_costo: number | null
  stock: number
  stock_minimo: number
  categoria_id: number | null
}

const emptyForm = { nombre: '', codigo: '', precio_venta: '', precio_costo: '', stock: '0', stock_minimo: '0', categoria_id: '' }

export default function RopProductos() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [soloBajoStock, setSoloBajoStock] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['rop-productos'],
    queryFn: async () => (await apiClient.get('/roperia/productos/')).data,
  })

  const { data: categorias = [] } = useQuery<{ id: number; nombre: string }[]>({
    queryKey: ['rop-categorias'],
    queryFn: async () => (await apiClient.get('/roperia/categorias/')).data,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return productos.filter((p) => {
      const matchSearch = !q || p.nombre.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)
      const matchStock = !soloBajoStock || p.stock <= p.stock_minimo
      return matchSearch && matchStock
    })
  }, [productos, search, soloBajoStock])

  const bajoStockCount = useMemo(() => productos.filter((p) => p.stock <= p.stock_minimo).length, [productos])

  const field = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (p: Producto) => {
    setEditing(p)
    setForm({
      nombre: p.nombre,
      codigo: p.codigo ?? '',
      precio_venta: String(p.precio_venta),
      precio_costo: p.precio_costo ? String(p.precio_costo) : '',
      stock: String(p.stock),
      stock_minimo: String(p.stock_minimo),
      categoria_id: p.categoria_id ? String(p.categoria_id) : '',
    })
    setModalOpen(true)
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const body = {
        nombre: form.nombre,
        codigo: form.codigo || null,
        precio_venta: Number(form.precio_venta),
        precio_costo: form.precio_costo ? Number(form.precio_costo) : null,
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      }
      if (editing) return (await apiClient.patch(`/roperia/productos/${editing.id}`, body)).data
      return (await apiClient.post('/roperia/productos/', body)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rop-productos'] })
      setModalOpen(false)
      toast(editing ? 'Producto actualizado' : 'Producto creado')
    },
    onError: () => toast('Error al guardar', 'error'),
  })

  const categoriaOptions = categorias.map((c) => ({ value: String(c.id), label: c.nombre }))

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShoppingBag}
        title="Productos"
        count={filtered.length}
        color="text-violet-600"
        newColor="bg-violet-600 hover:bg-violet-700"
        onNew={openNew}
      />

      {bajoStockCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} />
          <span>{bajoStockCount} producto{bajoStockCount > 1 ? 's' : ''} con stock bajo</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none">
          <input
            type="checkbox"
            checked={soloBajoStock}
            onChange={(e) => setSoloBajoStock(e.target.checked)}
            className="accent-violet-600"
          />
          Solo bajo stock
        </label>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-gray-500 font-medium">Producto</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium hidden sm:table-cell">Costo</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Precio</th>
              <th className="text-right py-3 px-4 text-gray-500 font-medium">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={4} className="py-10 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600 mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4}>
                <EmptyState icon={ShoppingBag} title="Sin productos" description="Registrá tu primer producto"
                  action={!search && !soloBajoStock ? { label: 'Nuevo producto', onClick: openNew } : undefined}
                  color="text-violet-400" />
              </td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} onClick={() => openEdit(p)} className="hover:bg-violet-50/40 cursor-pointer transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800">{p.nombre}</p>
                    {p.codigo && <p className="text-xs text-gray-400">#{p.codigo}</p>}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500 hidden sm:table-cell">
                    {p.precio_costo ? `Gs. ${Number(p.precio_costo).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-800">
                    Gs. {Number(p.precio_venta).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 font-medium ${p.stock <= p.stock_minimo ? 'text-red-600' : 'text-gray-700'}`}>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <InputField label="Nombre" required value={form.nombre} onChange={field('nombre')} />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Código" value={form.codigo} onChange={field('codigo')} />
            <SelectField label="Categoría" value={form.categoria_id} onChange={field('categoria_id')}
              options={categoriaOptions} placeholder="Sin categoría" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Precio venta (Gs.)" required type="number" value={form.precio_venta} onChange={field('precio_venta')} />
            <InputField label="Precio costo (Gs.)" type="number" value={form.precio_costo} onChange={field('precio_costo')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Stock actual" type="number" value={form.stock} onChange={field('stock')} />
            <InputField label="Stock mínimo" type="number" value={form.stock_minimo} onChange={field('stock_minimo')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.nombre || !form.precio_venta}
              className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
