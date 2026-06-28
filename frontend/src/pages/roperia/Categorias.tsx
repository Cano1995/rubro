import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Categoria {
  id: number
  nombre: string
  descripcion: string | null
}

const emptyForm = { nombre: '', descripcion: '' }

export default function RopCategorias() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: categorias = [], isLoading } = useQuery<Categoria[]>({
    queryKey: ['rop-categorias'],
    queryFn: async () => (await apiClient.get('/roperia/categorias/')).data,
  })

  const field = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c: Categoria) => { setEditing(c); setForm({ nombre: c.nombre, descripcion: c.descripcion ?? '' }); setModalOpen(true) }

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const body = { nombre: form.nombre, descripcion: form.descripcion || null }
      if (editing) return (await apiClient.patch(`/roperia/categorias/${editing.id}`, body)).data
      return (await apiClient.post('/roperia/categorias/', body)).data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rop-categorias'] }); setModalOpen(false); toast(editing ? 'Categoría actualizada' : 'Categoría creada') },
    onError: () => toast('Error al guardar', 'error'),
  })

  return (
    <div>
      <PageHeader icon={Package} title="Categorías" count={categorias.length}
        color="text-violet-600" newColor="bg-violet-600 hover:bg-violet-700" onNew={openNew} />

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>
      ) : categorias.length === 0 ? (
        <EmptyState icon={Package} title="Sin categorías" description="Organizá tus productos por categoría"
          action={{ label: 'Crear categoría', onClick: openNew }} color="text-violet-400" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categorias.map((c) => (
            <div key={c.id} onClick={() => openEdit(c)}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-violet-200 cursor-pointer transition-all">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-2">
                <Package size={18} className="text-violet-600" />
              </div>
              <p className="font-semibold text-gray-800">{c.nombre}</p>
              {c.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.descripcion}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <InputField label="Nombre" required value={form.nombre} onChange={field('nombre')} />
          <InputField label="Descripción" value={form.descripcion} onChange={field('descripcion')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.nombre}
              className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
