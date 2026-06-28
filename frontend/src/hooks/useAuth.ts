import { useState, useEffect } from 'react'
import { authApi, type UserMe } from '../api/auth'

export function useAuth() {
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(setUser)
      .catch(() => { localStorage.removeItem('access_token') })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const tokens = await authApi.login(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const me = await authApi.me()
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }

  return { user, loading, login, logout }
}
