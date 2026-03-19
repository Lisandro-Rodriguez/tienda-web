import { useState, useEffect, useRef } from 'react'
import { productoService, ventaService, clienteService } from '../services/api'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, X } from 'lucide-react'

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Fiado']

export default function Ventas() {
  const [carrito, setCarrito] = useState([])
  const [codigo, setCodigo] = useState('')
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [pagaCon, setPagaCon] = useState('')
  const [procesando, setProcesando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    clienteService.listar().then(r => setClientes(r.data)).catch(() => {})
    inputRef.current?.focus()
  }, [])

  const total = carrito.reduce((s, i) => s + i.subtotal, 0)
  const vuelto = pagaCon ? Math.max(0, parseFloat(pagaCon || 0) - total) : 0

  const agregarProducto = async (e) => {
    e.preventDefault()
    if (!codigo.trim()) return
    try {
      const res = await productoService.buscarPorCodigo(codigo.trim())
      const prod = res.data
      if (!prod) { toast.error('Producto no encontrado'); return }
      if (prod.stock <= 0) { toast.error('Sin stock disponible'); return }

      setCarrito(c => {
        const idx = c.findIndex(i => i.producto_id === prod.id)
        if (idx >= 0) {
          const nuevo = [...c]
          nuevo[idx] = {
            ...nuevo[idx],
            cantidad: nuevo[idx].cantidad + 1,
            subtotal: (nuevo[idx].cantidad + 1) * nuevo[idx].precio_unitario
          }
          return nuevo
        }
        return [...c, {
          producto_id: prod.id,
          nombre_producto: prod.nombre,
          cantidad: 1,
          precio_unitario: prod.precio_venta,
          precio_costo: prod.precio_costo,
          subtotal: prod.precio_venta
        }]
      })
      setCodigo('')
      inputRef.current?.focus()
    } catch {
      toast.error('Producto no encontrado')
    }
  }

  const cambiarCantidad = (idx, delta) => {
    setCarrito(c => {
      const nuevo = [...c]
      const item = nuevo[idx]
      const nuevaCant = item.cantidad + delta
      if (nuevaCant <= 0) return c.filter((_, i) => i !== idx)
      nuevo[idx] = { ...item, cantidad: nuevaCant, subtotal: nuevaCant * item.precio_unitario }
      return nuevo
    })
  }

  const confirmarVenta = async () => {
    if (carrito.length === 0) { toast.error('El carrito está vacío'); return }
    if (metodo === 'Fiado' && !clienteId) { toast.error('Seleccioná un cliente para venta a fiado'); return }
    if (metodo === 'Efectivo' && pagaCon && parseFloat(pagaCon) < total) {
      toast.error(`Monto insuficiente. Faltan $${(total - parseFloat(pagaCon)).toFixed(2)}`)
      return
    }

    setProcesando(true)
    try {
      await ventaService.registrar({
        cliente_id: clienteId ? parseInt(clienteId) : null,
        metodo_pago: metodo,
        items: carrito
      })
      toast.success('¡Venta registrada!')
      setCarrito([])
      setCodigo('')
      setPagaCon('')
      setClienteId('')
      setMetodo('Efectivo')
      inputRef.current?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar venta')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: búsqueda y carrito */}
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-auto">
        <h1 className="text-2xl font-extrabold text-gray-800">Caja y Ventas</h1>

        {/* Buscador */}
        <form onSubmit={agregarProducto} className="flex gap-2">
          <input
            ref={inputRef}
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            className="input flex-1 text-base"
            placeholder="Escanear código de barras o buscar producto..."
            autoComplete="off"
          />
          <button type="submit" className="btn-primary px-5">Agregar</button>
        </form>

        {/* Carrito */}
        {carrito.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <ShoppingCart size={64} />
            <p className="mt-3 text-lg font-semibold">Carrito vacío</p>
            <p className="text-sm">Escaneá un producto para empezar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carrito.map((item, idx) => (
              <div key={idx} className="card p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{item.nombre_producto}</p>
                  <p className="text-xs text-gray-500">${item.precio_unitario.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(idx, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-bold">{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(idx, 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
                <p className="w-24 text-right font-bold text-gray-800">${item.subtotal.toFixed(2)}</p>
                <button onClick={() => setCarrito(c => c.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 ml-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel derecho: cobro */}
      <div className="w-80 bg-white border-l border-gray-100 flex flex-col p-5 space-y-4">
        <h2 className="font-bold text-lg text-gray-700">Resumen</h2>

        {/* Total */}
        <div className="bg-blue-600 rounded-2xl p-5 text-white text-center">
          <p className="text-sm font-semibold opacity-80">TOTAL</p>
          <p className="text-4xl font-extrabold">${total.toFixed(2)}</p>
        </div>

        {/* Método de pago */}
        <div>
          <label className="label">Método de pago</label>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(m => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  metodo === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente (si es fiado) */}
        {metodo === 'Fiado' && (
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccioná cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} (deuda: ${c.deuda_total.toFixed(2)})</option>
              ))}
            </select>
          </div>
        )}

        {/* Paga con (efectivo) */}
        {metodo === 'Efectivo' && (
          <div>
            <label className="label">Paga con ($)</label>
            <input
              type="number" step="0.01" className="input"
              value={pagaCon} onChange={e => setPagaCon(e.target.value)}
              placeholder="0.00"
            />
            {pagaCon && (
              parseFloat(pagaCon) >= total ? (
                <p className="text-green-600 font-bold text-sm mt-1">
                  ✓ Vuelto: ${(parseFloat(pagaCon) - total).toFixed(2)}
                </p>
              ) : (
                <p className="text-red-500 font-bold text-sm mt-1">
                  ✗ Falta: ${(total - parseFloat(pagaCon)).toFixed(2)}
                </p>
              )
            )}
          </div>
        )}

        {/* Botones */}
        <div className="space-y-2 mt-auto">
          <button
            onClick={confirmarVenta}
            disabled={procesando || carrito.length === 0}
            className="btn-success w-full py-3 text-base flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            {procesando ? 'Procesando...' : 'Confirmar venta'}
          </button>
          <button
            onClick={() => { setCarrito([]); setPagaCon(''); }}
            className="btn-secondary w-full text-sm"
          >
            Limpiar carrito
          </button>
        </div>
      </div>
    </div>
  )
}
