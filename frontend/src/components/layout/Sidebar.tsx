import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Stethoscope, Calendar, ClipboardList, Syringe,
  Scissors, Users, Briefcase, ShoppingBag, Package, CreditCard,
  Settings, Shield, X, BarChart2, FileText
} from 'lucide-react'
import { clsx } from 'clsx'
import type { Organizacion } from '../../api/organizacion'

interface SidebarProps {
  org: Organizacion | undefined
  open: boolean
  onClose: () => void
}

const VET_LINKS = [
  { to: '/veterinaria/pacientes', icon: Stethoscope, label: 'Pacientes' },
  { to: '/veterinaria/propietarios', icon: Users, label: 'Propietarios' },
  { to: '/veterinaria/citas', icon: Calendar, label: 'Citas' },
  { to: '/veterinaria/historiales', icon: ClipboardList, label: 'Historiales' },
  { to: '/veterinaria/vacunas', icon: Syringe, label: 'Vacunas' },
]

const BELLEZA_LINKS = [
  { to: '/belleza/clientes', icon: Users, label: 'Clientes' },
  { to: '/belleza/servicios', icon: Scissors, label: 'Servicios' },
  { to: '/belleza/citas', icon: Calendar, label: 'Agenda' },
  { to: '/belleza/staff', icon: Briefcase, label: 'Staff' },
]

const ROPERIA_LINKS = [
  { to: '/roperia/pos', icon: CreditCard, label: 'Caja (POS)' },
  { to: '/roperia/productos', icon: ShoppingBag, label: 'Productos' },
  { to: '/roperia/categorias', icon: Package, label: 'Categorías' },
  { to: '/roperia/ventas', icon: ClipboardList, label: 'Ventas' },
]

const RUBRO_LINKS: Record<string, typeof VET_LINKS> = {
  veterinaria: VET_LINKS,
  belleza: BELLEZA_LINKS,
  roperia: ROPERIA_LINKS,
}

const RUBRO_COLOR: Record<string, string> = {
  veterinaria: 'bg-emerald-600',
  belleza: 'bg-pink-600',
  roperia: 'bg-violet-600',
}

const RUBRO_LABEL: Record<string, string> = {
  veterinaria: '🐾 Veterinaria',
  belleza: '✂️ Belleza',
  roperia: '👗 Ropería',
}

export default function Sidebar({ org, open, onClose }: SidebarProps) {
  const rubro = org?.rubro ?? ''
  const links = RUBRO_LINKS[rubro] ?? []
  const color = RUBRO_COLOR[rubro] ?? 'bg-indigo-600'

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300',
          'bg-white border-r border-gray-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        )}
      >
        {/* Logo / org */}
        <div className={clsx('flex items-center justify-between px-4 py-4', color)}>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Rubro</div>
            <div className="text-white/80 text-xs truncate max-w-[10rem]">
              {org?.nombre ?? '...'}
            </div>
            <div className="text-white/60 text-xs">{RUBRO_LABEL[rubro]}</div>
          </div>
          <button onClick={onClose} className="lg:hidden text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          {links.map((l) => (
            <NavItem key={l.to} to={l.to} icon={l.icon} label={l.label} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <NavItem to="/facturacion" icon={FileText} label="Facturación" />
          <NavItem to="/reportes" icon={BarChart2} label="Reportes" />
          <NavItem to="/configuracion" icon={Settings} label="Configuración" />
          <NavItem to="/admin" icon={Shield} label="Superadmin" />
        </div>
      </aside>
    </>
  )
}

function NavItem({
  to, icon: Icon, label,
}: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  )
}
