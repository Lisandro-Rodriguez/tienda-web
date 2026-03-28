import { useState, useEffect, useRef } from 'react'
import { productoService, ventaService, clienteService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, ChevronUp, ChevronDown, Camera, FileText } from 'lucide-react'
import EscanerCamara from '../components/ui/EscanerCamara'
import { generarTicketPDF } from '../utils/ticketPDF'

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
  const [negocio, setNegocio] = useState(null)
  const inputRef = useRef(null)

  const ticketAutomatico = localStorage.getItem('ticket_automatico') !== 'false'
  const ticketAbrirAutomatico = localStorage.getItem('ticket_abrir_automatico') === 'true'

  useEffect(() => {
    clienteService.listar().then(r => setClientes(r.data)).catch(() => {})
    negocioService.miNegocio().then(r => setNegocio(r.data)).catch(() => {})
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
      setCodigo(''); inputRef.current?.focus()
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
    if (metodo === 'Fiado' && !clienteId) { toast.error('Seleccioná un cliente'); return }
    if (metodo === 'Efectivo' && pagaCon && parseFloat(pagaCon) < total) {
      toast.error(`Falta: $${falta.toFixed(2)}`); return
    }
    setProcesando(true)
    try {
      const res = await ventaService.registrar({ cliente_id: clienteId ? parseInt(clienteId) : null, metodo_pago: metodo, items: carrito })
      const ventaRegistrada = res.data
      if (ticketAutomatico) {
        generarTicketPDF({ venta: ventaRegistrada, negocio, abrirAutomatico: ticketAbrirAutomatico })
        toast.success('¡Venta registrada! Ticket generado.')
      } else {
        toast.success((t) => (
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span>¡Venta registrada!</span>
            <button onClick={() => { generarTicketPDF({ venta: ventaRegistrada, negocio, abrirAutomatico: ticketAbrirAutomatico }); toast.dismiss(t.id) }}
              style={{display:'flex',alignItems:'center',gap:4,background:'var(--navy)',color:'#fff',border:'none',
                borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',fontWeight:600}}>
              <FileText size={12} /> Ticket
            </button>
          </div>
        ), { duration: 5000 })
      }
      setCarrito([]); setCodigo(''); setPagaCon(''); setClienteId(''); setMetodo('Efectivo')
      setMostrarResumen(false); inputRef.current?.focus()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al registrar venta') }
    finally { setProcesando(false) }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}} className="md:flex-row">

      {/* Panel izquierdo */}
      <div style={{flex:1,display:'flex',flexDirection:'column',padding:'1.5rem',gap:'1rem',overflowY:'auto',minHeight:0}}>
        <h1 className="page-title">Caja y Ventas</h1>

        {/* Buscador */}
        <form onSubmit={agregarProducto} style={{display:'flex',gap:8,position:'relative'}}>
          <div style={{flex:1,position:'relative'}}>
            <input ref={inputRef} value={codigo}
              onChange={async e => {
                const val = e.target.value; setCodigo(val)
                if (val.length >= 2 && isNaN(val)) {
                  try {
                    const res = await productoService.listar({ busqueda: val })
                    setSugerencias(res.data.slice(0, 6)); setMostrarSugerencias(res.data.length > 0)
                  } catch { setSugerencias([]); setMostrarSugerencias(false) }
                } else { setSugerencias([]); setMostrarSugerencias(false) }
              }}
              onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
              className="input" style={{width:'100%',fontSize:15}}
              placeholder="Código de barras o nombre del producto..."
              autoComplete="off" />

            {/* Sugerencias */}
            {mostrarSugerencias && sugerencias.length > 0 && (
              <div style={{position:'absolute',zIndex:9999,width:'100%',background:'#fff',
                border:'1px solid var(--border)',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.1)',
                top:'100%',marginTop:4,maxHeight:260,overflowY:'auto'}}>
                {sugerencias.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={() => {
                      if (p.stock <= 0) { toast.error('Sin stock'); return }
                      setCarrito(c => {
                        const idx = c.findIndex(i => i.producto_id === p.id)
                        if (idx >= 0) { const n = [...c]; n[idx] = {...n[idx], cantidad: n[idx].cantidad+1, subtotal:(n[idx].cantidad+1)*n[idx].precio_unitario}; return n }
                        return [...c, { producto_id: p.id, nombre_producto: p.nombre, cantidad: 1, precio_unitario: p.precio_venta, precio_costo: p.precio_costo, subtotal: p.precio_venta }]
                      })
                      setCodigo(''); setSugerencias([]); setMostrarSugerencias(false); inputRef.current?.focus()
                    }}
                    style={{display:'flex',width:'100%',alignItems:'center',justifyContent:'space-between',
                      padding:'11px 16px',background:'none',border:'none',cursor:'pointer',
                      borderBottom:'1px solid #f3f4f6',fontFamily:'DM Sans,sans-serif'}}
                    onMouseEnter={e => e.currentTarget.style.background='#f8faff'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <div style={{textAlign:'left'}}>
                      <p style={{fontWeight:600,fontSize:14,color:'var(--text)',marginBottom:1}}>{p.nombre}</p>
                      <p style={{fontSize:12,color:'var(--text-3)'}}>{p.marca} · Stock: {p.stock}</p>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                      <p style={{fontWeight:700,color:'var(--green)',fontSize:14}}>${p.precio_venta.toFixed(2)}</p>
                      {p.stock <= 5 && <p style={{fontSize:11,color:'var(--red)'}}>⚠ Poco stock</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={() => setMostrarEscaner(true)}
            className="btn btn-ghost md:hidden" style={{padding:'0 12px',flexShrink:0}}>
            <Camera size={18} />
          </button>
          <button type="submit" className="btn btn-primary" style={{flexShrink:0,padding:'0 18px',fontSize:20,fontWeight:300}}>
            +
          </button>
        </form>

        {mostrarEscaner && (
          <EscanerCamara
            onEscaneo={(c) => { setCodigo(c); setTimeout(() => document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })), 100) }}
            onCerrar={() => setMostrarEscaner(false)}
          />
        )}

        {/* Carrito */}
        {carrito.length === 0 ? (
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
            color:'var(--text-3)',padding:'3rem 0'}}>
            <ShoppingCart size={48} style={{marginBottom:12,opacity:0.3}} />
            <p style={{fontWeight:600,fontSize:15,marginBottom:4}}>Carrito vacío</p>
            <p style={{fontSize:13}}>Escaneá o buscá un producto</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {carrito.map((item, idx) => (
              <div key={idx} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,
                padding:'12px 14px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,fontSize:14,marginBottom:1}}>{item.nombre_producto}</p>
                  <p style={{fontSize:12,color:'var(--text-3)'}}>${item.precio_unitario.toFixed(2)} c/u</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <button onClick={() => cambiarCantidad(idx, -1)}
                    style={{width:28,height:28,borderRadius:'50%',background:'var(--surface)',
                      border:'1px solid var(--border)',cursor:'pointer',display:'flex',
                      alignItems:'center',justifyContent:'center',color:'var(--text-2)'}}>
                    <Minus size={12} />
                  </button>
                  <span style={{fontWeight:700,fontSize:14,minWidth:20,textAlign:'center'}}>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(idx, 1)}
                    style={{width:28,height:28,borderRadius:'50%',background:'var(--surface)',
                      border:'1px solid var(--border)',cursor:'pointer',display:'flex',
                      alignItems:'center',justifyContent:'center',color:'var(--text-2)'}}>
                    <Plus size={12} />
                  </button>
                </div>
                <p style={{fontWeight:700,fontSize:14,minWidth:70,textAlign:'right'}}>${item.subtotal.toFixed(2)}</p>
                <button onClick={() => setCarrito(c => c.filter((_, i) => i !== idx))}
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4}}
                  onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total móvil */}
        {carrito.length > 0 && (
          <div className="md:hidden" style={{position:'sticky',bottom:0,background:'#fff',
            borderTop:'1px solid var(--border)',margin:'0 -1.5rem',padding:'0.875rem 1.5rem'}}>
            <button onClick={() => setMostrarResumen(!mostrarResumen)}
              style={{width:'100%',background:'var(--navy)',color:'#fff',border:'none',borderRadius:12,
                padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',
                fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:16,cursor:'pointer'}}>
              <span>TOTAL: ${total.toFixed(2)}</span>
              {mostrarResumen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
        )}
      </div>

      {/* Panel derecho: cobro */}
      <div className={[
        'md:w-72 md:bg-white md:border-l md:border-gray-100 md:flex md:flex-col md:p-5 md:space-y-4 md:overflow-y-auto',
        'fixed md:static inset-x-0 bottom-16 bg-white border-t z-30 p-4 space-y-3 transition-transform duration-300',
        mostrarResumen || (typeof window !== 'undefined' && window.innerWidth >= 768) ? 'translate-y-0' : 'translate-y-full',
        carrito.length === 0 ? 'hidden md:flex' : ''
      ].join(' ')} style={{}}>

        {/* Total desktop */}
        <div className="hidden md:block" style={{background:'var(--navy)',borderRadius:14,padding:'1.25rem',textAlign:'center',color:'#fff'}}>
          <p style={{fontSize:11,fontWeight:600,opacity:0.6,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Total</p>
          <p style={{fontFamily:'DM Serif Display,serif',fontSize:'2.25rem',letterSpacing:'-0.03em',lineHeight:1}}>
            ${total.toFixed(2)}
          </p>
        </div>

        {/* Método */}
        <div>
          <label className="label">Método de pago</label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
            {METODOS.map(m => (
              <button key={m} onClick={() => setMetodo(m)}
                style={{
                  padding:'8px 4px',borderRadius:8,fontSize:13,fontWeight:600,
                  cursor:'pointer',transition:'all 0.15s',fontFamily:'DM Sans,sans-serif',
                  background: metodo === m ? 'var(--navy)' : '#fff',
                  color: metodo === m ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${metodo === m ? 'var(--navy)' : 'var(--border)'}`,
                }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Fiado */}
        {metodo === 'Fiado' && (
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccioná cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} — ${c.deuda_total.toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}

        {/* Efectivo */}
        {metodo === 'Efectivo' && (
          <div>
            <label className="label">Paga con ($)</label>
            <input type="number" step="0.01" className="input" min="0"
              value={pagaCon}
              onChange={e => { if (e.target.value === '' || parseFloat(e.target.value) >= 0) setPagaCon(e.target.value) }}
              onKeyDown={e => { if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault() }}
              placeholder="0.00" />
            {pagaCon && (
              parseFloat(pagaCon) >= total
                ? <p style={{fontSize:13,fontWeight:700,color:'var(--green)',marginTop:6}}>✓ Vuelto: ${vuelto.toFixed(2)}</p>
                : <p style={{fontSize:13,fontWeight:700,color:'var(--red)',marginTop:6}}>✗ Falta: ${falta.toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button onClick={confirmarVenta} disabled={procesando || carrito.length === 0}
            className="btn btn-success" style={{justifyContent:'center',padding:'14px',fontSize:15,gap:8}}>
            <CheckCircle size={18} />
            {procesando ? 'Procesando...' : 'Confirmar venta'}
          </button>
          <button onClick={() => { setCarrito([]); setPagaCon(''); setMostrarResumen(false) }}
            className="btn btn-ghost" style={{justifyContent:'center',fontSize:13}}>
            Limpiar carrito
          </button>
        </div>
      </div>
    </div>
  )
}
