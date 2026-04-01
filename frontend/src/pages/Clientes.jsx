import { useState, useEffect } from 'react'
import { clienteService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Plus, X, ChevronDown, ChevronUp, DollarSign, Edit2, Trash2, Search, MessageCircle } from 'lucide-react'

// ── Botón WhatsApp ────────────────────────────────────────────────────────────
function BtnWhatsApp({ cliente }) {
  if (!cliente.telefono?.trim()) return null

  // Normalizar número argentino: sacar espacios, guiones, paréntesis
  // Si empieza con 0 → reemplazar por 54 (código Argentina)
  // Si empieza con 15 → agregar 549 adelante
  const normalizarTelefono = (tel) => {
    let n = tel.replace(/[\s\-().+]/g, '')
    if (n.startsWith('0')) n = '54' + n.slice(1)
    else if (!n.startsWith('54')) n = '549' + n
    return n
  }

  const numero = normalizarTelefono(cliente.telefono)
  const deudaStr = `$${cliente.deuda_total.toFixed(2)}`
  const mensaje = encodeURIComponent(
    `Hola ${cliente.nombre}, te recordamos que tenés un saldo pendiente de ${deudaStr}. ¡Gracias!`
  )
  const url = `https://wa.me/${numero}?text=${mensaje}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Enviar WhatsApp a ${cliente.nombre}`}
      onClick={e => e.stopPropagation()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 30, height: 30, borderRadius: 8,
        background: 'rgba(37,211,102,0.1)',
        border: '1px solid rgba(37,211,102,0.25)',
        color: '#25d366',
        textDecoration: 'none', flexShrink: 0,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(37,211,102,0.2)'}
      onMouseLeave={e => e.currentTarget.style.background='rgba(37,211,102,0.1)'}
    >
      <MessageCircle size={14} />
    </a>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [filtrados, setFiltrados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [movimientos, setMovimientos] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [modalAbono, setModalAbono] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [montoAbono, setMontoAbono] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTel, setNuevoTel] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editTel, setEditTel] = useState('')
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  const cargar = () => clienteService.listar().then(r => {
    setClientes(r.data); setFiltrados(r.data)
  })
  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!busqueda.trim()) { setFiltrados(clientes); return }
    const b = busqueda.toLowerCase()
    setFiltrados(clientes.filter(c =>
      c.nombre.toLowerCase().includes(b) || c.telefono?.toLowerCase().includes(b)
    ))
  }, [busqueda, clientes])

  const crearCliente = async (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (clientes.find(c => c.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase())) {
      toast.error('Ya existe un cliente con ese nombre'); return
    }
    if (nuevoTel.trim() && clientes.find(c => c.telefono === nuevoTel.trim())) {
      toast.error('Ya existe un cliente con ese teléfono'); return
    }
    try {
      await clienteService.crear({ nombre: nuevoNombre.trim(), telefono: nuevoTel.trim() })
      toast.success('Cliente registrado')
      setNuevoNombre(''); setNuevoTel(''); setShowForm(false); cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const editarCliente = async () => {
    if (!editNombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (clientes.find(c => c.nombre.toLowerCase() === editNombre.trim().toLowerCase() && c.id !== modalEditar.id)) {
      toast.error('Ya existe un cliente con ese nombre'); return
    }
    try {
      await clienteService.actualizar(modalEditar.id, { nombre: editNombre.trim(), telefono: editTel.trim() })
      toast.success('Cliente actualizado'); setModalEditar(null); cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const eliminarCliente = async (cliente) => {
    if (cliente.deuda_total > 0) {
      toast.error(`${cliente.nombre} tiene deuda de $${cliente.deuda_total.toFixed(2)}`); return
    }
    if (!confirm(`¿Eliminar a ${cliente.nombre}?`)) return
    try { await clienteService.eliminar(cliente.id); toast.success('Eliminado'); cargar() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const verMovimientos = async (id) => {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    const res = await clienteService.movimientos(id)
    setMovimientos(m => ({ ...m, [id]: res.data }))
  }

  const registrarAbono = async () => {
    const monto = parseFloat(montoAbono)
    if (!montoAbono || monto <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (monto > modalAbono.deuda_total) {
      toast.error(`El monto no puede superar la deuda ($${modalAbono.deuda_total.toFixed(2)})`); return
    }
    try {
      await clienteService.registrarMovimiento(modalAbono.id, { tipo: 'ABONO', monto, detalle: 'Abono en efectivo' })
      toast.success('Abono registrado'); setModalAbono(null); setMontoAbono(''); cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const totalDeuda = clientes.reduce((s, c) => s + c.deuda_total, 0)
  const conDeuda = clientes.filter(c => c.deuda_total > 0).length

  return (
    <div className="page-wrap">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cuentas Corrientes</h1>
          <p className="page-sub">
            {conDeuda > 0
              ? `${conDeuda} cliente${conDeuda > 1 ? 's' : ''} con deuda · Total $${totalDeuda.toFixed(2)}`
              : `${clientes.length} clientes registrados`}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo cliente</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="search-wrap" style={{marginBottom:'1rem'}}>
        <Search size={15} className="search-icon" />
        <input className="input" placeholder="Buscar por nombre o teléfono..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Form nuevo cliente */}
      {showForm && (
        <div className="card" style={{marginBottom:'1rem'}}>
          <form onSubmit={crearCliente} style={{display:'flex',flexDirection:'column',gap:12}}>
            <p style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>Nuevo cliente</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre completo" required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={nuevoTel}
                  onChange={e => setNuevoTel(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="submit" className="btn btn-primary" style={{flex:1,justifyContent:'center'}}>Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="empty-state">
          <p>{busqueda ? 'Sin resultados' : 'No hay clientes registrados'}</p>
          <p>{!busqueda && 'Creá el primero con el botón de arriba'}</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {filtrados.map(c => (
            <div key={c.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,padding:'1rem'}}>

                {/* Avatar */}
                <div className="avatar">{c.nombre[0].toUpperCase()}</div>

                {/* Info */}
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:1}}>{c.nombre}</p>
                  {c.telefono && (
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <p style={{fontSize:12,color:'var(--text-3)'}}>{c.telefono}</p>
                      {/* WhatsApp solo si tiene teléfono y tiene deuda */}
                      {c.deuda_total > 0 && <BtnWhatsApp cliente={c} />}
                    </div>
                  )}
                </div>

                {/* Deuda */}
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontFamily:'DM Serif Display,serif',fontSize:'1.25rem',letterSpacing:'-0.02em',
                    color: c.deuda_total > 0 ? 'var(--red)' : 'var(--green)'}}>
                    ${c.deuda_total.toFixed(2)}
                  </p>
                  <p style={{fontSize:11,color:'var(--text-3)'}}>
                    {c.deuda_total > 0 ? 'debe' : 'al día'}
                  </p>
                </div>

                {/* Acciones */}
                <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                  {c.deuda_total > 0 && (
                    <button onClick={() => setModalAbono(c)} className="btn btn-success"
                      style={{padding:'6px 10px',gap:4,fontSize:12}}>
                      <DollarSign size={13} />
                      <span className="hidden sm:inline">Abonar</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => { setModalEditar(c); setEditNombre(c.nombre); setEditTel(c.telefono || '') }}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:6}}
                        onMouseEnter={e => e.currentTarget.style.color='var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => eliminarCliente(c)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:6}}
                        onMouseEnter={e => e.currentTarget.style.color='var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  <button onClick={() => verMovimientos(c.id)}
                    style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:6}}>
                    {expandido === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Historial */}
              {expandido === c.id && movimientos[c.id] && (
                <div style={{borderTop:'1px solid var(--border)',background:'var(--surface)',padding:'1rem'}}>
                  <p className="label" style={{marginBottom:8}}>Historial de movimientos</p>
                  {movimientos[c.id].length === 0 ? (
                    <p style={{fontSize:13,color:'var(--text-3)'}}>Sin movimientos</p>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {movimientos[c.id].map(m => (
                        <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}>
                          <span className={`badge ${m.tipo === 'FIADO' ? 'badge-red' : 'badge-green'}`}>
                            {m.tipo === 'FIADO' ? '↑ Fiado' : '↓ Abono'}
                          </span>
                          <span style={{flex:1,color:'var(--text-2)',fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.detalle}</span>
                          <span style={{fontWeight:700,flexShrink:0}}>${m.monto.toFixed(2)}</span>
                          <span style={{color:'var(--text-3)',fontSize:11,flexShrink:0}}>
                            {new Date(m.fecha).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal editar */}
      {modalEditar && (
        <div className="modal-backdrop" onClick={() => setModalEditar(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Editar cliente</span>
              <button className="modal-close" onClick={() => setModalEditar(null)}><X size={15} /></button>
            </div>
            <div style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={editNombre} onChange={e => setEditNombre(e.target.value)} required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={editTel} onChange={e => setEditTel(e.target.value)} placeholder="Opcional" />
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => setModalEditar(null)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
                <button onClick={editarCliente} className="btn btn-primary" style={{flex:1,justifyContent:'center'}}>Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal abono */}
      {modalAbono && (
        <div className="modal-backdrop" onClick={() => setModalAbono(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Registrar abono</span>
              <button className="modal-close" onClick={() => setModalAbono(null)}><X size={15} /></button>
            </div>
            <div style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:'var(--surface)',borderRadius:10,padding:'12px 16px',border:'1px solid var(--border)'}}>
                <p style={{fontSize:13,color:'var(--text-2)',marginBottom:2}}>Cliente</p>
                <p style={{fontWeight:700,fontSize:15}}>{modalAbono.nombre}</p>
                <p style={{fontSize:13,color:'var(--red)',fontWeight:600,marginTop:4}}>
                  Deuda: ${modalAbono.deuda_total.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="label">Monto a abonar ($)</label>
                <input type="number" step="0.01" min="0.01" className="input"
                  value={montoAbono}
                  onChange={e => { if (e.target.value === '' || parseFloat(e.target.value) >= 0) setMontoAbono(e.target.value) }}
                  onKeyDown={e => { if (e.key === '-') e.preventDefault() }}
                  placeholder="0.00" autoFocus />
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={() => setModalAbono(null)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>Cancelar</button>
                <button onClick={registrarAbono} className="btn btn-success" style={{flex:1,justifyContent:'center'}}>Confirmar abono</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
