import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField, TextareaField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Historial {
  id: number
  paciente_id: number
  fecha: string
  motivo_consulta: string
  diagnostico: string | null
  tratamiento: string | null
  medicamentos: string | null
  peso_kg: number | null
  temperatura: number | null
  proxima_cita: string | null
}

interface Paciente { id: number; nombre: string; especie: string }

const emptyForm = { paciente_id: '', fecha: '', motivo_consulta: '', diagnostico: '', tratamiento: '', medicamentos: '', peso_kg: '', temperatura: '', proxima_cita: '' }

export default function VetHistoriales() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState<Historial | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: historiales = [], isLoading } = useQuery<Historial[]>({
    queryKey: ['vet-historiales'],
    queryFn: async () => (await apiClient.get('/veterinaria/historiales/')).data,
  })

  const { data: pacientes = [] } = useQuery<Paciente[]>({
    queryKey: ['vet-pacientes'],
    queryFn: async () => (await apiClient.get('/veterinaria/pacientes/')).data,
  })

  const field = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const openNew = () => { setSelected(null); setForm(emptyForm); setModalOpen(true) }
  const openDetail = (h: Historial) => { setSelected(h); setModalOpen(true) }

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const body = {
        paciente_id: Number(form.paciente_id),
        fecha: form.fecha,
        motivo_consulta: form.motivo_consulta,
        diagnostico: form.diagnostico || null,
        tratamiento: form.tratamiento || null,
        medicamentos: form.medicamentos || null,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
        temperatura: form.temperatura ? Number(form.temperatura) : null,
        proxima_cita: form.proxima_cita || null,
      }
      return (await apiClient.post('/veterinaria/historiales/', body)).data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vet-historiales'] }); setModalOpen(false); toast('Historial registrado') },
    onError: () => toast('Error al guardar', 'error'),
  })

  return (
    <div>
      <PageHeader icon={ClipboardList} title="Historiales" count={historiales.length}
        color="text-emerald-600" newColor="bg-emerald-600 hover:bg-emerald-700" onNew={openNew} newLabel="Nueva consulta" />

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
      ) : historiales.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Sin historiales" description="Registrá la primera consulta" action={{ label: 'Nueva consulta', onClick: openNew }} />
      ) : (
        <div className="space-y-2">
          {historiales.map((h) => {
            const pac = pacientes.find((p) => p.id === h.paciente_id)
            return (
              <div key={h.id} onClick={() => openDetail(h)}
                className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md cursor-pointer transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{h.motivo_consulta}</p>
                      {pac && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{pac.nombre}</span>}
                    </div>
                    {h.diagnostico && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{h.diagnostico}</p>}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{format(new Date(h.fecha), 'd MMM yyyy', { locale: es })}</p>
                </div>
                {(h.peso_kg || h.temperatura) && (
                  <div className="flex gap-4 mt-2">
                    {h.peso_kg && <span className="text-xs text-gray-400">⚖️ {h.peso_kg} kg</span>}
                    {h.temperatura && <span className="text-xs text-gray-400">🌡️ {h.temperatura}°C</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={selected ? 'Detalle de consulta' : 'Nueva consulta'} size="lg">
        {selected ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-gray-500">Fecha</span><p className="font-medium">{format(new Date(selected.fecha), 'd MMM yyyy', { locale: es })}</p></div>
              {selected.peso_kg && <div><span className="text-gray-500">Peso</span><p className="font-medium">{selected.peso_kg} kg</p></div>}
              {selected.temperatura && <div><span className="text-gray-500">Temperatura</span><p className="font-medium">{selected.temperatura}°C</p></div>}
            </div>
            <div><span className="text-gray-500">Motivo</span><p className="font-medium">{selected.motivo_consulta}</p></div>
            {selected.diagnostico && <div><span className="text-gray-500">Diagnóstico</span><p className="font-medium">{selected.diagnostico}</p></div>}
            {selected.tratamiento && <div><span className="text-gray-500">Tratamiento</span><p className="font-medium">{selected.tratamiento}</p></div>}
            {selected.medicamentos && <div><span className="text-gray-500">Medicamentos</span><p className="font-medium">{selected.medicamentos}</p></div>}
            {selected.proxima_cita && <div><span className="text-gray-500">Próxima cita</span><p className="font-medium">{format(new Date(selected.proxima_cita), 'd MMM yyyy HH:mm', { locale: es })}</p></div>}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Paciente *</label>
                <select value={form.paciente_id} onChange={(e) => setForm((f) => ({ ...f, paciente_id: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Seleccionar...</option>
                  {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.especie})</option>)}
                </select>
              </div>
              <InputField label="Fecha *" type="datetime-local" required value={form.fecha} onChange={field('fecha')} />
            </div>
            <InputField label="Motivo de consulta *" required value={form.motivo_consulta} onChange={field('motivo_consulta')} />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Peso (kg)" type="number" step="0.1" value={form.peso_kg} onChange={field('peso_kg')} />
              <InputField label="Temperatura (°C)" type="number" step="0.1" value={form.temperatura} onChange={field('temperatura')} />
            </div>
            <TextareaField label="Diagnóstico" value={form.diagnostico} onChange={field('diagnostico')} />
            <TextareaField label="Tratamiento" value={form.tratamiento} onChange={field('tratamiento')} />
            <InputField label="Medicamentos" value={form.medicamentos} onChange={field('medicamentos')} />
            <InputField label="Próxima cita" type="datetime-local" value={form.proxima_cita} onChange={field('proxima_cita')} />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={isPending || !form.paciente_id || !form.fecha || !form.motivo_consulta}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
