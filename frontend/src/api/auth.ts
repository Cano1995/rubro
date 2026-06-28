import apiClient from './client'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserMe {
  id: number
  nombre: string
  apellido: string
  email: string
  rol: string
  organizacion_id: number | null
}

export interface RegisterPayload {
  nombre: string
  apellido: string
  email: string
  password: string
  org_nombre: string
  org_rubro: string
  org_ruc?: string
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const form = new FormData()
    form.append('username', email)
    form.append('password', password)
    const { data } = await apiClient.post<LoginResponse>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  register: async (payload: RegisterPayload): Promise<UserMe> => {
    const { data } = await apiClient.post<UserMe>('/auth/register', payload)
    return data
  },

  me: async (): Promise<UserMe> => {
    const { data } = await apiClient.get<UserMe>('/auth/me')
    return data
  },
}
