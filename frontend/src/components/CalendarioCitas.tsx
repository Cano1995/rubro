import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { clsx } from 'clsx'

export interface CitaCalendario {
  id: number
  fecha_hora: string
  motivo?: string
  estado: string
  /** nombre del paciente o cliente */
  sujeto?: string
}

type ColorTheme = 'emerald' | 'pink' | 'violet' | 'indigo'

interface Props {
  citas: CitaCalendario[]
  color?: ColorTheme
  onCitaClick?: (cita: CitaCalendario) => void
}

const COLOR_MAP: Record<ColorTheme, { hoy: string; sel: string; punto: string; ring: string }> = {
  emerald: { hoy: 'bg-emerald-600 text-white', sel: 'bg-emerald-50', punto: 'bg-emerald-400', ring: 'ring-emerald-400' },
  pink:    { hoy: 'bg-pink-600 text-white',    sel: 'bg-pink-50',    punto: 'bg-pink-400',    ring: 'ring-pink-400' },
  violet:  { hoy: 'bg-violet-600 text-white',  sel: 'bg-violet-50',  punto: 'bg-violet-400',  ring: 'ring-violet-400' },
  indigo:  { hoy: 'bg-indigo-600 text-white',  sel: 'bg-indigo-50',  punto: 'bg-indigo-400',  ring: 'ring-indigo-400' },
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmada: 'bg-blue-100 text-blue-700 border-blue-200',
  completada: 'bg-green-100 text-green-700 border-green-200',
  cancelada: 'bg-gray-100 text-gray-500 border-gray-200 line-through',
  en_curso: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  no_asistio: 'bg-red-100 text-red-500 border-red-200',
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function CalendarioCitas({ citas, color = 'indigo', onCitaClick }: Props) {
  const [mes, setMes] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(new Date())

  const c = COLOR_MAP[color]

  const celdas = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 0 })
    const fin = endOfWeek(endOfMonth(mes), { weekStartsOn: 0 })
    const days: Date[] = []
    let d = inicio
    while (d <= fin) {
      days.push(d)
      d = addDays(d, 1)
    }
    return days
  }, [mes])

  const citasPorDia = useMemo(() => {
    const map: Record<string, CitaCalendario[]> = {}
    citas.forEach((c) => {
      const key = format(parseISO(c.fecha_hora), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [citas])

  const citasDelDia = useMemo(() => {
    if (!diaSeleccionado) return []
    const key = format(diaSeleccionado, 'yyyy-MM-dd')
    return (citasPorDia[key] ?? []).sort((a, b) =>
      parseISO(a.fecha_hora).getTime() - parseISO(b.fecha_hora).getTime()
    )
  }, [diaSeleccionado, citasPorDia])

  return (
    <div className="space-y-4">
      {/* Navegación del mes */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMes((m) => subMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-semibold text-gray-800 capitalize">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h2>
        <button onClick={() => setMes((m) => addMonths(m, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Grid calendario */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Cabecera días de semana */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DOW.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7">
          {celdas.map((dia, i) => {
            const key = format(dia, 'yyyy-MM-dd')
            const citasHoy = citasPorDia[key] ?? []
            const esMismoMes = isSameMonth(dia, mes)
            const esHoy = isToday(dia)
            const esSeleccionado = diaSeleccionado ? isSameDay(dia, diaSeleccionado) : false

            return (
              <button
                key={i}
                onClick={() => setDiaSeleccionado(dia)}
                className={clsx(
                  'relative min-h-[52px] sm:min-h-[64px] p-1.5 text-left border-b border-r border-gray-50 transition-colors',
                  !esMismoMes && 'bg-gray-50/50',
                  esSeleccionado && c.sel,
                  !esSeleccionado && esMismoMes && 'hover:bg-gray-50',
                )}
              >
                <span className={clsx(
                  'inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-medium',
                  esHoy && c.hoy,
                  !esHoy && esMismoMes && 'text-gray-700',
                  !esHoy && !esMismoMes && 'text-gray-300',
                )}>
                  {format(dia, 'd')}
                </span>
                {citasHoy.length > 0 && (
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {citasHoy.slice(0, 2).map((c) => (
                      <span key={c.id} className={clsx(
                        'text-[10px] px-1 rounded truncate border hidden sm:block',
                        ESTADO_COLORS[c.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                      )}>
                        {format(parseISO(c.fecha_hora), 'HH:mm')} {c.sujeto ?? ''}
                      </span>
                    ))}
                    {citasHoy.length > 2 && (
                      <span className="text-[10px] text-gray-400 pl-1 hidden sm:block">+{citasHoy.length - 2} más</span>
                    )}
                    {/* En mobile solo punto indicador */}
                    <span className={clsx('w-1.5 h-1.5 rounded-full mt-0.5 mx-auto sm:hidden', c.punto)} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel de citas del día seleccionado */}
      {diaSeleccionado && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">
            {format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
            <span className="ml-2 text-gray-400 font-normal">({citasDelDia.length} {citasDelDia.length === 1 ? 'cita' : 'citas'})</span>
          </h3>

          {citasDelDia.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin citas este día</p>
          ) : (
            <div className="space-y-2">
              {citasDelDia.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCitaClick?.(c)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm text-left transition-all"
                >
                  <div className="flex items-center gap-1.5 text-gray-500 shrink-0 mt-0.5">
                    <Clock size={13} />
                    <span className="text-xs font-medium">{format(parseISO(c.fecha_hora), 'HH:mm')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {c.sujeto && <p className="text-sm font-medium text-gray-800 truncate">{c.sujeto}</p>}
                    {c.motivo && <p className="text-xs text-gray-500 truncate">{c.motivo}</p>}
                  </div>
                  <span className={clsx(
                    'text-xs px-2 py-0.5 rounded-full border shrink-0 capitalize',
                    ESTADO_COLORS[c.estado] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                  )}>
                    {c.estado.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
