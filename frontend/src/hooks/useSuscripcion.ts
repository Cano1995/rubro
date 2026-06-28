import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { differenceInDays, parseISO } from 'date-fns'

export interface Suscripcion {
  id: number
  plan: string
  estado: string
  fecha_vencimiento: string | null
  monto_mensual: number | null
}

export function useSuscripcion() {
  const { data: lista, isLoading } = useQuery<Suscripcion[]>({
    queryKey: ['suscripcion'],
    queryFn: async () => (await apiClient.get('/suscripciones/mi-suscripcion')).data,
    retry: false,
  })

  const suscripcion = lista?.[0]

  const diasRestantes = suscripcion?.fecha_vencimiento
    ? differenceInDays(parseISO(suscripcion.fecha_vencimiento), new Date())
    : null

  const porVencer = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7
  const vencida = suscripcion?.estado === 'vencida' || (diasRestantes !== null && diasRestantes < 0)

  return { suscripcion, isLoading, diasRestantes, porVencer, vencida }
}
