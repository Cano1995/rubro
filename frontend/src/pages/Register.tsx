import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../api/auth'

const RUBROS = [
  { value: 'veterinaria', label: '🐾 Veterinaria', desc: 'Clínica veterinaria, mascotas' },
  { value: 'belleza', label: '✂️ Belleza', desc: 'Barbería, peluquería, uñas, spa' },
  { value: 'roperia', label: '👗 Ropería', desc: 'Tienda de ropa, boutique' },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [rubro, setRubro] = useState('')
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', org_nombre: '', org_ruc: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.register({ ...form, org_rubro: rubro, org_ruc: form.org_ruc || undefined })
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-indigo-600">Rubro</h1>
          <p className="text-gray-500 text-sm mt-1">Creá tu cuenta</p>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="font-medium text-gray-700 text-sm">¿Cuál es el rubro de tu negocio?</p>
            {RUBROS.map((r) => (
              <button
                key={r.value}
                onClick={() => { setRubro(r.value); setStep(2) }}
                className="w-full flex items-start gap-3 p-4 border-2 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
              >
                <span className="text-2xl">{r.label.split(' ')[0]}</span>
                <div>
                  <div className="font-medium text-gray-800">{r.label.split(' ').slice(1).join(' ')}</div>
                  <div className="text-xs text-gray-500">{r.desc}</div>
                </div>
              </button>
            ))}
            <p className="text-center text-sm text-gray-500 pt-2">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">Ingresar</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <button type="button" onClick={() => setStep(1)} className="text-indigo-600 text-sm hover:underline mb-2">
              ← Cambiar rubro
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nombre</label>
                <input value={form.nombre} onChange={field('nombre')} required
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Apellido</label>
                <input value={form.apellido} onChange={field('apellido')} required
                  className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input type="email" value={form.email} onChange={field('email')} required
                className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Contraseña</label>
              <input type="password" value={form.password} onChange={field('password')} required minLength={6}
                className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Nombre del negocio</label>
              <input value={form.org_nombre} onChange={field('org_nombre')} required
                className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Clínica San Blas" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">RUC (opcional)</label>
              <input value={form.org_ruc} onChange={field('org_ruc')}
                className="mt-0.5 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm mt-2">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
