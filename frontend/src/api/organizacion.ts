import apiClient from './client'

export interface Organizacion {
  id: number
  nombre: string
  ruc: string | null
  rubro: 'veterinaria' | 'belleza' | 'roperia' | string
  plan: 'free' | 'basico' | 'pro'
  estado: string
  activo: boolean
  logo_url: string | null
  configuracion: Record<string, unknown>
}

export const orgApi = {
  getMiOrg: async (): Promise<Organizacion> => {
    const { data } = await apiClient.get<Organizacion>('/organizaciones/mi-organizacion')
    return data
  },
  update: async (payload: Partial<Organizacion>): Promise<Organizacion> => {
    const { data } = await apiClient.patch<Organizacion>('/organizaciones/mi-organizacion', payload)
    return data
  },
}
