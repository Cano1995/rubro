import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useOrganizacion } from './hooks/useOrganizacion'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'

// Páginas públicas
import Login from './pages/Login'
import Register from './pages/Register'

// Páginas protegidas base
import Dashboard from './pages/Dashboard'

// Veterinaria
import VetPacientes from './pages/veterinaria/Pacientes'
import VetCitas from './pages/veterinaria/Citas'

// Belleza
import BelClientes from './pages/belleza/Clientes'
import BelCitas from './pages/belleza/Citas'
import BelServicios from './pages/belleza/Servicios'

// Ropería
import RopPOS from './pages/roperia/POS'
import RopProductos from './pages/roperia/Productos'
import RopVentas from './pages/roperia/Ventas'

// Admin
import AdminPanel from './pages/admin/Panel'

function AppShell() {
  const { user, loading, logout } = useAuth()
  const { org } = useOrganizacion()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        org={org}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          user={user}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Módulo veterinaria */}
            <Route path="/veterinaria/pacientes" element={<VetPacientes />} />
            <Route path="/veterinaria/citas" element={<VetCitas />} />

            {/* Módulo belleza */}
            <Route path="/belleza/clientes" element={<BelClientes />} />
            <Route path="/belleza/citas" element={<BelCitas />} />
            <Route path="/belleza/servicios" element={<BelServicios />} />

            {/* Módulo ropería */}
            <Route path="/roperia/pos" element={<RopPOS />} />
            <Route path="/roperia/productos" element={<RopProductos />} />
            <Route path="/roperia/ventas" element={<RopVentas />} />

            {/* Superadmin */}
            <Route path="/admin" element={<AdminPanel />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}
