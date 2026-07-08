import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSuscripcion } from '../hooks/useSuscripcion'

export default function AlertaSuscripcion() {
  const { porVencer, vencida, diasRestantes, suscripcion } = useSuscripcion()
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (dismissed || (!porVencer && !vencida)) return null
  if (suscripcion?.estado === 'prueba' && diasRestantes !== null && diasRestantes > 7) return null

  const isPrueba = suscripcion?.estado === 'prueba'
  const isPerpetuaMantenimiento = suscripcion?.tipo === 'perpetua'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm ${vencida ? 'bg-red-600' : 'bg-amber-500'} text-white`}>
      <AlertTriangle size={15} className="shrink-0" />
      <p className="flex-1">
        {vencida
          ? isPerpetuaMantenimiento
            ? 'Tu mantenimiento anual ha vencido. Algunas funciones pueden estar limitadas.'
            : 'Tu suscripción ha vencido. Algunas funciones pueden estar limitadas.'
          : isPrueba
          ? `Tu período de prueba vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`
          : isPerpetuaMantenimiento
          ? `Tu mantenimiento anual vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`
          : `Tu suscripción vence en ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}.`
        }
        {' '}
        <button
          onClick={() => navigate('/configuracion')}
          className="underline font-medium hover:no-underline"
        >
          Ver planes
        </button>
      </p>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}
