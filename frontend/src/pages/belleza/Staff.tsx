import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Briefcase, Mail } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

interface Staff {
  id: number
  nombre: string
  apellido: string
  email: string
  activo: boolean
}

const emptyForm = { nombre: '', apellido: '', email: '', password: '' }

export default function BelStaff() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [toggleTarget, setToggleTarget] = useState<Staff | null>(null)

  const { data: staff = [], isLoading } = useQuery<Staff[]>({
    queryKey: ['bel-staff'],
    queryFn: async () => (await apiClient.get('/belleza/staff/')).data,
  })

  const field = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { mutate: create, isPending } = useMutation({
    mutationFn: async () => (await apiClient.post('/belleza/staff/', form)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bel-staff'] }); setModalOpen(false); setForm(emptyForm); toast('Staff agregado') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast(msg ?? 'Error al crear', 'error')
    },
  })

  const { mutate: toggleActivo, isPending: toggling } = useMutation({
    mutationFn: async (s: Staff) => (await apiClient.patch(`/belleza/staff/${s.id}`, { activo: !s.activo })).data,
    onSuccess: (_, s) => { qc.invalidateQueries({ queryKey: ['bel-staff'] }); setToggleTarget(null); toast(s.activo ? 'Staff desactivado' : 'Staff activado') },
    onError: () => toast('Error', 'error'),
  })

  return (
    <div>
      <PageHeader icon={Briefcase} title="Staff" count={staff.length}
        color="text-pink-600" newColor="bg-pink-600 hover:bg-pink-700"
        onNew={() => { setForm(emptyForm); setModalOpen(true) }} />

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" /></div>
      ) : staff.length === 0 ? (
        <EmptyState icon={Briefcase} title="Sin staff registrado" description="Agregá a los miembros de tu equipo"
          action={{ label: 'Agregar miembro', onClick: () => setModalOpen(true) }} color="text-pink-400" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <div key={s.id} className={`bg-white rounded-xl border p-4 shadow-sm ${s.activo ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-sm shrink-0">
                  {s.nombre[0]}{s.apellido[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{s.nombre} {s.apellido}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500 truncate"><Mail size={10} />{s.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => setToggleTarget(s)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  {s.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar miembro del staff">
        <form onSubmit={(e) => { e.preventDefault(); create() }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Nombre" required value={form.nombre} onChange={field('nombre')} />
            <InputField label="Apellido" required value={form.apellido} onChange={field('apellido')} />
          </div>
          <InputField label="Email" type="email" required value={form.email} onChange={field('email')} />
          <InputField label="Contraseña" type="password" required value={form.password} onChange={field('password')} />
          <p className="text-xs text-gray-400">El staff podrá acceder al sistema con estas credenciales.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toggleTarget} message={`¿${toggleTarget?.activo ? 'Desactivar' : 'Activar'} a ${toggleTarget?.nombre}?`}
        confirmLabel={toggleTarget?.activo ? 'Desactivar' : 'Activar'}
        danger={toggleTarget?.activo}
        loading={toggling}
        onConfirm={() => toggleTarget && toggleActivo(toggleTarget)}
        onCancel={() => setToggleTarget(null)} />
    </div>
  )
}
