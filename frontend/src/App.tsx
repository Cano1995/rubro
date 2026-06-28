import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useOrganizacion } from './hooks/useOrganizacion'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import AlertaSuscripcion from './components/AlertaSuscripcion'

// Páginas públicas
import Login from './pages/Login'
import Register from './pages/Register'

// Páginas protegidas base
import Dashboard from './pages/Dashboard'
import Configuracion from './pages/Configuracion'

// Veterinaria
import VetPacientes from './pages/veterinaria/Pacientes'
import VetPropietarios from './pages/veterinaria/Propietarios'
import VetCitas from './pages/veterinaria/Citas'
import VetHistoriales from './pages/veterinaria/Historiales'
import VetVacunas from './pages/veterinaria/Vacunas'

// Belleza
import BelClientes from './pages/belleza/Clientes'
import BelCitas from './pages/belleza/Citas'
import BelServicios from './pages/belleza/Servicios'
import BelStaff from './pages/belleza/Staff'

// Ropería
import RopPOS from './pages/roperia/POS'
import RopProductos from './pages/roperia/Productos'
import RopVentas from './pages/roperia/Ventas'
import RopCategorias from './pages/roperia/Categorias'

// Reportes
import Reportes from './pages/Reportes'

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
        <AlertaSuscripcion />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Módulo veterinaria */}
            <Route path="/veterinaria/pacientes" element={<VetPacientes />} />
            <Route path="/veterinaria/propietarios" element={<VetPropietarios />} />
            <Route path="/veterinaria/citas" element={<VetCitas />} />
            <Route path="/veterinaria/historiales" element={<VetHistoriales />} />
            <Route path="/veterinaria/vacunas" element={<VetVacunas />} />

            {/* Módulo belleza */}
            <Route path="/belleza/clientes" element={<BelClientes />} />
            <Route path="/belleza/citas" element={<BelCitas />} />
            <Route path="/belleza/servicios" element={<BelServicios />} />
            <Route path="/belleza/staff" element={<BelStaff />} />

            {/* Módulo ropería */}
            <Route path="/roperia/pos" element={<RopPOS />} />
            <Route path="/roperia/productos" element={<RopProductos />} />
            <Route path="/roperia/ventas" element={<RopVentas />} />
            <Route path="/roperia/categorias" element={<RopCategorias />} />

            {/* Base */}
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />

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
