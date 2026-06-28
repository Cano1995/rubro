import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Phone, Search, Mail } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  telefono: string | null
  email: string | null
  notas: string | null
}

const emptyForm = { nombre: '', apellido: '', telefono: '', email: '', notas: '' }

export default function BelClientes() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: clientes = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ['bel-clientes'],
    queryFn: async () => (await apiClient.get('/belleza/clientes/')).data,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  }, [clientes, search])

  const field = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true) }
  const openEdit = (c: Cliente) => {
    setEditing(c)
    setForm({ nombre: c.nombre, apellido: c.apellido, telefono: c.telefono ?? '', email: c.email ?? '', notas: c.notas ?? '' })
    setModalOpen(true)
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const body = { ...form, telefono: form.telefono || null, email: form.email || null, notas: form.notas || null }
      if (editing) return (await apiClient.patch(`/belleza/clientes/${editing.id}`, body)).data
      return (await apiClient.post('/belleza/clientes/', body)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bel-clientes'] })
      setModalOpen(false)
      toast(editing ? 'Cliente actualizado' : 'Cliente registrado')
    },
    onError: () => toast('Error al guardar', 'error'),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title="Clientes"
        count={filtered.length}
        color="text-pink-600"
        newColor="bg-pink-600 hover:bg-pink-700"
        onNew={openNew}
      />

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Sin resultados' : 'Sin clientes'}
          description={search ? 'Probá con otro término' : 'Registrá tu primer cliente'}
          action={!search ? { label: 'Nuevo cliente', onClick: openNew } : undefined}
          color="text-pink-400"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} onClick={() => openEdit(c)}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-pink-200 cursor-pointer transition-all">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                <span className="text-pink-700 font-bold text-sm">{c.nombre[0]}{c.apellido[0]}</span>
              </div>
              <p className="font-semibold text-gray-800">{c.nombre} {c.apellido}</p>
              {c.telefono && (
                <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Phone size={11} /> {c.telefono}
                </p>
              )}
              {c.email && (
                <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Mail size={11} /> {c.email}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar cliente' : 'Nuevo cliente'} size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nombre" required value={form.nombre} onChange={field('nombre')} />
            <InputField label="Apellido" required value={form.apellido} onChange={field('apellido')} />
          </div>
          <InputField label="Teléfono" value={form.telefono} onChange={field('telefono')} type="tel" />
          <InputField label="Email" value={form.email} onChange={field('email')} type="email" />
          <InputField label="Notas" value={form.notas} onChange={field('notas')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.nombre || !form.apellido}
              className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
