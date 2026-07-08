import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { differenceInDays, parseISO } from 'date-fns'

export interface Suscripcion {
  id: number
  tipo: 'suscripcion' | 'perpetua'
  plan: string
  estado: string
  fecha_vencimiento: string | null
  monto_mensual: number | null
  monto_pago_unico: number | null
  monto_mantenimiento_anual: number | null
}

export function useSuscripcion() {
  const { data: lista, isLoading } = useQuery<Suscripcion[]>({
    queryKey: ['suscripcion'],
    queryFn: async () => (await apiClient.get('/suscripciones/mi-suscripcion')).data,
    retry: false,
  })

  const suscripcion = lista?.[0]

  // Una licencia perpetua sin mantenimiento anual (fecha_vencimiento null) no vence nunca.
  // Si tiene mantenimiento anual, fecha_vencimiento marca su renovación y sí debe avisar.
  const diasRestantes = suscripcion?.fecha_vencimiento
    ? differenceInDays(parseISO(suscripcion.fecha_vencimiento), new Date())
    : null

  const porVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7
  const vencida = suscripcion?.estado === 'vencida' || (diasRestantes !== null && diasRestantes < 0)

  return { suscripcion, isLoading, diasRestantes, porVencer, vencida }
}
