import { useState, useEffect, useRef } from 'react'
import { productoService, ventaService, clienteService } from '../services/api'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, ChevronUp, ChevronDown, Camera } from 'lucide-react'
import EscanerCamara from '../components/ui/EscanerCamara'

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Fiado']

export default function Ventas() {
  const [carrito, setCarrito] = useState([])
  const [codigo, setCodigo] = useState('')
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [metodo, setMetodo] = useState('Efectivo')
  const [pagaCon, setPagaCon] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mostrarResumen, setMostrarResumen] = useState(false)
  const [sugerencias, setSugerencias] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    clienteService.listar().then(r => setClientes(r.data)).catch(() => {})
    inputRef.current?.focus()
  }, [])

  const total = carrito.reduce((s, i) => s + i.subtotal, 0)
  const vuelto = pagaCon ? Math.max(0, parseFloat(pagaCon || 0) - total) : 0
  const falta = pagaCon && parseFloat(pagaCon) < total ? total - parseFloat(pagaCon) : 0

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
          nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1, subtotal: (nuevo[idx].cantidad + 1) * nuevo[idx].precio_unitario }
          return nuevo
        }
        return [...c, { producto_id: prod.id, nombre_producto: prod.nombre, cantidad: 1, precio_unitario: prod.precio_venta, precio_costo: prod.precio_costo, subtotal: prod.precio_venta }]
      })
      setCodigo('')
      inputRef.current?.focus()
    } catch { toast.error('Producto no encontrado') }
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
      toast.error(`Monto insuficiente. Faltan $${falta.toFixed(2)}`); return
    }
    setProcesando(true)
    try {
      await ventaService.registrar({ cliente_id: clienteId ? parseInt(clienteId) : null, metodo_pago: metodo, items: carrito })
      toast.success('¡Venta registrada!')
      setCarrito([]); setCodigo(''); setPagaCon(''); setClienteId(''); setMetodo('Efectivo')
      setMostrarResumen(false)
      inputRef.current?.focus()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar venta')
    } finally { setProcesando(false) }
  }

  return (
    <div className="flex flex-col md:flex-row h-full">

      {/* Panel izquierdo: búsqueda y carrito */}
      <div className="flex-1 flex flex-col p-4 md:p-6 space-y-3 overflow-auto">
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-800">Caja y Ventas</h1>

        {/* Buscador con sugerencias por nombre */}
        <form onSubmit={agregarProducto} className="flex gap-2 relative">
          <div className="flex-1 relative">
            <input ref={inputRef} value={codigo} onChange={async e => {
              const val = e.target.value
              setCodigo(val)
              if (val.length >= 2 && isNaN(val)) {
                try {
                  const res = await productoService.listar({ busqueda: val })
                  setSugerencias(res.data.slice(0, 6))
                  setMostrarSugerencias(res.data.length > 0)
                } catch { setSugerencias([]); setMostrarSugerencias(false) }
              } else {
                setSugerencias([])
                setMostrarSugerencias(false)
              }
            }}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              className="input w-full text-base" placeholder="Código de barras o nombre del producto..."
              autoComplete="off" />
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div style={{position:'absolute', zIndex:9999, width:'100%', background:'white',
                border:'1px solid #e5e7eb', borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
                top:'100%', marginTop:'4px', maxHeight:'240px', overflowY:'auto'}}>
                {sugerencias.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={() => {
                      if (p.stock <= 0) { toast.error('Sin stock disponible'); return }
                      setCarrito(c => {
                        const idx = c.findIndex(i => i.producto_id === p.id)
                        if (idx >= 0) {
                          const nuevo = [...c]
                          nuevo[idx] = { ...nuevo[idx], cantidad: nuevo[idx].cantidad + 1, subtotal: (nuevo[idx].cantidad + 1) * nuevo[idx].precio_unitario }
                          return nuevo
                        }
                        return [...c, { producto_id: p.id, nombre_producto: p.nombre, cantidad: 1, precio_unitario: p.precio_venta, precio_costo: p.precio_costo, subtotal: p.precio_venta }]
                      })
                      setCodigo('')
                      setSugerencias([])
                      setMostrarSugerencias(false)
                      inputRef.current?.focus()
                    }}
                    style={{display:'flex', width:'100%', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', background:'none', border:'none', cursor:'pointer',
                      borderBottom:'1px solid #f3f4f6', textAlign:'left'}}
                    onMouseEnter={e => e.currentTarget.style.background='#eff6ff'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}
                  >
                    <div>
                      <p style={{fontWeight:600, fontSize:'14px', color:'#1f2937'}}>{p.nombre}</p>
                      <p style={{fontSize:'12px', color:'#9ca3af'}}>{p.marca} · Stock: {p.stock}</p>
                    </div>
                    <div style={{textAlign:'right', flexShrink:0, marginLeft:'12px'}}>
                      <p style={{fontWeight:700, color:'#059669'}}>${p.precio_venta.toFixed(2)}</p>
                      {p.stock <= 5 && <p style={{fontSize:'11px', color:'#ef4444'}}>⚠️ Poco stock</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => setMostrarEscaner(true)}
            className="md:hidden btn-secondary px-3 flex items-center gap-1">
            <Camera size={18} />
          </button>
          <button type="submit" className="btn-primary px-4">+</button>
        </form>

        {mostrarEscaner && (
          <EscanerCamara
            onEscaneo={(codigo) => {
              setCodigo(codigo)
              // Buscar automáticamente al escanear
              setTimeout(() => {
                document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
              }, 100)
            }}
            onCerrar={() => setMostrarEscaner(false)}
          />
        )}

        {/* Carrito */}
        {carrito.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-12">
            <ShoppingCart size={56} />
            <p className="mt-3 font-semibold">Carrito vacío</p>
            <p className="text-sm">Escaneá un producto para empezar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carrito.map((item, idx) => (
              <div key={idx} className="card p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.nombre_producto}</p>
                  <p className="text-xs text-gray-500">${item.precio_unitario.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => cambiarCantidad(idx, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(idx, 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Plus size={13} />
                  </button>
                </div>
                <p className="w-20 text-right font-bold text-sm">${item.subtotal.toFixed(2)}</p>
                <button onClick={() => setCarrito(c => c.filter((_, i) => i !== idx))} className="text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total móvil flotante */}
        {carrito.length > 0 && (
          <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 -mx-4 px-4 py-3">
            <button onClick={() => setMostrarResumen(!mostrarResumen)}
              className="w-full bg-blue-600 text-white rounded-xl py-3 flex items-center justify-between px-4 font-bold text-lg">
              <span>TOTAL: ${total.toFixed(2)}</span>
              {mostrarResumen ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
            </button>
          </div>
        )}
      </div>

      {/* Panel derecho: cobro — desktop siempre visible, móvil como drawer */}
      <div className={`
        md:w-80 md:bg-white md:border-l md:border-gray-100 md:flex md:flex-col md:p-5 md:space-y-4
        fixed md:static inset-x-0 bottom-16 bg-white border-t border-gray-200 z-30 p-4 space-y-3
        transition-transform duration-300
        ${mostrarResumen || window.innerWidth >= 768 ? 'translate-y-0' : 'translate-y-full'}
        ${carrito.length === 0 ? 'hidden md:flex' : ''}
      `}>
        <h2 className="font-bold text-lg text-gray-700 hidden md:block">Resumen</h2>

        {/* Total desktop */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white text-center hidden md:block">
          <p className="text-sm font-semibold opacity-80">TOTAL</p>
          <p className="text-4xl font-extrabold">${total.toFixed(2)}</p>
        </div>

        {/* Método de pago */}
        <div>
          <label className="label text-sm">Método de pago</label>
          <div className="grid grid-cols-4 md:grid-cols-2 gap-1 md:gap-2">
            {METODOS.map(m => (
              <button key={m} onClick={() => setMetodo(m)}
                className={`py-2 rounded-lg text-xs md:text-sm font-semibold border transition-colors ${
                  metodo === m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente fiado */}
        {metodo === 'Fiado' && (
          <div>
            <label className="label text-sm">Cliente</label>
            <select className="input text-sm" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccioná cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — ${c.deuda_total.toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Paga con */}
        {metodo === 'Efectivo' && (
          <div>
            <label className="label text-sm">Paga con ($)</label>
            <input type="number" step="0.01" className="input"
              value={pagaCon} onChange={e => setPagaCon(e.target.value)} placeholder="0.00" />
            {pagaCon && (
              parseFloat(pagaCon) >= total
                ? <p className="text-green-600 font-bold text-sm mt-1">✓ Vuelto: ${vuelto.toFixed(2)}</p>
                : <p className="text-red-500 font-bold text-sm mt-1">✗ Falta: ${falta.toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="space-y-2">
          <button onClick={confirmarVenta} disabled={procesando || carrito.length === 0}
            className="btn-success w-full py-3 text-base flex items-center justify-center gap-2">
            <CheckCircle size={20} />
            {procesando ? 'Procesando...' : 'Confirmar venta'}
          </button>
          <button onClick={() => { setCarrito([]); setPagaCon(''); setMostrarResumen(false) }}
            className="btn-secondary w-full text-sm">
            Limpiar carrito
          </button>
        </div>
      </div>
    </div>
  )
}
