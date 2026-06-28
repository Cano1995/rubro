import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, List, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import apiClient from '../../api/client'
import CalendarioCitas, { type CitaCalendario } from '../../components/CalendarioCitas'
import Modal from '../../components/ui/Modal'
import { InputField, SelectField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'
import { clsx } from 'clsx'

interface CitaVet {
  id: number
  paciente_id: number
  fecha_hora: string
  motivo: string
  estado: string
  notas: string | null
}

interface Paciente { id: number; nombre: string; especie: string }

const ESTADOS = ['pendiente', 'confirmada', 'en_curso', 'completada', 'cancelada']
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
  en_curso: 'bg-indigo-100 text-indigo-700',
}

const emptyForm = { paciente_id: '', fecha_hora: '', motivo: '', notas: '' }

export default function VetCitas() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario')
  const [modalOpen, setModalOpen] = useState(false)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: citas = [], isLoading } = useQuery<CitaVet[]>({
    queryKey: ['vet-citas'],
    queryFn: async () => (await apiClient.get('/veterinaria/citas/')).data,
  })

  const { data: pacientes = [] } = useQuery<Paciente[]>({
    queryKey: ['vet-pacientes'],
    queryFn: async () => (await apiClient.get('/veterinaria/pacientes/')).data,
  })

  const pacienteMap = useMemo(() => Object.fromEntries(pacientes.map((p) => [p.id, p])), [pacientes])

  const citasCalendario: CitaCalendario[] = useMemo(() =>
    citas.map((c) => ({
      id: c.id,
      fecha_hora: c.fecha_hora,
      motivo: c.motivo,
      estado: c.estado,
      sujeto: pacienteMap[c.paciente_id]?.nombre ?? `Pac. #${c.paciente_id}`,
    })), [citas, pacienteMap])

  const field = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const { mutate: crear, isPending: creando } = useMutation({
    mutationFn: async () => (await apiClient.post('/veterinaria/citas/', {
      paciente_id: Number(form.paciente_id),
      fecha_hora: form.fecha_hora,
      motivo: form.motivo,
      notas: form.notas || null,
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vet-citas'] }); setModalOpen(false); setForm(emptyForm); toast('Cita programada') },
    onError: () => toast('Error al programar', 'error'),
  })

  const cambiarEstado = async (cita: CitaCalendario, estado: string) => {
    setActualizandoId(cita.id)
    try {
      await apiClient.patch(`/veterinaria/citas/${cita.id}`, { estado })
      qc.invalidateQueries({ queryKey: ['vet-citas'] })
      toast('Estado actualizado')
    } catch { toast('Error', 'error') }
    finally { setActualizandoId(null) }
  }

  const pacienteOptions = pacientes.map((p) => ({ value: String(p.id), label: `${p.nombre} (${p.especie})` }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-emerald-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Citas</h1>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full">{citas.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex bg-gray-100 rounded-lg p-1 text-xs">
            <button onClick={() => setVista('calendario')}
              className={clsx('px-2.5 py-1 rounded-md transition-colors', vista === 'calendario' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500')}>
              <Calendar size={14} />
            </button>
            <button onClick={() => setVista('lista')}
              className={clsx('px-2.5 py-1 rounded-md transition-colors', vista === 'lista' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500')}>
              <List size={14} />
            </button>
          </div>
          <button onClick={() => { setForm(emptyForm); setModalOpen(true) }}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            <Plus size={16} /> Nueva cita
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : vista === 'calendario' ? (
        <CalendarioCitas
          citas={citasCalendario}
          color="emerald"
          onCitaClick={(cita) => {
            const original = citas.find((c) => c.id === cita.id)
            if (!original) return
          }}
        />
      ) : (
        <div className="space-y-2">
          {citas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No hay citas programadas</div>
          ) : (
            citas.map((c) => {
              const pac = pacienteMap[c.paciente_id]
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{c.motivo}</p>
                    <p className="text-sm text-gray-500">
                      {pac && <span className="font-medium text-emerald-700">{pac.nombre} · </span>}
                      {format(new Date(c.fecha_hora), "d MMM yyyy · HH:mm", { locale: es })}
                    </p>
                  </div>
                  <select
                    value={c.estado}
                    disabled={actualizandoId === c.id}
                    onChange={(e) => cambiarEstado({ id: c.id, fecha_hora: c.fecha_hora, estado: c.estado }, e.target.value)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded-lg border font-medium focus:outline-none cursor-pointer',
                      ESTADO_COLOR[c.estado] ?? 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {ESTADOS.map((s) => <option key={s} value={s} className="bg-white text-gray-800">{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              )
            })
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva cita" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); crear() }} className="space-y-3">
          <SelectField
            label="Paciente"
            required
            value={form.paciente_id}
            onChange={field('paciente_id')}
            options={pacienteOptions}
            placeholder="Seleccionar paciente..."
          />
          <InputField label="Fecha y hora" required type="datetime-local" value={form.fecha_hora} onChange={field('fecha_hora')} />
          <InputField label="Motivo" required value={form.motivo} onChange={field('motivo')} />
          <InputField label="Notas" value={form.notas} onChange={field('notas')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={creando || !form.paciente_id || !form.fecha_hora || !form.motivo}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {creando ? 'Guardando...' : 'Programar cita'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
