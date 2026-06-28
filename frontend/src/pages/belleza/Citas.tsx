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

interface CitaBelleza {
  id: number
  cliente_id: number
  servicio_id: number
  staff_id: number | null
  fecha_hora: string
  estado: string
  precio_cobrado: number | null
  notas: string | null
}

interface Cliente { id: number; nombre: string; apellido: string }
interface Servicio { id: number; nombre: string; precio: number }

const ESTADOS = ['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
  no_asistio: 'bg-red-100 text-red-500',
}

const emptyForm = { cliente_id: '', servicio_id: '', fecha_hora: '', notas: '' }

export default function BelCitas() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario')
  const [modalOpen, setModalOpen] = useState(false)
  const [actualizandoId, setActualizandoId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: citas = [], isLoading } = useQuery<CitaBelleza[]>({
    queryKey: ['bel-citas'],
    queryFn: async () => (await apiClient.get('/belleza/citas/')).data,
  })

  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ['bel-clientes'],
    queryFn: async () => (await apiClient.get('/belleza/clientes/')).data,
  })

  const { data: servicios = [] } = useQuery<Servicio[]>({
    queryKey: ['bel-servicios'],
    queryFn: async () => (await apiClient.get('/belleza/servicios/')).data,
  })

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c])), [clientes])
  const servicioMap = useMemo(() => Object.fromEntries(servicios.map((s) => [s.id, s])), [servicios])

  const citasCalendario: CitaCalendario[] = useMemo(() =>
    citas.map((c) => {
      const cli = clienteMap[c.cliente_id]
      const srv = servicioMap[c.servicio_id]
      return {
        id: c.id,
        fecha_hora: c.fecha_hora,
        motivo: srv?.nombre,
        estado: c.estado,
        sujeto: cli ? `${cli.nombre} ${cli.apellido}` : `Cliente #${c.cliente_id}`,
      }
    }), [citas, clienteMap, servicioMap])

  const field = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const { mutate: crear, isPending: creando } = useMutation({
    mutationFn: async () => (await apiClient.post('/belleza/citas/', {
      cliente_id: Number(form.cliente_id),
      servicio_id: Number(form.servicio_id),
      fecha_hora: form.fecha_hora,
      notas: form.notas || null,
    })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bel-citas'] }); setModalOpen(false); setForm(emptyForm); toast('Cita agendada') },
    onError: () => toast('Error al agendar', 'error'),
  })

  const cambiarEstado = async (id: number, estado: string) => {
    setActualizandoId(id)
    try {
      await apiClient.patch(`/belleza/citas/${id}`, { estado })
      qc.invalidateQueries({ queryKey: ['bel-citas'] })
      toast('Estado actualizado')
    } catch { toast('Error', 'error') }
    finally { setActualizandoId(null) }
  }

  const clienteOptions = clientes.map((c) => ({ value: String(c.id), label: `${c.nombre} ${c.apellido}` }))
  const servicioOptions = servicios.map((s) => ({ value: String(s.id), label: `${s.nombre} — Gs. ${Number(s.precio).toLocaleString()}` }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-pink-600" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Agenda</h1>
          <span className="bg-pink-100 text-pink-700 text-xs font-medium px-2 py-0.5 rounded-full">{citas.length}</span>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 bg-pink-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-pink-700">
            <Plus size={16} /> Nueva cita
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      ) : vista === 'calendario' ? (
        <CalendarioCitas citas={citasCalendario} color="pink" />
      ) : (
        <div className="space-y-2">
          {citas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Sin citas programadas</div>
          ) : (
            citas.map((c) => {
              const cli = clienteMap[c.cliente_id]
              const srv = servicioMap[c.servicio_id]
              return (
                <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">
                      {cli ? `${cli.nombre} ${cli.apellido}` : `Cliente #${c.cliente_id}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {srv && <span className="font-medium text-pink-700">{srv.nombre} · </span>}
                      {format(new Date(c.fecha_hora), "d MMM yyyy · HH:mm", { locale: es })}
                    </p>
                    {c.precio_cobrado !== null && (
                      <p className="text-xs text-gray-500 mt-0.5">Gs. {Number(c.precio_cobrado).toLocaleString()}</p>
                    )}
                  </div>
                  <select
                    value={c.estado}
                    disabled={actualizandoId === c.id}
                    onChange={(e) => cambiarEstado(c.id, e.target.value)}
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
          <SelectField label="Cliente" required value={form.cliente_id} onChange={field('cliente_id')}
            options={clienteOptions} placeholder="Seleccionar cliente..." />
          <SelectField label="Servicio" required value={form.servicio_id} onChange={field('servicio_id')}
            options={servicioOptions} placeholder="Seleccionar servicio..." />
          <InputField label="Fecha y hora" required type="datetime-local" value={form.fecha_hora} onChange={field('fecha_hora')} />
          <InputField label="Notas" value={form.notas} onChange={field('notas')} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={creando || !form.cliente_id || !form.servicio_id || !form.fecha_hora}
              className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-60">
              {creando ? 'Guardando...' : 'Agendar cita'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
