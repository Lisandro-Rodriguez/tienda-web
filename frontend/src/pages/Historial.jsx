import { useState, useEffect } from 'react'
import { ventaService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { FileText, X, User, CreditCard, Package } from 'lucide-react'
import { generarTicketPDF } from '../utils/ticketPDF'

export default function Historial() {
  const [ventas, setVentas] = useState([])
  const [periodo, setPeriodo] = useState('hoy')
  const [loading, setLoading] = useState(true)
  const [negocio, setNegocio] = useState(null)

  // Modal de detalle
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  const ticketAbrirAutomatico = localStorage.getItem('ticket_abrir_automatico') === 'true'

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

  const abrirDetalle = async (venta) => {
    setLoadingDetalle(true)
    setVentaDetalle(venta) // mostrar modal inmediatamente con datos del listado
    try {
      const res = await ventaService.obtener(venta.id)
      setVentaDetalle(res.data) // actualizar con datos completos (cliente, etc)
    } catch {
      toast.error('Error al cargar el detalle')
    } finally {
      setLoadingDetalle(false)
    }
  }

  const cerrarDetalle = () => setVentaDetalle(null)

  const descargarTicket = (venta, e) => {
    e?.stopPropagation()
    generarTicketPDF({ venta, negocio, abrirAutomatico: ticketAbrirAutomatico })
  }

  const metodoBadge = (metodo) => {
    const base = 'text-xs font-bold px-2 py-0.5 rounded-full'
    if (metodo === 'Fiado') return `${base} bg-orange-100 text-orange-700`
    if (metodo === 'Efectivo') return `${base} bg-green-100 text-green-700`
    return `${base} bg-blue-100 text-blue-700`
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
              {['#', 'Fecha', 'Cajero', 'Items', 'Método', 'Total', 'Ganancia', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Cargando...</td></tr>
            ) : ventas.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Sin ventas en este período</td></tr>
            ) : ventas.map(v => (
              <tr key={v.id}
                onClick={() => abrirDetalle(v)}
                className="hover:bg-blue-50 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">#{v.id}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs font-medium">
                  {v.cajero_username || '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate">
                  {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ')}
                </td>
                <td className="px-4 py-3">
                  <span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span>
                </td>
                <td className="px-4 py-3 font-bold text-gray-800">${v.total.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-green-600">${(v.total - v.costo_total).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button onClick={(e) => descargarTicket(v, e)} title="Descargar ticket"
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded">
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
          <div key={v.id} className="card p-4 cursor-pointer active:bg-blue-50 transition-colors"
            onClick={() => abrirDetalle(v)}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">
                  #{v.id} · {new Date(v.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                {v.cajero_username && (
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">{v.cajero_username}</p>
                )}
                <p className="text-sm text-gray-600 mt-0.5">
                  {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ').substring(0, 50)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-gray-800">${v.total.toFixed(2)}</p>
                  <p className="text-xs text-green-600">+${(v.total - v.costo_total).toFixed(2)}</p>
                </div>
                <button onClick={(e) => descargarTicket(v, e)} title="Descargar ticket"
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50">
                  <FileText size={18} />
                </button>
              </div>
            </div>
            <div className="mt-2">
              <span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modal detalle de venta ────────────────────────────────────── */}
      {ventaDetalle && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={cerrarDetalle}>

          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-extrabold text-gray-800 text-lg">
                  Venta #{ventaDetalle.id}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(ventaDetalle.fecha).toLocaleString('es-AR', {
                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>
              <button onClick={cerrarDetalle}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Info cajero / cliente / método */}
            <div className="px-5 py-3 bg-gray-50 flex flex-wrap gap-3 border-b border-gray-100">
              {ventaDetalle.cajero_username && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <User size={13} className="text-blue-500" />
                  <span className="font-semibold">{ventaDetalle.cajero_username}</span>
                </div>
              )}
              {ventaDetalle.cliente_nombre && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Package size={13} className="text-orange-500" />
                  <span className="font-semibold">{ventaDetalle.cliente_nombre}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs">
                <CreditCard size={13} className="text-gray-400" />
                <span className={`font-bold px-2 py-0.5 rounded-full ${
                  ventaDetalle.metodo_pago === 'Fiado' ? 'bg-orange-100 text-orange-700' :
                  ventaDetalle.metodo_pago === 'Efectivo' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{ventaDetalle.metodo_pago}</span>
              </div>
            </div>

            {/* Items */}
            <div className="px-5 py-3 max-h-64 overflow-y-auto">
              {loadingDetalle ? (
                <p className="text-center py-6 text-gray-400 text-sm">Cargando detalle...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                      <th className="text-left pb-2">Producto</th>
                      <th className="text-center pb-2">Cant.</th>
                      <th className="text-right pb-2">Precio</th>
                      <th className="text-right pb-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ventaDetalle.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-800 font-medium pr-2">{item.nombre_producto}</td>
                        <td className="py-2 text-center text-gray-500">{item.cantidad}</td>
                        <td className="py-2 text-right text-gray-500">${item.precio_unitario.toFixed(2)}</td>
                        <td className="py-2 text-right font-semibold text-gray-800">${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer: total + botón ticket */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-2xl font-extrabold text-gray-800">${ventaDetalle.total.toFixed(2)}</p>
                <p className="text-xs text-green-600 font-semibold">
                  Ganancia: ${(ventaDetalle.total - ventaDetalle.costo_total).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => descargarTicket(ventaDetalle)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                <FileText size={16} />
                Ticket PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
