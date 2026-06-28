import { Menu, LogOut, Bell } from 'lucide-react'
import type { UserMe } from '../../api/auth'

interface TopbarProps {
  user: UserMe | null
  onMenuToggle: () => void
  onLogout: () => void
}

export default function Topbar({ user, onMenuToggle, onLogout }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative">
        <Bell size={18} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
          {user?.nombre?.[0]?.toUpperCase() ?? '?'}
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700">
          {user?.nombre}
        </span>
      </div>

      <button
        onClick={onLogout}
        className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
        title="Cerrar sesión"
      >
        <LogOut size={18} />
      </button>
    </header>
  )
}
