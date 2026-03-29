import React, { useState, useEffect, useRef } from 'react'
import { productoService, stockService } from '../services/api'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Camera, SlidersHorizontal } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import EscanerCamara from '../components/ui/EscanerCamara'

// ── Autocomplete ──────────────────────────────────────────────────────────────
function AutocompleteInput({ value, onChange, opciones, placeholder }) {
  const [abierto, setAbierto] = useState(false)
  const [filtradas, setFiltradas] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleChange = (val) => {
    onChange(val)
    const f = opciones.filter(o => o.toLowerCase().includes(val.toLowerCase()))
    setFiltradas(f); setAbierto(f.length > 0 && val.length > 0)
  }

  return (
    <div className="relative" ref={ref}>
      <input className="input" value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { setFiltradas(value ? opciones.filter(o => o.toLowerCase().includes(value.toLowerCase())) : opciones); setAbierto(opciones.length > 0) }}
        placeholder={placeholder} autoComplete="off" />
      {abierto && filtradas.length > 0 && (
        <div style={{position:'absolute',zIndex:9999,width:'100%',background:'#fff',
          border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.1)',
          marginTop:4,maxHeight:200,overflowY:'auto'}}>
          {filtradas.map((op, i) => (
            <button key={i} type="button"
              onMouseDown={() => { onChange(op); setAbierto(false) }}
              onTouchEnd={(e) => { e.preventDefault(); onChange(op); setAbierto(false) }}
              style={{display:'block',width:'100%',textAlign:'left',padding:'9px 14px',
                fontSize:14,background:'none',border:'none',cursor:'pointer',
                borderBottom: i < filtradas.length - 1 ? '1px solid #f3f4f6' : 'none',
                fontFamily:'DM Sans,sans-serif',color:'var(--text)'}}
              onMouseEnter={e => e.target.style.background='#f8faff'}
              onMouseLeave={e => e.target.style.background='none'}>
              {op}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal producto ────────────────────────────────────────────────────────────
function ModalProducto({ producto, onClose, onSave, tiposExistentes, marcasExistentes }) {
  const [form, setForm] = useState(producto || {
    codigo_barras: '', nombre: '', tipo: '', marca: '',
    precio_costo: '', margen_ganancia: 30, stock: 0, stock_minimo: ''
  })
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [mostrarEscaner, setMostrarEscaner] = useState(false)

  const precioVenta = form.precio_costo
    ? (parseFloat(form.precio_costo) * (1 + parseFloat(form.margen_ganancia || 0) / 100)).toFixed(2)
    : '0.00'

  const buscarCodigo = async () => {
    if (!form.codigo_barras || producto) return
    setBuscando(true)
    try {
      const res = await productoService.buscarEnCatalogo(form.codigo_barras)
      setForm(f => ({ ...f, nombre: res.data.nombre, marca: res.data.marca, tipo: res.data.tipo }))
      toast.success('Completado desde catálogo SEPA')
    } catch { toast('No encontrado, completá manualmente', { icon: 'ℹ️' }) }
    finally { setBuscando(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    const costo = parseFloat(form.precio_costo)
    if (!costo || costo <= 0) { toast.error('El costo debe ser mayor a 0'); return }
    if (parseFloat(form.margen_ganancia) < 0) { toast.error('El margen no puede ser negativo'); return }
    if (parseInt(form.stock) < 0) { toast.error('El stock no puede ser negativo'); return }
    if (form.stock_minimo !== '' && parseInt(form.stock_minimo) < 0) { toast.error('El stock mínimo no puede ser negativo'); return }

    setLoading(true)
    try {
      if (producto) {
        await productoService.actualizar(producto.id, form)
        toast.success('Producto actualizado')
      } else {
        const productosActuales = await productoService.listar({})
        const nombreLimpio = form.nombre.trim().toLowerCase()
        if (productosActuales.data.find(p => p.nombre.trim().toLowerCase() === nombreLimpio)) {
          toast.error(`Ya existe un producto con el nombre "${form.nombre.trim()}"`)
          setLoading(false); return
        }
        await productoService.crear(form)
        toast.success('Producto registrado')
      }
      onSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{producto ? 'Editar producto' : 'Nuevo producto'}</span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>

          {/* Código */}
          <div>
            <label className="label">Código de barras</label>
            <div style={{display:'flex',gap:8}}>
              <input className="input" value={form.codigo_barras}
                onChange={e => setForm(f => ({...f, codigo_barras: e.target.value}))}
                placeholder="Escanear o escribir" disabled={!!producto} required />
              {!producto && <>
                <button type="button" onClick={() => setMostrarEscaner(true)}
                  className="btn btn-ghost" style={{padding:'0 12px',flexShrink:0}}>
                  <Camera size={16} />
                </button>
                <button type="button" onClick={buscarCodigo} disabled={buscando}
                  className="btn btn-ghost" style={{flexShrink:0}}>
                  {buscando ? 'Buscando...' : 'SEPA'}
                </button>
              </>}
            </div>
          </div>

          {mostrarEscaner && (
            <EscanerCamara
              onEscaneo={async (codigo) => {
                setForm(f => ({ ...f, codigo_barras: codigo }))
                setMostrarEscaner(false)
                setBuscando(true)
                try {
                  const res = await productoService.buscarEnCatalogo(codigo)
                  setForm(f => ({ ...f, codigo_barras: codigo, nombre: res.data.nombre, marca: res.data.marca, tipo: res.data.tipo }))
                  toast.success('Completado desde catálogo SEPA')
                } catch { toast('No encontrado', { icon: 'ℹ️' }) }
                finally { setBuscando(false) }
              }}
              onCerrar={() => setMostrarEscaner(false)}
            />
          )}

          {/* Nombre */}
          <div>
            <label className="label">Nombre del producto</label>
            <input className="input" value={form.nombre}
              onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              placeholder="Ej: Coca Cola 500ml" required />
          </div>

          {/* Tipo y Marca */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label className="label">Categoría</label>
              <AutocompleteInput value={form.tipo}
                onChange={val => setForm(f => ({...f, tipo: val}))}
                opciones={tiposExistentes} placeholder="Ej: Bebida" />
            </div>
            <div>
              <label className="label">Marca</label>
              <AutocompleteInput value={form.marca}
                onChange={val => setForm(f => ({...f, marca: val}))}
                opciones={marcasExistentes} placeholder="Ej: Coca-Cola" />
            </div>
          </div>

          {/* Costo / Margen / Stock */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <div>
              <label className="label">Costo ($)</label>
              <input className="input" type="number" step="0.01" min="0.01"
                value={form.precio_costo}
                onChange={e => setForm(f => ({...f, precio_costo: e.target.value}))}
                placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Margen (%)</label>
              <input className="input" type="number" min="0"
                value={form.margen_ganancia}
                onChange={e => setForm(f => ({...f, margen_ganancia: e.target.value}))} />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" min="0"
                value={form.stock}
                onChange={e => setForm(f => ({...f, stock: e.target.value}))} />
            </div>
          </div>

          {/* Precio calculado */}
          <div style={{background:'#f0f7ff',borderRadius:10,padding:'10px 14px',
            display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,color:'var(--text-2)'}}>Precio de venta</span>
            <span style={{fontFamily:'DM Serif Display,serif',fontSize:'1.25rem',color:'var(--accent)',letterSpacing:'-0.02em'}}>
              ${precioVenta}
            </span>
          </div>

          {/* Stock mínimo */}
          <div>
            <label className="label">Stock mínimo de alerta</label>
            <input className="input" type="number" min="0"
              value={form.stock_minimo}
              onChange={e => setForm(f => ({...f, stock_minimo: e.target.value}))}
              placeholder="Vacío = usar configuración global" />
          </div>

          {/* Botones */}
          <div style={{display:'flex',gap:10,paddingTop:4}}>
            <button type="button" onClick={onClose} className="btn btn-ghost" style={{flex:1}}>Cancelar</button>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{flex:1}}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Panel de umbrales ─────────────────────────────────────────────────────────
function PanelUmbrales({ tiposExistentes, marcasExistentes, onClose }) {
  const [umbrales, setUmbrales] = useState([])
  const [nuevo, setNuevo] = useState({ tipo: 'global', referencia: '', umbral: 5 })

  useEffect(() => {
    stockService.listarUmbrales().then(r => setUmbrales(r.data)).catch(() => {})
  }, [])

  const guardar = async () => {
    if (!nuevo.umbral) { toast.error('Ingresá un valor'); return }
    try {
      await stockService.guardarUmbral(nuevo)
      toast.success('Umbral guardado')
      const res = await stockService.listarUmbrales()
      setUmbrales(res.data)
      setNuevo({ tipo: 'global', referencia: '', umbral: 5 })
    } catch { toast.error('Error al guardar') }
  }

  const eliminar = async (id) => {
    try {
      await stockService.eliminarUmbral(id)
      setUmbrales(u => u.filter(x => x.id !== id))
    } catch {}
  }

  const tipoBadge = (tipo) => {
    if (tipo === 'global') return 'badge badge-navy'
    if (tipo === 'tipo') return 'badge badge-blue'
    if (tipo === 'marca') return 'badge badge-orange'
    return 'badge badge-gray'
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Configuración de stock bajo</span>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>

          {umbrales.length > 0 && (
            <div>
              <p className="label" style={{marginBottom:8}}>Umbrales activos</p>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {umbrales.map(u => (
                  <div key={u.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                    background:'var(--surface)',borderRadius:10,padding:'10px 14px',border:'1px solid var(--border)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span className={tipoBadge(u.tipo)}>{u.tipo}</span>
                      <span style={{fontSize:13,color:'var(--text-2)'}}>{u.referencia || 'Todos los productos'}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontWeight:700,color:'var(--red)',fontSize:14}}>≤ {u.umbral}</span>
                      <button onClick={() => eliminar(u.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4}}
                        onMouseEnter={e => e.target.style.color='var(--red)'}
                        onMouseLeave={e => e.target.style.color='var(--text-3)'}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{borderTop:'1px solid var(--border)',paddingTop:'1rem'}}>
            <p className="label" style={{marginBottom:12}}>Agregar umbral</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label className="label">Aplicar a</label>
                <select className="input" value={nuevo.tipo}
                  onChange={e => setNuevo(u => ({...u, tipo: e.target.value, referencia: ''}))}>
                  <option value="global">Todos los productos</option>
                  <option value="tipo">Por categoría</option>
                  <option value="marca">Por marca</option>
                </select>
              </div>
              <div>
                <label className="label">Cantidad mínima</label>
                <input type="number" className="input" min="0" value={nuevo.umbral}
                  onChange={e => setNuevo(u => ({...u, umbral: parseInt(e.target.value) || 0}))} />
              </div>
            </div>

            {nuevo.tipo === 'tipo' && (
              <div style={{marginBottom:10}}>
                <label className="label">Categoría</label>
                <AutocompleteInput value={nuevo.referencia}
                  onChange={val => setNuevo(u => ({...u, referencia: val}))}
                  opciones={tiposExistentes} placeholder="Ej: Bebida" />
              </div>
            )}
            {nuevo.tipo === 'marca' && (
              <div style={{marginBottom:10}}>
                <label className="label">Marca</label>
                <AutocompleteInput value={nuevo.referencia}
                  onChange={val => setNuevo(u => ({...u, referencia: val}))}
                  opciones={marcasExistentes} placeholder="Ej: Coca-Cola" />
              </div>
            )}

            <div style={{background:'#f0f7ff',borderRadius:10,padding:'8px 12px',fontSize:12,
              color:'var(--accent)',marginBottom:12}}>
              Prioridad: Producto individual → Categoría → Marca → Global
            </div>

            <button onClick={guardar} className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>
              Guardar umbral
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [bajoStock, setBajoStock] = useState(false)
  const [modal, setModal] = useState(null)
  const [panelStock, setPanelStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tiposExistentes, setTiposExistentes] = useState([])
  const [marcasExistentes, setMarcasExistentes] = useState([])
  const [umbrales, setUmbrales] = useState([])
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [searchParams] = useSearchParams()
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  const cargarUmbrales = async () => {
    try { const r = await stockService.listarUmbrales(); setUmbrales(r.data) } catch {}
  }

  const getUmbral = (producto, lista = umbrales) => {
    const pp = lista.find(u => u.tipo === 'producto' && u.referencia === producto.codigo_barras)
    if (pp) return pp.umbral
    const pt = lista.find(u => u.tipo === 'tipo' && u.referencia === producto.tipo)
    if (pt) return pt.umbral
    const pm = lista.find(u => u.tipo === 'marca' && u.referencia === producto.marca)
    if (pm) return pm.umbral
    const pg = lista.find(u => u.tipo === 'global')
    if (pg) return pg.umbral
    return 5
  }

  const esBajoStock = (p) => p.stock <= getUmbral(p)

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await productoService.listar({ busqueda: busqueda || undefined, bajo_stock: bajoStock || undefined })
      setProductos(res.data)
      const tipos = [...new Set(res.data.map(p => p.tipo).filter(t => t && t !== '-'))].sort()
      const marcas = [...new Set(res.data.map(p => p.marca).filter(m => m && m !== '-'))].sort()
      setTiposExistentes(tipos)
      setMarcasExistentes(marcas)
    } catch { toast.error('Error al cargar') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (searchParams.get('bajo_stock')) setBajoStock(true)
    cargarUmbrales()
    cargar()
  }, [])

  useEffect(() => { cargar() }, [busqueda, bajoStock])
  useEffect(() => { if (umbrales.length > 0) cargar() }, [umbrales.length])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try { await productoService.eliminar(id); toast.success('Eliminado'); cargar() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div className="page-wrap">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-sub">{productos.length} productos registrados</p>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          {isAdmin && (
            <button onClick={() => setPanelStock(true)} className="btn btn-ghost" title="Configurar stock bajo">
              <SlidersHorizontal size={16} />
              <span className="hidden md:inline">Stock</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setModal('nuevo')} className="btn btn-primary">
              <Plus size={16} />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex',gap:8,marginBottom:'1.25rem'}}>
        <div className="search-wrap" style={{flex:1}}>
          <Search size={15} className="search-icon" />
          <input className="input" placeholder="Buscar por nombre, código o marca..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button onClick={() => setMostrarEscaner(true)}
          className="btn btn-ghost md:hidden" style={{padding:'0 12px'}}>
          <Camera size={16} />
        </button>
        <button onClick={() => setBajoStock(!bajoStock)}
          className="btn"
          style={{
            background: bajoStock ? '#fef2f2' : '#fff',
            color: bajoStock ? 'var(--red)' : 'var(--text-2)',
            border: `1px solid ${bajoStock ? '#fecaca' : 'var(--border)'}`,
            gap: 6
          }}>
          <AlertTriangle size={14} />
          <span className="hidden sm:inline">Stock bajo</span>
        </button>
      </div>

      {mostrarEscaner && (
        <EscanerCamara onEscaneo={(c) => { setBusqueda(c); setMostrarEscaner(false) }}
          onCerrar={() => setMostrarEscaner(false)} />
      )}

      {/* Tabla desktop */}
      <div className="hidden md:block overflow-x-auto" style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Marca</th>
              {isAdmin && <th>Costo</th>}
              <th>Precio venta</th>
              <th>Stock</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>
                <span className="loader" />
              </td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={8} style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>
                No hay productos
              </td></tr>
            ) : productos.map(p => (
              <tr key={p.id} className={esBajoStock(p) ? '' : ''}>
                <td style={{fontFamily:'monospace',fontSize:11,color:'var(--text-3)'}}>{p.codigo_barras}</td>
                <td style={{fontWeight:600}}>{p.nombre}</td>
                <td style={{color:'var(--text-2)',fontSize:13}}>{p.tipo}</td>
                <td style={{color:'var(--text-2)',fontSize:13}}>{p.marca}</td>
                {isAdmin && <td style={{color:'var(--text-2)'}}>${p.precio_costo.toFixed(2)}</td>}
                <td style={{fontWeight:600,color:'var(--green)'}}>${p.precio_venta.toFixed(2)}</td>
                <td>
                  <span style={{
                    fontWeight:700,
                    color: esBajoStock(p) ? 'var(--red)' : 'var(--text)',
                    display:'flex',alignItems:'center',gap:4
                  }}>
                    {p.stock}
                    {esBajoStock(p) && <AlertTriangle size={13} style={{color:'var(--red)'}} />}
                  </span>
                </td>
                <td>
                  {isAdmin && (
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={() => setModal(p)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4}}
                        onMouseEnter={e => e.target.style.color='var(--accent)'}
                        onMouseLeave={e => e.target.style.color='var(--text-3)'}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => eliminar(p.id)}
                        style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:4}}
                        onMouseEnter={e => e.target.style.color='var(--red)'}
                        onMouseLeave={e => e.target.style.color='var(--text-3)'}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-4" style={{display:'flex',flexDirection:'column',gap:8}}>
        {loading ? (
          <div className="empty-state"><span className="loader" /></div>
        ) : productos.length === 0 ? (
          <div className="empty-state">
            <p>Sin productos</p>
            <p>Agregá el primero con el botón de arriba</p>
          </div>
        ) : productos.map(p => (
          <div key={p.id} className="card" style={{padding:'1rem'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:15,marginBottom:2}}>{p.nombre}</p>
                <p style={{fontSize:11,fontFamily:'monospace',color:'var(--text-3)',marginBottom:4}}>{p.codigo_barras}</p>
                <p style={{fontSize:12,color:'var(--text-2)'}}>{p.tipo} · {p.marca}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontWeight:700,color:'var(--green)',fontSize:16}}>${p.precio_venta.toFixed(2)}</p>
                {isAdmin && <p style={{fontSize:11,color:'var(--text-3)'}}>costo: ${p.precio_costo.toFixed(2)}</p>}
                <p style={{fontSize:12,fontWeight:700,color: esBajoStock(p) ? 'var(--red)' : 'var(--text-2)',marginTop:2}}>
                  Stock: {p.stock} {esBajoStock(p) && '⚠'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div style={{display:'flex',gap:8,marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <button onClick={() => setModal(p)} className="btn btn-ghost" style={{flex:1,justifyContent:'center'}}>
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => eliminar(p.id)} className="btn btn-danger" style={{flex:1,justifyContent:'center'}}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modales */}
      {modal && (
        <ModalProducto
          producto={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); cargar() }}
          tiposExistentes={tiposExistentes}
          marcasExistentes={marcasExistentes}
        />
      )}
      {panelStock && (
        <PanelUmbrales
          tiposExistentes={tiposExistentes}
          marcasExistentes={marcasExistentes}
          onClose={() => { setPanelStock(false); cargarUmbrales() }}
        />
      )}
    </div>
  )
}
