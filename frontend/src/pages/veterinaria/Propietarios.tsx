import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Propietario {
  id: number
  nombre: string
  apellido: string
  ci: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

const empty = { nombre: '', apellido: '', ci: '', telefono: '', email: '', direccion: '' }

export default function VetPropietarios() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Propietario | null>(null)
  const [form, setForm] = useState(empty)

  const { data: propietarios = [], isLoading } = useQuery<Propietario[]>({
    queryKey: ['vet-propietarios'],
    queryFn: async () => (await apiClient.get('/veterinaria/propietarios/')).data,
  })

  const field = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setEditing(null); setForm(empty); setModalOpen(true) }
  const openEdit = (p: Propietario) => {
    setEditing(p)
    setForm({ nombre: p.nombre, apellido: p.apellido, ci: p.ci ?? '', telefono: p.telefono ?? '', email: p.email ?? '', direccion: p.direccion ?? '' })
    setModalOpen(true)
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      const body = { ...form, ci: form.ci || null, telefono: form.telefono || null, email: form.email || null, direccion: form.direccion || null }
      if (editing) return (await apiClient.patch(`/veterinaria/propietarios/${editing.id}`, body)).data
      return (await apiClient.post('/veterinaria/propietarios/', body)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vet-propietarios'] })
      setModalOpen(false)
      toast(editing ? 'Propietario actualizado' : 'Propietario creado')
    },
    onError: () => toast('Error al guardar', 'error'),
  })

  return (
    <div>
      <PageHeader
        icon={Users} title="Propietarios" count={propietarios.length}
        color="text-emerald-600" newColor="bg-emerald-600 hover:bg-emerald-700"
        onNew={openNew}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : propietarios.length === 0 ? (
        <EmptyState icon={Users} title="Sin propietarios" description="Registrá el primer dueño de mascota" action={{ label: 'Agregar propietario', onClick: openNew }} color="text-emerald-400" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {propietarios.map((p) => (
            <div key={p.id} onClick={() => openEdit(p)}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{p.nombre} {p.apellido}</p>
                  {p.telefono && <p className="text-xs text-gray-500">{p.telefono}</p>}
                  {p.ci && <p className="text-xs text-gray-400">CI: {p.ci}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar propietario' : 'Nuevo propietario'}>
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nombre" required value={form.nombre} onChange={field('nombre')} />
            <InputField label="Apellido" required value={form.apellido} onChange={field('apellido')} />
          </div>
          <InputField label="CI" value={form.ci} onChange={field('ci')} />
          <InputField label="Teléfono" type="tel" value={form.telefono} onChange={field('telefono')} />
          <InputField label="Email" type="email" value={form.email} onChange={field('email')} />
          <InputField label="Dirección" value={form.direccion} onChange={field('direccion')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || !form.nombre || !form.apellido}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
