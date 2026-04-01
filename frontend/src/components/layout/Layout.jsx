import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  ClipboardList, Settings, LogOut, Store, HelpCircle,
  BarChart2, MoreHorizontal, X
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',  adminOnly: true },
  { to: '/ventas',        icon: ShoppingCart,    label: 'Caja',       always: true },
  { to: '/inventario',    icon: Package,         label: 'Inventario', always: true },
  { to: '/clientes',      icon: Users,           label: 'Fiado',      always: true },
  { to: '/historial',     icon: ClipboardList,   label: 'Historial',  always: true },
  { to: '/reportes',      icon: BarChart2,        label: 'Reportes',   adminOnly: true },
  { to: '/configuracion', icon: Settings,        label: 'Config',     adminOnly: true },
  { to: '/ayuda',         icon: HelpCircle,      label: 'Ayuda',      always: true },
]

// Bottom nav principal (sin "Más")
const BOTTOM_MAIN = [
  { to: '/ventas',     icon: ShoppingCart,  label: 'Caja'      },
  { to: '/inventario', icon: Package,       label: 'Inventario' },
  { to: '/clientes',   icon: Users,         label: 'Fiado'     },
  { to: '/historial',  icon: ClipboardList, label: 'Historial' },
]

export default function Layout() {
  const { usuario, negocioNombre, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [masAbierto, setMasAbierto] = useState(false)
  const isAdmin = usuario?.rol === 'ADMIN'

  const handleLogout = () => { logout(); navigate('/login') }
  const itemsVisibles = NAV_ITEMS.filter(i => i.always || (i.adminOnly && isAdmin))

  // Rutas que van en "Más" en móvil
  const itemsMas = itemsVisibles.filter(i =>
    !['/ventas', '/inventario', '/clientes', '/historial'].includes(i.to)
  )

  const masActivo = itemsMas.some(i => location.pathname.startsWith(i.to))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden md:flex w-56 bg-[#1e3a5f] flex-col shadow-xl flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store size={16} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight truncate">{negocioNombre || 'Mi Negocio'}</p>
              <p className="text-blue-300 text-xs truncate">{usuario?.username}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {itemsVisibles.filter(i => i.to !== '/ayuda').map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                isActive ? 'bg-blue-500 text-white shadow-md' : 'text-blue-100 hover:bg-white/10'
              )}>
              <item.icon size={18} />{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <NavLink to="/ayuda"
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
              isActive ? 'bg-blue-500 text-white shadow-md' : 'text-blue-100 hover:bg-white/10'
            )}>
            <HelpCircle size={18} /> Ayuda
          </NavLink>
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full mt-2 inline-block',
            isAdmin ? 'bg-blue-400/30 text-blue-200' : 'bg-white/10 text-blue-300')}>
            {usuario?.rol}
          </span>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-all">
            <LogOut size={18} />Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* ── CONTENIDO ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Página actual — sin header móvil */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* ── BOTTOM NAV MÓVIL ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
          <div className="flex">

            {/* Dashboard solo para admin (primer slot) */}
            {isAdmin && (
              <NavLink to="/dashboard" end
                className={({ isActive }) => clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}>
                <LayoutDashboard size={22} />
                <span className="mt-0.5 text-[10px] font-semibold">Inicio</span>
              </NavLink>
            )}

            {/* Items principales — si es admin muestra 4, si es cajero muestra los 4 de BOTTOM_MAIN */}
            {BOTTOM_MAIN.filter(i => {
              // Admin ya tiene Dashboard → mostrar los 4 de BOTTOM_MAIN
              // Cajero no tiene Dashboard → mostrar los 4 de BOTTOM_MAIN igual
              return true
            }).map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}>
                <item.icon size={22} />
                <span className="mt-0.5 text-[10px] font-semibold">{item.label}</span>
              </NavLink>
            ))}

            {/* Pestaña "Más" */}
            <button
              onClick={() => setMasAbierto(true)}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2 transition-colors border-none bg-transparent cursor-pointer',
                masActivo ? 'text-blue-600' : 'text-gray-400'
              )}>
              <MoreHorizontal size={22} />
              <span className="mt-0.5 text-[10px] font-semibold">Más</span>
            </button>

          </div>
        </nav>

        {/* ── DRAWER "MÁS" ── */}
        {masAbierto && (
          <div
            className="md:hidden fixed inset-0 z-50 flex items-end"
            onClick={() => setMasAbierto(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Panel */}
            <div
              className="relative w-full bg-white rounded-t-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{negocioNombre || 'Mi Negocio'}</p>
                  <p className="text-xs text-gray-400">{usuario?.username} · {usuario?.rol}</p>
                </div>
                <button onClick={() => setMasAbierto(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <X size={15} />
                </button>
              </div>

              {/* Items del menú "Más" */}
              <div className="px-4 py-3 grid grid-cols-3 gap-3">
                {itemsMas.map(item => {
                  const activo = location.pathname.startsWith(item.to)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMasAbierto(false)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 6, padding: '14px 8px',
                        borderRadius: 14, textDecoration: 'none',
                        background: activo ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${activo ? '#bfdbfe' : '#f1f5f9'}`,
                        color: activo ? '#2563eb' : '#64748b',
                        fontWeight: 600, fontSize: 12,
                      }}
                    >
                      <item.icon size={22} style={{ color: activo ? '#2563eb' : '#94a3b8' }} />
                      {item.label}
                    </NavLink>
                  )
                })}
              </div>

              {/* Cerrar sesión */}
              <div className="px-4 pb-5 pt-1">
                <button
                  onClick={() => { setMasAbierto(false); handleLogout() }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 8, padding: '13px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)',
                    color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  <LogOut size={17} /> Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
