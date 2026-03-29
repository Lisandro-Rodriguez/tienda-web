import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Registro from './pages/Registro'
import RecuperarPassword from './pages/RecuperarPassword'
import NuevaPassword from './pages/NuevaPassword'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Ventas from './pages/Ventas'
import Clientes from './pages/Clientes'
import Historial from './pages/Historial'
import Configuracion from './pages/Configuracion'
import Ayuda from './pages/Ayuda'

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, usuario } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && usuario?.rol !== 'ADMIN') return <Navigate to="/ventas" replace />
  return children
}

function IndexRoute() {
  const { usuario } = useAuthStore()
  return usuario?.rol === 'ADMIN'
    ? <Dashboard />
    : <Navigate to="/ventas" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/nueva-password" element={<NuevaPassword />} />
        <Route path="/ayuda" element={<Ayuda />} />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <ProtectedRoute><Layout /></ProtectedRoute>
        }>
          <Route index element={<IndexRoute />} />
          <Route path="dashboard" element={
            <ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>
          } />
          <Route path="inventario" element={<Inventario />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="historial" element={<Historial />} />
          <Route path="configuracion" element={
            <ProtectedRoute adminOnly><Configuracion /></ProtectedRoute>
          } />
          
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
