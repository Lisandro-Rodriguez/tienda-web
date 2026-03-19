import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  ClipboardList, Settings, LogOut, Store
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    always: true },
  { to: '/ventas',       icon: ShoppingCart,    label: 'Caja y Ventas', always: true },
  { to: '/inventario',   icon: Package,         label: 'Inventario',    always: true },
  { to: '/clientes',     icon: Users,           label: 'Fiado',         always: true },
  { to: '/historial',    icon: ClipboardList,   label: 'Historial',     always: true },
  { to: '/configuracion',icon: Settings,        label: 'Configuracion', adminOnly: true },
]

export default function Layout() {
  const { usuario, negocioNombre, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = usuario?.rol === 'ADMIN'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1e3a5f] flex flex-col shadow-xl">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight truncate max-w-[120px]">
                {negocioNombre || 'Mi Negocio'}
              </p>
              <p className="text-blue-300 text-xs">{usuario?.username}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            if (item.adminOnly && !isAdmin) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-blue-100 hover:bg-white/10'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full',
              isAdmin ? 'bg-blue-400/30 text-blue-200' : 'bg-white/10 text-blue-300')}>
              {usuario?.rol}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-all"
          >
            <LogOut size={18} />
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
