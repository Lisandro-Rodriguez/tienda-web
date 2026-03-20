import { useState, useEffect } from 'react'
import { ventaService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Package, AlertTriangle, Users,
  DollarSign, BarChart2, RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function StatCard({ icon: Icon, title, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-extrabold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await ventaService.dashboard()
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  const pct = (ganancia, ventas) => ventas > 0 ? `${((ganancia / ventas) * 100).toFixed(1)}% margen` : 'Sin ventas'

  const chartData = data ? [
    { nombre: 'Hoy', ventas: data.hoy_ventas, ganancia: data.hoy_ganancia },
    { nombre: '7 días', ventas: data.semana_ventas, ganancia: data.semana_ganancia },
    { nombre: '30 días', ventas: data.mes_ventas, ganancia: data.mes_ganancia },
  ] : []

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  )

  // Bienvenida para negocios nuevos sin datos
  const esNuevo = !data?.total_productos && !data?.hoy_ventas
  if (esNuevo) return (
    <div className="p-4 md:p-6">
      <div className="max-w-lg mx-auto text-center py-8 md:py-12">
        <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🏪</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
          ¡Bienvenido a tu tienda!
        </h1>
        <p className="text-gray-500 mb-8">
          Tu sistema está listo. Seguí estos pasos para empezar:
        </p>
        <div className="space-y-3 text-left">
          {[
            { num: '1', titulo: 'Cargá tus productos', desc: 'Andá a Inventario y agregá tus productos con precio y stock', link: '/inventario' },
            { num: '2', titulo: 'Registrá tus clientes', desc: 'En Fiado podés agregar clientes para ventas a cuenta', link: '/clientes' },
            { num: '3', titulo: 'Empezá a vender', desc: 'Usá la Caja para registrar ventas escaneando códigos', link: '/ventas' },
          ].map(paso => (
            <a key={paso.num} href={paso.link}
              className="flex items-start gap-4 card p-4 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer no-underline">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                {paso.num}
              </div>
              <div>
                <p className="font-bold text-gray-800">{paso.titulo}</p>
                <p className="text-sm text-gray-500">{paso.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">Resumen de tu negocio</p>
        </div>
        <button onClick={cargar} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Tarjetas de ganancias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={DollarSign} title="Ganancia hoy"
          value={fmt(data?.hoy_ganancia)}
          sub={pct(data?.hoy_ganancia, data?.hoy_ventas)}
          color="bg-green-500"
        />
        <StatCard
          icon={TrendingUp} title="Ganancia semana"
          value={fmt(data?.semana_ganancia)}
          sub={pct(data?.semana_ganancia, data?.semana_ventas)}
          color="bg-blue-500"
        />
        <StatCard
          icon={BarChart2} title="Ganancia 30 días"
          value={fmt(data?.mes_ganancia)}
          sub={pct(data?.mes_ganancia, data?.mes_ventas)}
          color="bg-purple-500"
        />
      </div>

      {/* Tarjetas de estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={Package} title="Productos en stock"
          value={data?.total_productos || 0}
          sub="Total registrados"
          color="bg-indigo-500"
        />
        <StatCard
          icon={AlertTriangle} title="Stock bajo"
          value={data?.productos_bajo_stock || 0}
          sub={data?.productos_bajo_stock > 0 ? 'Clic para ver' : 'Todo OK'}
          color={data?.productos_bajo_stock > 0 ? 'bg-red-500' : 'bg-gray-400'}
          onClick={data?.productos_bajo_stock > 0 ? () => navigate('/inventario?bajo_stock=true') : null}
        />
        <StatCard
          icon={Users} title="Clientes con deuda"
          value={data?.clientes_con_deuda || 0}
          sub={`de ${data?.total_clientes || 0} clientes`}
          color="bg-orange-500"
          onClick={() => navigate('/clientes')}
        />
      </div>

      {/* Gráfico */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-700 mb-4">Ventas vs Ganancia</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(val) => fmt(val)} />
            <Bar dataKey="ventas"   name="Ventas"   fill="#3b82f6" radius={[6,6,0,0]} />
            <Bar dataKey="ganancia" name="Ganancia" fill="#22c55e" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
