import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Stethoscope, Search } from 'lucide-react'
import apiClient from '../../api/client'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { InputField, SelectField } from '../../components/ui/FormField'
import { useToast } from '../../components/ui/Toast'

interface Paciente {
  id: number
  nombre: string
  especie: string
  raza: string | null
  sexo: string
  activo: boolean
  propietario_id: number
}

const emptyForm = { nombre: '', especie: '', raza: '', sexo: 'desconocido', propietario_id: '' }

const SEXO_OPTIONS = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'Desconocido' },
]

export default function VetPacientes() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filterEspecie, setFilterEspecie] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: pacientes = [], isLoading } = useQuery<Paciente[]>({
    queryKey: ['vet-pacientes'],
    queryFn: async () => (await apiClient.get('/veterinaria/pacientes/')).data,
  })

  const { data: propietarios = [] } = useQuery<{ id: number; nombre: string; apellido: string }[]>({
    queryKey: ['vet-propietarios'],
    queryFn: async () => (await apiClient.get('/veterinaria/propietarios/')).data,
  })

  const especies = useMemo(() => {
    const set = new Set(pacientes.map((p) => p.especie))
    return Array.from(set).sort()
  }, [pacientes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return pacientes.filter((p) => {
      const matchSearch = !q || p.nombre.toLowerCase().includes(q) ||
        p.especie.toLowerCase().includes(q) || (p.raza ?? '').toLowerCase().includes(q)
      const matchEspecie = !filterEspecie || p.especie === filterEspecie
      return matchSearch && matchEspecie
    })
  }, [pacientes, search, filterEspecie])

  const field = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => (await apiClient.post('/veterinaria/pacientes/', {
      ...form,
      propietario_id: Number(form.propietario_id),
      raza: form.raza || null,
    })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vet-pacientes'] })
      setModalOpen(false)
      setForm(emptyForm)
      toast('Paciente registrado')
    },
    onError: () => toast('Error al guardar', 'error'),
  })

  const propietarioOptions = propietarios.map((p) => ({
    value: String(p.id),
    label: `${p.nombre} ${p.apellido}`,
  }))

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Stethoscope}
        title="Pacientes"
        count={filtered.length}
        color="text-emerald-600"
        newColor="bg-emerald-600 hover:bg-emerald-700"
        onNew={() => { setForm(emptyForm); setModalOpen(true) }}
      />

      {/* Búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, especie o raza..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        {especies.length > 0 && (
          <select
            value={filterEspecie}
            onChange={(e) => setFilterEspecie(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Todas las especies</option>
            {especies.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={search || filterEspecie ? 'Sin resultados' : 'Sin pacientes'}
          description={search || filterEspecie ? 'Probá con otro término de búsqueda' : 'Registrá el primer paciente'}
          action={!search && !filterEspecie ? { label: 'Nuevo paciente', onClick: () => { setForm(emptyForm); setModalOpen(true) } } : undefined}
          color="text-emerald-400"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.nombre}</p>
                  <p className="text-sm text-gray-500">{p.especie}{p.raza ? ` · ${p.raza}` : ''}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">{p.sexo}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo paciente" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); save() }} className="space-y-3">
          <InputField label="Nombre del paciente" required value={form.nombre} onChange={field('nombre')} />
          <InputField label="Especie (ej: Canino, Felino)" required value={form.especie} onChange={field('especie')} />
          <InputField label="Raza" value={form.raza} onChange={field('raza')} />
          <SelectField label="Sexo" value={form.sexo} onChange={field('sexo')} options={SEXO_OPTIONS} />
          <SelectField
            label="Propietario"
            required
            value={form.propietario_id}
            onChange={field('propietario_id')}
            options={propietarioOptions}
            placeholder="Seleccionar propietario..."
          />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={isPending || !form.nombre || !form.especie || !form.propietario_id}
              className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
