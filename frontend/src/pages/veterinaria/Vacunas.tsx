import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Syringe, AlertTriangle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { es } from 'date-fns/locale'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Vacuna {
  id: number
  paciente_id: number
  nombre_vacuna: string
  lote: string | null
  fecha_aplicacion: string
  fecha_vencimiento: string | null
  recordatorio_enviado: boolean
}

interface Paciente { id: number; nombre: string }

const emptyForm = { paciente_id: '', nombre_vacuna: '', lote: '', fecha_aplicacion: '', fecha_vencimiento: '' }

export default function VetVacunas() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: vacunas = [], isLoading } = useQuery<Vacuna[]>({
    queryKey: ['vet-vacunas'],
    queryFn: async () => (await apiClient.get('/veterinaria/vacunas/')).data,
  })

  const { data: pacientes = [] } = useQuery<Paciente[]>({
    queryKey: ['vet-pacientes'],
    queryFn: async () => (await apiClient.get('/veterinaria/pacientes/')).data,
  })

  const field = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const body = {
        paciente_id: Number(form.paciente_id),
        nombre_vacuna: form.nombre_vacuna,
        lote: form.lote || null,
        fecha_aplicacion: form.fecha_aplicacion,
        fecha_vencimiento: form.fecha_vencimiento || null,
      }
      return (await apiClient.post('/veterinaria/vacunas/', body)).data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vet-vacunas'] }); setModalOpen(false); setForm(emptyForm); toast('Vacuna registrada') },
    onError: () => toast('Error al registrar', 'error'),
  })

  const vencidas = vacunas.filter((v) => v.fecha_vencimiento && isPast(new Date(v.fecha_vencimiento)))
  const vigentes = vacunas.filter((v) => !v.fecha_vencimiento || !isPast(new Date(v.fecha_vencimiento)))

  return (
    <div>
      <PageHeader icon={Syringe} title="Vacunas" count={vacunas.length}
        color="text-emerald-600" newColor="bg-emerald-600 hover:bg-emerald-700"
        onNew={() => { setForm(emptyForm); setModalOpen(true) }} newLabel="Registrar vacuna" />

      {vencidas.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{vencidas.length} vacuna{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : vacunas.length === 0 ? (
        <EmptyState icon={Syringe} title="Sin vacunas registradas" action={{ label: 'Registrar vacuna', onClick: () => setModalOpen(true) }} />
      ) : (
        <div className="space-y-2">
          {[...vigentes, ...vencidas].map((v) => {
            const pac = pacientes.find((p) => p.id === v.paciente_id)
            const vencida = v.fecha_vencimiento && isPast(new Date(v.fecha_vencimiento))
            return (
              <div key={v.id} className={`bg-white rounded-xl border p-4 shadow-sm flex items-center gap-4 ${vencida ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-100">
                  <Syringe size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{v.nombre_vacuna}</p>
                    {pac && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pac.nombre}</span>}
                    {vencida && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Vencida</span>}
                  </div>
                  <div className="flex gap-4 mt-0.5">
                    <p className="text-xs text-gray-500">Aplicación: {format(new Date(v.fecha_aplicacion), 'd MMM yyyy', { locale: es })}</p>
                    {v.fecha_vencimiento && <p className={`text-xs ${vencida ? 'text-red-500' : 'text-gray-500'}`}>Vence: {format(new Date(v.fecha_vencimiento), 'd MMM yyyy', { locale: es })}</p>}
                  </div>
                  {v.lote && <p className="text-xs text-gray-400">Lote: {v.lote}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar vacuna">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Paciente *</label>
            <select value={form.paciente_id} onChange={(e) => setForm((f) => ({ ...f, paciente_id: e.target.value }))} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">Seleccionar paciente...</option>
              {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <InputField label="Nombre de vacuna *" required value={form.nombre_vacuna} onChange={field('nombre_vacuna')} placeholder="Ej: Antirrábica, Puppy DP..." />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Fecha de aplicación *" type="date" required value={form.fecha_aplicacion} onChange={field('fecha_aplicacion')} />
            <InputField label="Fecha vencimiento" type="date" value={form.fecha_vencimiento} onChange={field('fecha_vencimiento')} />
          </div>
          <InputField label="Lote" value={form.lote} onChange={field('lote')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.paciente_id || !form.nombre_vacuna || !form.fecha_aplicacion}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
