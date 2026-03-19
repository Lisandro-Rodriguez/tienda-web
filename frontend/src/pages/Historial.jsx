// Historial.jsx
import { useState, useEffect } from 'react'
import { ventaService } from '../services/api'
import toast from 'react-hot-toast'

export function Historial() {
  const [ventas, setVentas] = useState([])
  const [periodo, setPeriodo] = useState('hoy')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    ventaService.listar(periodo)
      .then(r => setVentas(r.data))
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [periodo])

  const totalPeriodo = ventas.reduce((s, v) => s + v.total, 0)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Historial de Ventas</h1>
          <p className="text-sm text-gray-500">Total: ${totalPeriodo.toFixed(2)}</p>
        </div>
        <div className="flex gap-2">
          {['hoy', 'semana', 'mes', 'todo'].map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                periodo === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}>
              {p === 'todo' ? 'Todo' : p === 'hoy' ? 'Hoy' : p === 'semana' ? '7 días' : '30 días'}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['#', 'Fecha', 'Items', 'Método', 'Total', 'Ganancia'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : ventas.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin ventas en este período</td></tr>
            ) : ventas.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400 text-xs">#{v.id}</td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ').substring(0, 40)}
                  {v.items?.length > 1 ? '...' : ''}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    v.metodo_pago === 'Fiado' ? 'bg-orange-100 text-orange-700' :
                    v.metodo_pago === 'Efectivo' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{v.metodo_pago}</span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-800">${v.total.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-green-600">
                  ${(v.total - v.costo_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Historial
