import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import apiClient from '../api/client'
import { useOrganizacion } from '../hooks/useOrganizacion'
import { clsx } from 'clsx'

type Periodo = 'semana' | 'mes' | 'trimestre' | 'anio'

const PERIODO_LABELS: Record<Periodo, string> = {
  semana: 'Esta semana',
  mes: 'Este mes',
  trimestre: 'Últimos 3 meses',
  anio: 'Este año',
}

// ─── SVG Bar Chart mínimo ─────────────────────────────────────────────────
function BarChart({ data, colorClass = 'fill-indigo-500' }: {
  data: { label: string; value: number }[]
  colorClass?: string
}) {
  if (!data.length) return <p className="text-xs text-gray-400 text-center py-4">Sin datos</p>
  const max = Math.max(...data.map((d) => d.value), 1)
  const H = 80
  const W = 300
  const barW = Math.max(8, (W - (data.length - 1) * 4) / data.length)

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-24">
      {data.map((d, i) => {
        const h = (d.value / max) * H
        const x = i * (barW + 4)
        return (
          <g key={i}>
            <rect
              x={x} y={H - h} width={barW} height={h}
              rx={2}
              className={colorClass}
              opacity={0.85}
            />
          </g>
        )
      })}
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center mb-3', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Export CSV ────────────────────────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Reporte Veterinaria ──────────────────────────────────────────────────
function ReporteVeterinaria({ periodo }: { periodo: Periodo }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-vet', periodo],
    queryFn: async () => (await apiClient.get(`/reportes/veterinaria?periodo=${periodo}`)).data,
  })

  if (isLoading) return <Spinner />
  if (!data) return null

  const { resumen, citas_por_estado, top_especies, citas_por_dia } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Pacientes totales" value={resumen.pacientes_total} icon={TrendingUp} color="bg-emerald-500" />
        <KpiCard label="Pacientes nuevos" value={resumen.pacientes_nuevos} icon={TrendingUp} color="bg-emerald-400" />
        <KpiCard label="Citas totales" value={resumen.citas_total} icon={BarChart2} color="bg-blue-500" />
        <KpiCard label="Completadas" value={resumen.citas_completadas} icon={TrendingDown} color="bg-green-500" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Citas por estado</h3>
          </div>
          {Object.entries(citas_por_estado).map(([estado, total]) => (
            <div key={estado} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-gray-600 w-24 capitalize">{estado.replace('_', ' ')}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${Math.round(((total as number) / resumen.citas_total) * 100)}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-6 text-right">{total as number}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Top especies</h3>
          </div>
          {top_especies.map((e: { especie: string; total: number }) => (
            <div key={e.especie} className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-600">{e.especie}</span>
              <span className="text-xs font-medium text-emerald-700">{e.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Citas últimos 30 días</h3>
          <button
            onClick={() => exportCSV(citas_por_dia, `citas-${periodo}.csv`)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-700 transition-colors"
          >
            <Download size={12} /> CSV
          </button>
        </div>
        <BarChart colorClass="fill-emerald-500"
          data={citas_por_dia.map((d: { dia: string; total: number }) => ({ label: d.dia, value: d.total }))} />
      </div>
    </div>
  )
}

// ─── Reporte Belleza ──────────────────────────────────────────────────────
function ReporteBelleza({ periodo }: { periodo: Periodo }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-bel', periodo],
    queryFn: async () => (await apiClient.get(`/reportes/belleza?periodo=${periodo}`)).data,
  })

  if (isLoading) return <Spinner />
  if (!data) return null

  const { resumen, top_servicios, ingresos_por_dia, por_metodo } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Clientes totales" value={resumen.clientes_total} icon={TrendingUp} color="bg-pink-500" />
        <KpiCard label="Clientes nuevos" value={resumen.clientes_nuevos} icon={TrendingUp} color="bg-pink-400" />
        <KpiCard label="Citas realizadas" value={resumen.citas_completadas} icon={BarChart2} color="bg-blue-500" />
        <KpiCard label="Ingresos" value={`Gs. ${Number(resumen.ingresos).toLocaleString()}`} icon={TrendingUp} color="bg-green-500" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Top servicios</h3>
          {top_servicios.map((s: { servicio: string; total: number }) => (
            <div key={s.servicio} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-gray-600 flex-1 truncate">{s.servicio}</span>
              <span className="text-xs font-medium text-pink-700">{s.total} citas</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Estado de citas</h3>
          {Object.entries(data.citas_por_estado).map(([estado, total]) => (
            <div key={estado} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-gray-600 w-24 capitalize">{estado.replace('_', ' ')}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-pink-500 h-2 rounded-full"
                  style={{ width: resumen.citas_total ? `${Math.round(((total as number) / resumen.citas_total) * 100)}%` : '0%' }} />
              </div>
              <span className="text-xs text-gray-500 w-6 text-right">{total as number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Ingresos diarios</h3>
          <button
            onClick={() => exportCSV(ingresos_por_dia, `ingresos-${periodo}.csv`)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-700 transition-colors"
          >
            <Download size={12} /> CSV
          </button>
        </div>
        <BarChart colorClass="fill-pink-500"
          data={ingresos_por_dia.map((d: { dia: string; total: number }) => ({ label: d.dia, value: d.total }))} />
      </div>
    </div>
  )
}

// ─── Reporte Ropería ──────────────────────────────────────────────────────
function ReporteRoperia({ periodo }: { periodo: Periodo }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reporte-rop', periodo],
    queryFn: async () => (await apiClient.get(`/reportes/roperia?periodo=${periodo}`)).data,
  })

  if (isLoading) return <Spinner />
  if (!data) return null

  const { resumen, por_metodo_pago, bajo_stock, ventas_por_dia } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Productos activos" value={resumen.productos_total} icon={BarChart2} color="bg-violet-500" />
        <KpiCard label="Ventas realizadas" value={resumen.ventas_cantidad} icon={TrendingUp} color="bg-violet-400" />
        <KpiCard label="Total facturado" value={`Gs. ${Number(resumen.ventas_total).toLocaleString()}`} icon={TrendingUp} color="bg-green-500" />
        <KpiCard label="Bajo stock" value={resumen.bajo_stock_cantidad} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ventas por método de pago</h3>
          {por_metodo_pago.map((m: { metodo: string; cantidad: number; total: number }) => (
            <div key={m.metodo} className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs font-medium text-gray-700 capitalize">{m.metodo}</p>
                <p className="text-xs text-gray-400">{m.cantidad} venta{m.cantidad !== 1 ? 's' : ''}</p>
              </div>
              <span className="text-xs font-semibold text-violet-700">Gs. {Number(m.total).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {bajo_stock.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-500" />
              <h3 className="text-sm font-semibold text-gray-700">Productos bajo stock</h3>
            </div>
            {bajo_stock.map((p: { nombre: string; stock: number; minimo: number }) => (
              <div key={p.nombre} className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-600 truncate flex-1">{p.nombre}</span>
                <span className="text-xs text-red-600 font-medium ml-2">{p.stock}/{p.minimo}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Ventas diarias</h3>
          <button
            onClick={() => exportCSV(ventas_por_dia, `ventas-${periodo}.csv`)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-violet-700 transition-colors"
          >
            <Download size={12} /> CSV
          </button>
        </div>
        <BarChart colorClass="fill-violet-500"
          data={ventas_por_dia.map((d: { dia: string; total: number }) => ({ label: d.dia, value: d.total }))} />
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────
export default function Reportes() {
  const { org } = useOrganizacion()
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  const periodos: Periodo[] = ['semana', 'mes', 'trimestre', 'anio']

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-gray-500" size={20} />
          <h1 className="text-xl font-bold text-gray-800">Reportes</h1>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {periodos.map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                periodo === p ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {org?.rubro === 'veterinaria' && <ReporteVeterinaria periodo={periodo} />}
      {org?.rubro === 'belleza' && <ReporteBelleza periodo={periodo} />}
      {org?.rubro === 'roperia' && <ReporteRoperia periodo={periodo} />}
    </div>
  )
}
