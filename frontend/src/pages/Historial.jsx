import { useState, useEffect } from 'react'
import { ventaService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { FileText, X, User, Package, Trash2, AlertTriangle } from 'lucide-react'
import { generarTicketPDF } from '../utils/ticketPDF'
import { useAuthStore } from '../store/authStore'

export default function Historial() {
  const [ventas, setVentas] = useState([])
  const [anuladas, setAnuladas] = useState([])
  const [tab, setTab] = useState('ventas') // 'ventas' | 'anuladas'
  const [periodo, setPeriodo] = useState('hoy')
  const [loading, setLoading] = useState(true)
  const [loadingAnuladas, setLoadingAnuladas] = useState(false)
  const [negocio, setNegocio] = useState(null)
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const ticketAbrirAutomatico = localStorage.getItem('ticket_abrir_automatico') === 'true'
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  useEffect(() => {
    negocioService.miNegocio().then(r => setNegocio(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 'ventas') cargarVentas()
    if (tab === 'anuladas' && isAdmin) cargarAnuladas()
  }, [periodo, tab])

  const cargarVentas = () => {
    setLoading(true)
    ventaService.listar(periodo)
      .then(r => setVentas(r.data))
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false))
  }

  const cargarAnuladas = () => {
    setLoadingAnuladas(true)
    ventaService.listarAnuladas()
      .then(r => setAnuladas(r.data))
      .catch(() => toast.error('Error al cargar anuladas'))
      .finally(() => setLoadingAnuladas(false))
  }

  const totalPeriodo = ventas.reduce((s, v) => s + v.total, 0)
  const gananciaTotal = ventas.reduce((s, v) => s + (v.total - v.costo_total), 0)

  const periodos = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: '7 días' },
    { key: 'mes', label: '30 días' },
    { key: 'todo', label: 'Todo' },
  ]

  const abrirDetalle = async (venta) => {
    setVentaDetalle(venta)
    setLoadingDetalle(true)
    try {
      const res = await ventaService.obtener(venta.id)
      setVentaDetalle(res.data)
    } catch { toast.error('Error al cargar el detalle') }
    finally { setLoadingDetalle(false) }
  }

  const descargarTicket = (venta, e) => {
    e?.stopPropagation()
    generarTicketPDF({ venta, negocio, abrirAutomatico: ticketAbrirAutomatico })
  }

  const handleAnularVenta = async (id) => {
    if (!window.confirm('¿Estás seguro de anular esta venta? Se devolverá el stock.')) return
    try {
      await ventaService.anular(id)
      toast.success('Venta anulada correctamente')
      setVentaDetalle(null)
      cargarVentas()
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al anular la venta')
    }
  }

  const metodoBadge = (metodo) => {
    if (metodo === 'Fiado') return 'badge badge-orange'
    if (metodo === 'Efectivo') return 'badge badge-green'
    return 'badge badge-blue'
  }

  const fmtFecha = (f) => new Date(f).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  const fmtFechaLarga = (f) => new Date(f).toLocaleString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="page-wrap">

      {/* Header */}
      <div style={{marginBottom:'1.25rem'}}>
        <h1 className="page-title">Historial de Ventas</h1>
        {tab === 'ventas' && (
          <div style={{display:'flex',gap:'1.25rem',marginTop:'0.4rem'}}>
            <p className="page-sub">Total: <strong style={{color:'var(--text)'}}>${totalPeriodo.toFixed(2)}</strong></p>
            <p className="page-sub" style={{color:'var(--green)'}}>Ganancia: <strong>${gananciaTotal.toFixed(2)}</strong></p>
          </div>
        )}
      </div>

      {/* Tabs ventas / anuladas */}
      {isAdmin && (
        <div style={{display:'flex',gap:6,marginBottom:'1rem',borderBottom:'1px solid var(--border)',paddingBottom:0}}>
          {[
            { key: 'ventas', label: 'Ventas' },
            { key: 'anuladas', label: 'Anuladas' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding:'0.5rem 1rem', fontSize:13, fontWeight:600,
                background:'none', border:'none', cursor:'pointer',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-3)',
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom:-1,
              }}>
              {t.label}
              {t.key === 'anuladas' && anuladas.length > 0 && (
                <span style={{
                  marginLeft:6, background:'rgba(239,68,68,0.12)', color:'#ef4444',
                  borderRadius:10, padding:'1px 7px', fontSize:11,
                }}>
                  {anuladas.length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── TAB VENTAS ── */}
      {tab === 'ventas' && (
        <>
          {/* Filtros período */}
          <div style={{display:'flex',gap:6,marginBottom:'1.25rem'}}>
            {periodos.map(p => (
              <button key={p.key} onClick={() => setPeriodo(p.key)} className="btn"
                style={{
                  flex:1, justifyContent:'center',
                  background: periodo === p.key ? 'var(--navy)' : '#fff',
                  color: periodo === p.key ? '#fff' : 'var(--text-2)',
                  border: `1px solid ${periodo === p.key ? 'var(--navy)' : 'var(--border)'}`,
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Tabla desktop */}
          <div className="hidden md:block" style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Cajero</th><th>Items</th>
                  <th>Método</th><th>Total</th><th>Ganancia</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'3rem'}}><span className="loader" /></td></tr>
                ) : ventas.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>Sin ventas en este período</td></tr>
                ) : ventas.map(v => (
                  <tr key={v.id} className="clickable" onClick={() => abrirDetalle(v)}>
                    <td style={{color:'var(--text-3)',fontSize:12}}>#{v.id}</td>
                    <td style={{color:'var(--text-2)',fontSize:12}}>{fmtFecha(v.fecha)}</td>
                    <td style={{fontSize:13,fontWeight:500}}>{v.cajero_username || '—'}</td>
                    <td style={{fontSize:12,color:'var(--text-2)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ')}
                    </td>
                    <td><span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span></td>
                    <td style={{fontWeight:700}}>${v.total.toFixed(2)}</td>
                    <td style={{color:'var(--green)',fontWeight:600}}>${(v.total - v.costo_total).toFixed(2)}</td>
                    <td>
                      <button onClick={(e) => descargarTicket(v, e)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4}}
                        onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}>
                        <FileText size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="md:hidden" style={{flexDirection:'column',gap:8}}>
            {loading ? (
              <div className="empty-state"><span className="loader" /></div>
            ) : ventas.length === 0 ? (
              <div className="empty-state"><p>Sin ventas en este período</p></div>
            ) : ventas.map(v => (
              <div key={v.id} className="card" style={{padding:'1rem',cursor:'pointer',marginBottom:8}} onClick={() => abrirDetalle(v)}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:11,color:'var(--text-3)',marginBottom:2}}>#{v.id} · {fmtFecha(v.fecha)}</p>
                    {v.cajero_username && <p style={{fontSize:12,color:'var(--accent)',fontWeight:600,marginBottom:2}}>{v.cajero_username}</p>}
                    <p style={{fontSize:13,color:'var(--text-2)'}}>{v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ').substring(0, 50)}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontWeight:700,fontSize:15}}>${v.total.toFixed(2)}</p>
                      <p style={{fontSize:11,color:'var(--green)'}}>+${(v.total - v.costo_total).toFixed(2)}</p>
                    </div>
                    <button onClick={(e) => descargarTicket(v, e)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:6}}>
                      <FileText size={17} />
                    </button>
                  </div>
                </div>
                <div style={{marginTop:8}}><span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB ANULADAS ── */}
      {tab === 'anuladas' && isAdmin && (
        <>
          {loadingAnuladas ? (
            <div className="empty-state"><span className="loader" /></div>
          ) : anuladas.length === 0 ? (
            <div className="empty-state" style={{padding:'3rem',textAlign:'center',color:'var(--text-3)'}}>
              <AlertTriangle size={32} style={{margin:'0 auto 0.75rem',opacity:0.3}} />
              <p>No hay ventas anuladas</p>
            </div>
          ) : (
            <>
              {/* Tabla desktop */}
              <div className="hidden md:block" style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>#</th><th>Fecha venta</th><th>Cajero</th><th>Total</th>
                      <th>Método</th><th>Anulada por</th><th>Fecha anulación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anuladas.map(v => (
                      <tr key={v.id} className="clickable" onClick={() => abrirDetalle(v)}>
                        <td style={{color:'var(--text-3)',fontSize:12}}>#{v.id}</td>
                        <td style={{color:'var(--text-2)',fontSize:12}}>{fmtFecha(v.fecha)}</td>
                        <td style={{fontSize:13,fontWeight:500}}>{v.cajero_username || '—'}</td>
                        <td style={{fontWeight:700,textDecoration:'line-through',color:'var(--text-3)'}}>${v.total.toFixed(2)}</td>
                        <td><span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span></td>
                        <td style={{fontSize:13,color:'#ef4444',fontWeight:600}}>{v.anulada_por || '—'}</td>
                        <td style={{color:'var(--text-2)',fontSize:12}}>{v.anulada_en ? fmtFecha(v.anulada_en) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards móvil */}
              <div className="md:hidden" style={{flexDirection:'column',gap:8}}>
                {anuladas.map(v => (
                  <div key={v.id} className="card" style={{padding:'1rem',marginBottom:8,cursor:'pointer',borderLeft:'3px solid rgba(239,68,68,0.3)'}}
                    onClick={() => abrirDetalle(v)}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:11,color:'var(--text-3)',marginBottom:2}}>#{v.id} · {fmtFecha(v.fecha)}</p>
                        {v.cajero_username && <p style={{fontSize:12,color:'var(--accent)',fontWeight:600,marginBottom:2}}>{v.cajero_username}</p>}
                        <p style={{fontSize:13,color:'var(--text-2)'}}>{v.items?.map(i => `${i.cantidad}x ${i.nombre_producto}`).join(', ').substring(0, 50)}</p>
                        <p style={{fontSize:11,color:'#ef4444',marginTop:4}}>
                          Anulada por <strong>{v.anulada_por}</strong> · {v.anulada_en ? fmtFecha(v.anulada_en) : ''}
                        </p>
                      </div>
                      <p style={{fontWeight:700,fontSize:15,textDecoration:'line-through',color:'var(--text-3)',flexShrink:0}}>${v.total.toFixed(2)}</p>
                    </div>
                    <div style={{marginTop:8}}><span className={metodoBadge(v.metodo_pago)}>{v.metodo_pago}</span></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── MODAL DETALLE ── */}
      {ventaDetalle && (
        <div className="modal-backdrop" onClick={() => setVentaDetalle(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <p className="modal-title">Venta #{ventaDetalle.id}</p>
                  {ventaDetalle.anulada && (
                    <span style={{fontSize:11,fontWeight:700,background:'rgba(239,68,68,0.1)',color:'#ef4444',padding:'2px 8px',borderRadius:20}}>
                      ANULADA
                    </span>
                  )}
                </div>
                <p style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{fmtFechaLarga(ventaDetalle.fecha)}</p>
              </div>
              <button className="modal-close" onClick={() => setVentaDetalle(null)}><X size={15} /></button>
            </div>

            {/* Meta */}
            <div style={{padding:'0.75rem 1.5rem',background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',flexWrap:'wrap',gap:12}}>
              {ventaDetalle.cajero_username && (
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-2)'}}>
                  <User size={12} style={{color:'var(--accent)'}} />
                  <span style={{fontWeight:600}}>{ventaDetalle.cajero_username}</span>
                </div>
              )}
              {ventaDetalle.cliente_nombre && (
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-2)'}}>
                  <Package size={12} style={{color:'var(--orange)'}} />
                  <span style={{fontWeight:600}}>{ventaDetalle.cliente_nombre}</span>
                </div>
              )}
              <span className={metodoBadge(ventaDetalle.metodo_pago)}>{ventaDetalle.metodo_pago}</span>
            </div>

            {/* Info de anulación si aplica */}
            {ventaDetalle.anulada && (
              <div style={{padding:'0.75rem 1.5rem',background:'rgba(239,68,68,0.05)',borderBottom:'1px solid rgba(239,68,68,0.1)',display:'flex',alignItems:'center',gap:8}}>
                <AlertTriangle size={14} style={{color:'#ef4444',flexShrink:0}} />
                <p style={{fontSize:12,color:'#ef4444'}}>
                  Anulada por <strong>{ventaDetalle.anulada_por}</strong>
                  {ventaDetalle.anulada_en && ` el ${fmtFechaLarga(ventaDetalle.anulada_en)}`}
                </p>
              </div>
            )}

            {/* Items */}
            <div style={{padding:'1rem 1.5rem',maxHeight:240,overflowY:'auto'}}>
              {loadingDetalle ? (
                <div style={{textAlign:'center',padding:'1.5rem'}}><span className="loader" /></div>
              ) : (
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style={{textAlign:'center'}}>Cant.</th>
                      <th style={{textAlign:'right'}}>Precio</th>
                      <th style={{textAlign:'right'}}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventaDetalle.items?.map((item, i) => (
                      <tr key={i}>
                        <td style={{fontWeight:600}}>{item.nombre_producto}</td>
                        <td style={{textAlign:'center',color:'var(--text-2)'}}>{item.cantidad}</td>
                        <td style={{textAlign:'right',color:'var(--text-2)'}}>${item.precio_unitario.toFixed(2)}</td>
                        <td style={{textAlign:'right',fontWeight:600}}>${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={{padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:11,color:'var(--text-3)'}}>Total</p>
                <p style={{fontSize:'1.75rem',letterSpacing:'-0.03em',color: ventaDetalle.anulada ? 'var(--text-3)' : 'var(--text)',fontWeight:700,textDecoration: ventaDetalle.anulada ? 'line-through' : 'none'}}>
                  ${ventaDetalle.total.toFixed(2)}
                </p>
                {!ventaDetalle.anulada && (
                  <p style={{fontSize:12,color:'var(--green)',fontWeight:600}}>
                    Ganancia: ${(ventaDetalle.total - ventaDetalle.costo_total).toFixed(2)}
                  </p>
                )}
              </div>
              <div style={{display:'flex',gap:8}}>
                {isAdmin && !ventaDetalle.anulada && (
                  <button onClick={() => handleAnularVenta(ventaDetalle.id)}
                    style={{background:'rgba(239,68,68,0.08)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.2)',padding:'0.6rem 1rem',borderRadius:8,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13}}>
                    <Trash2 size={15} /> Anular
                  </button>
                )}
                {!ventaDetalle.anulada && (
                  <button onClick={() => descargarTicket(ventaDetalle)} className="btn btn-accent" style={{gap:8}}>
                    <FileText size={15} /> Ticket PDF
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
