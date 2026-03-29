import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useState } from 'react'
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  ClipboardList, Settings, LogOut, Store, Menu, X, HelpCircle
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',  adminOnly: true },
  { to: '/ventas',        icon: ShoppingCart,    label: 'Caja',       always: true },
  { to: '/inventario',    icon: Package,         label: 'Inventario', always: true },
  { to: '/clientes',      icon: Users,           label: 'Fiado',      always: true },
  { to: '/historial',     icon: ClipboardList,   label: 'Historial',  always: true },
  { to: '/configuracion', icon: Settings,        label: 'Config',     adminOnly: true },
  { to: '/ayuda',         icon: HelpCircle,      label: 'Ayuda',      always: true },
]

// Bottom nav muestra máx 5 items — priorizamos los más usados, Ayuda va en el menú hamburguesa
const BOTTOM_NAV_ITEMS = [
  { to: '/ventas',     icon: ShoppingCart,  label: 'Caja'      },
  { to: '/inventario', icon: Package,       label: 'Inventario' },
  { to: '/clientes',   icon: Users,         label: 'Fiado'     },
  { to: '/historial',  icon: ClipboardList, label: 'Historial' },
  { to: '/ayuda',      icon: HelpCircle,    label: 'Ayuda'     },
]

export default function Layout() {
  const { usuario, negocioNombre, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const isAdmin = usuario?.rol === 'ADMIN'

  const handleLogout = () => { logout(); navigate('/login') }
  const itemsVisibles = NAV_ITEMS.filter(i => i.always || (i.adminOnly && isAdmin))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* SIDEBAR DESKTOP */}
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

        {/* Ayuda + logout al fondo */}
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

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header móvil */}
        <header className="md:hidden bg-[#1e3a5f] px-4 py-3 flex items-center justify-between flex-shrink-0 safe-top">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-400 rounded-lg flex items-center justify-center">
              <Store size={14} className="text-white" />
            </div>
            <p className="text-white font-bold text-sm truncate max-w-[180px]">{negocioNombre || 'Mi Negocio'}</p>
          </div>
          <button onClick={() => setMenuAbierto(!menuAbierto)} className="text-white p-1">
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Menú desplegable móvil */}
        {menuAbierto && (
          <div className="md:hidden bg-[#1e3a5f] px-3 pb-3 space-y-1 flex-shrink-0 shadow-lg z-50">
            {itemsVisibles.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all',
                  isActive ? 'bg-blue-500 text-white' : 'text-blue-100 hover:bg-white/10'
                )}>
                <item.icon size={18} />{item.label}
              </NavLink>
            ))}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/20">
              <LogOut size={18} />Cerrar Sesion
            </button>
          </div>
        )}

        {/* Página actual */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* BOTTOM NAV MÓVIL */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex">
            {/* Admin ve Dashboard en lugar de Ayuda en el bottom nav */}
            {isAdmin && (
              <NavLink to="/dashboard" end
                className={({ isActive }) => clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}>
                <LayoutDashboard size={22} />
                <span className="mt-0.5 text-[10px] font-semibold">Dashboard</span>
              </NavLink>
            )}
            {BOTTOM_NAV_ITEMS.filter(i =>
              // Si es admin, omitir Ayuda del bottom nav (ya tiene Dashboard que ocupa el 5to slot)
              isAdmin ? i.to !== '/ayuda' : true
            ).map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => clsx(
                  'flex-1 flex flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}>
                <item.icon size={22} />
                <span className="mt-0.5 text-[10px] font-semibold">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}
