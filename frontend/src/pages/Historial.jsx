import { useState, useEffect } from 'react'
import { ventaService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { FileText } from 'lucide-react'
import { generarTicketPDF } from '../utils/ticketPDF'

export default function Historial() {
  const [ventas, setVentas] = useState([])
  const [periodo, setPeriodo] = useState('hoy')
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)

  useEffect(() => {
    negocioService.miNegocio().then(r => setNegocio(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    ventaService.listar(periodo)
      .then(r => setVentas(r.data))
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [periodo])

  const totalPeriodo = ventas.reduce((s, v) => s + v.total, 0)
  const gananciaTotal = ventas.reduce((s, v) => s + (v.total - v.costo_total), 0)

  const periodos = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: '7 días' },
    { key: 'mes', label: '30 días' },
    { key: 'todo', label: 'Todo' },
  ]

  const descargarTicket = (venta) => {
    generarTicketPDF({ venta, negocio })
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-800">Historial de Ventas</h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-gray-500">Total: <strong>${totalPeriodo.toFixed(2)}</strong></p>
          <p className="text-sm text-green-600">Ganancia: <strong>${gananciaTotal.toFixed(2)}</strong></p>
        </div>
      </div>

      {/* Filtros período */}
      <div className="flex gap-2">
        {periodos.map(p => (
          <button key={p.key} onClick={() => setPeriodo(p.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              periodo === p.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Tabla desktop */}
      <div className="card p-0 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['#', 'Fecha', 'Items', 'Método', 'Total', 'Ganancia', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : ventas.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sin ventas en este período</td></tr>
            ) : ventas.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">#{v.id}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">
                  {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    v.metodo_pago === 'Fiado' ? 'bg-orange-100 text-orange-700' :
                    v.metodo_pago === 'Efectivo' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{v.metodo_pago}</span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-800">${v.total.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-green-600">${(v.total - v.costo_total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => descargarTicket(v)}
                    title="Descargar ticket"
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded"
                  >
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-2">
        {loading ? (
          <p className="text-center py-8 text-gray-400">Cargando...</p>
        ) : ventas.length === 0 ? (
          <p className="text-center py-8 text-gray-400">Sin ventas en este período</p>
        ) : ventas.map(v => (
          <div key={v.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">#{v.id} · {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ').substring(0, 50)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-gray-800">${v.total.toFixed(2)}</p>
                  <p className="text-xs text-green-600">+${(v.total - v.costo_total).toFixed(2)}</p>
                </div>
                <button
                  onClick={() => descargarTicket(v)}
                  title="Descargar ticket"
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50"
                >
                  <FileText size={18} />
                </button>
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                v.metodo_pago === 'Fiado' ? 'bg-orange-100 text-orange-700' :
                v.metodo_pago === 'Efectivo' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>{v.metodo_pago}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
