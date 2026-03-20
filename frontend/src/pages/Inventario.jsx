import React, { useState, useEffect, useRef } from 'react'
import { productoService, stockService } from '../services/api'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Camera } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import EscanerCamara from '../components/ui/EscanerCamara'

function AutocompleteInput({ value, onChange, opciones, placeholder }) {
  const [abierto, setAbierto] = React.useState(false)
  const [filtradas, setFiltradas] = React.useState([])
  const ref = React.useRef(null)

  React.useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChange = (val) => {
    onChange(val)
    const f = opciones.filter(o => o.toLowerCase().includes(val.toLowerCase()))
    setFiltradas(f)
    setAbierto(f.length > 0)
  }

  const handleFocus = () => {
    const f = value
      ? opciones.filter(o => o.toLowerCase().includes(value.toLowerCase()))
      : [...opciones]
    setFiltradas(f)
    setAbierto(f.length > 0)
  }

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
      />
      {abierto && filtradas.length > 0 && (
        <div style={{position:'absolute', zIndex:9999, width:'100%', background:'white',
          border:'1px solid #e5e7eb', borderRadius:'8px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)',
          marginTop:'2px', maxHeight:'180px', overflowY:'auto'}}>
          {filtradas.map((op, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(op); setAbierto(false) }}
              onTouchEnd={(e) => { e.preventDefault(); onChange(op); setAbierto(false) }}
              style={{display:'block', width:'100%', textAlign:'left',
                padding:'8px 12px', fontSize:'14px', background:'none', border:'none',
                cursor:'pointer'}}
              onMouseEnter={e => e.target.style.background='#eff6ff'}
              onMouseLeave={e => e.target.style.background='none'}
            >
              {op}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal de producto ─────────────────────────────────────────────────────────
function ModalProducto({ producto, onClose, onSave, tiposExistentes, marcasExistentes }) {
  const [form, setForm] = useState(producto || {
    codigo_barras: '', nombre: '', tipo: '', marca: '',
    precio_costo: '', margen_ganancia: 30, stock: 0, stock_minimo: ''
  })
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [mostrarAjustes, setMostrarAjustes] = useState(false)
  const [umbrales, setUmbrales] = useState([])
  const [nuevoUmbral, setNuevoUmbral] = useState({ tipo: 'global', referencia: '', umbral: 5 })

  const precioVenta = form.precio_costo
    ? (parseFloat(form.precio_costo) * (1 + parseFloat(form.margen_ganancia || 0) / 100)).toFixed(2)
    : '0.00'

  const buscarCodigo = async () => {
    if (!form.codigo_barras || producto) return
    setBuscando(true)
    try {
      const res = await productoService.buscarEnCatalogo(form.codigo_barras)
      setForm(f => ({ ...f, nombre: res.data.nombre, marca: res.data.marca, tipo: res.data.tipo }))
      toast.success('Datos completados desde catalogo SEPA')
    } catch { toast('No encontrado en catalogo, completa manualmente', { icon: 'ℹ️' }) }
    finally { setBuscando(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validaciones del frontend
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    if (!form.codigo_barras.trim()) { toast.error('El codigo de barras es obligatorio'); return }
    const costo = parseFloat(form.precio_costo)
    if (!costo || costo <= 0) { toast.error('El costo debe ser mayor a 0'); return }
    const margen = parseFloat(form.margen_ganancia)
    if (margen < 0) { toast.error('El margen no puede ser negativo'); return }
    const stock = parseInt(form.stock)
    if (stock < 0) { toast.error('El stock no puede ser negativo'); return }
    if (form.stock_minimo !== '' && parseInt(form.stock_minimo) < 0) {
      toast.error('El stock minimo no puede ser negativo'); return
    }

    setLoading(true)
    try {
      if (producto) { await productoService.actualizar(producto.id, form); toast.success('Producto actualizado') }
      else { await productoService.crear(form); toast.success('Producto registrado') }
      onSave()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al guardar') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-bold text-lg">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Código de barras */}
          <div>
            <label className="label">Codigo de barras</label>
            <div className="flex gap-2">
              <input className="input" value={form.codigo_barras}
                onChange={e => setForm(f => ({...f, codigo_barras: e.target.value}))}
                placeholder="Escanear o escribir" disabled={!!producto} required />
              {!producto && (
                <>
                  <button type="button" onClick={() => setMostrarEscaner(true)}
                    className="btn-secondary px-3 flex items-center gap-1">
                    <Camera size={16} />
                  </button>
                  <button type="button" onClick={buscarCodigo} disabled={buscando}
                    className="btn-secondary px-3 text-sm whitespace-nowrap">
                    {buscando ? '...' : 'Buscar'}
                  </button>
                </>
              )}
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
                  toast.success('Datos completados desde catalogo SEPA')
                } catch {
                  toast('No encontrado en catalogo, completa manualmente', { icon: 'ℹ️' })
                } finally { setBuscando(false) }
              }}
              onCerrar={() => setMostrarEscaner(false)}
            />
          )}

          {/* Nombre */}
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre}
              onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              placeholder="Nombre del producto" required />
          </div>

          {/* Tipo y Marca con autocompletado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo / Categoria</label>
              <AutocompleteInput
                value={form.tipo}
                onChange={val => setForm(f => ({...f, tipo: val}))}
                opciones={tiposExistentes}
                placeholder="Ej: Bebida"
                id="autocomplete-tipo"
              />
            </div>
            <div>
              <label className="label">Marca</label>
              <AutocompleteInput
                value={form.marca}
                onChange={val => setForm(f => ({...f, marca: val}))}
                opciones={marcasExistentes}
                placeholder="Ej: Coca-Cola"
                id="autocomplete-marca"
              />
            </div>
          </div>

          {/* Costo, Margen, Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Costo ($)</label>
              <input className="input" type="number" step="0.01" value={form.precio_costo}
                onChange={e => setForm(f => ({...f, precio_costo: e.target.value}))}
                placeholder="0.00" required min="0.01" step="0.01" />
            </div>
            <div>
              <label className="label">Margen (%)</label>
              <input className="input" type="number" value={form.margen_ganancia}
                onChange={e => setForm(f => ({...f, margen_ganancia: e.target.value}))} min="0" max="10000" />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" value={form.stock}
                onChange={e => setForm(f => ({...f, stock: e.target.value}))} min="0" />
            </div>
          </div>

          {/* Stock mínimo */}
          <div>
            <label className="label">Stock minimo (alerta)</label>
            <input className="input" type="number" value={form.stock_minimo}
              onChange={e => setForm(f => ({...f, stock_minimo: e.target.value}))}
              placeholder="Dejar vacio para usar el umbral global" min="0" />
            <p className="text-xs text-gray-400 mt-1">Si se deja vacio, se usa la configuracion global del inventario</p>
          </div>

          {/* Precio calculado */}
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-600">Precio de venta: </span>
            <span className="font-bold text-blue-700">${precioVenta}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal Inventario ───────────────────────────────────────────────
export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [bajoStock, setBajoStock] = useState(false)
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tiposExistentes, setTiposExistentes] = useState([])
  const [marcasExistentes, setMarcasExistentes] = useState([])
  const [searchParams] = useSearchParams()
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [mostrarAjustes, setMostrarAjustes] = useState(false)
  const [umbrales, setUmbrales] = useState([])
  const [nuevoUmbral, setNuevoUmbral] = useState({ tipo: 'global', referencia: '', umbral: 5 })

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await productoService.listar({ busqueda: busqueda || undefined, bajo_stock: bajoStock || undefined })
      setProductos(res.data)

      // Extraer tipos y marcas únicos para el autocompletado
      const tipos = [...new Set(res.data.map(p => p.tipo).filter(t => t && t !== '-'))].sort()
      const marcas = [...new Set(res.data.map(p => p.marca).filter(m => m && m !== '-'))].sort()
      setTiposExistentes(tipos)
      setMarcasExistentes(marcas)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }

  const cargarUmbrales = async () => {
    try {
      const res = await stockService.listarUmbrales()
      setUmbrales(res.data)
    } catch {}
  }

  const guardarUmbral = async () => {
    if (!nuevoUmbral.umbral) { toast.error('Ingresa un valor'); return }
    try {
      await stockService.guardarUmbral(nuevoUmbral)
      toast.success('Umbral guardado')
      cargarUmbrales()
      setNuevoUmbral({ tipo: 'global', referencia: '', umbral: 5 })
    } catch { toast.error('Error al guardar') }
  }

  const eliminarUmbral = async (id) => {
    try {
      await stockService.eliminarUmbral(id)
      cargarUmbrales()
    } catch {}
  }

  useEffect(() => {
    if (searchParams.get('bajo_stock')) setBajoStock(true)
    cargarUmbrales()
  }, [])
  useEffect(() => { cargar() }, [busqueda, bajoStock])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try { await productoService.eliminar(id); toast.success('Eliminado'); cargar() }
    catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500">{productos.length} productos</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setMostrarAjustes(true)}
              className="btn-secondary flex items-center gap-2 text-sm px-3">
              ⚙️ <span className="hidden sm:inline">Stock</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2 text-sm md:text-base px-3 md:px-4">
              <Plus size={18} /> <span className="hidden sm:inline">Nuevo producto</span><span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input className="input pl-9 text-sm" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <button onClick={() => setMostrarEscaner(true)}
          className="md:hidden btn-secondary px-3 flex items-center gap-1">
          <Camera size={18} />
        </button>
        <button onClick={() => setBajoStock(!bajoStock)}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap ${
            bajoStock ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'
          }`}>
          <AlertTriangle size={15} /><span className="hidden sm:inline">Stock bajo</span>
        </button>
      </div>

      {mostrarEscaner && (
        <EscanerCamara
          onEscaneo={(codigo) => setBusqueda(codigo)}
          onCerrar={() => setMostrarEscaner(false)}
        />
      )}

      {/* Tabla desktop */}
      <div className="card p-0 overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Codigo', 'Nombre', 'Tipo', 'Marca', 'Costo', 'Venta', 'Stock', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            ) : productos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No hay productos</td></tr>
            ) : productos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo_barras}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{p.tipo}</td>
                <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                <td className="px-4 py-3 text-gray-700">${p.precio_costo.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-green-700">${p.precio_venta.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-gray-800'}`}>{p.stock}</span>
                  {p.stock <= 5 && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                </td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => setModal(p)} className="text-blue-500 hover:text-blue-700"><Edit2 size={15} /></button>
                      <button onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  )}
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
        ) : productos.length === 0 ? (
          <p className="text-center py-8 text-gray-400">No hay productos</p>
        ) : productos.map(p => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{p.nombre}</p>
                <p className="text-xs text-gray-400 font-mono">{p.codigo_barras}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.tipo} · {p.marca}</p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="font-bold text-green-700">${p.precio_venta.toFixed(2)}</p>
                <p className="text-xs text-gray-400">costo: ${p.precio_costo.toFixed(2)}</p>
                <p className={`text-xs font-bold mt-0.5 ${p.stock <= 5 ? 'text-red-600' : 'text-gray-600'}`}>
                  Stock: {p.stock} {p.stock <= 5 && '⚠️'}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => setModal(p)} className="flex-1 btn-secondary text-sm py-1.5 flex items-center justify-center gap-1">
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => eliminar(p.id)} className="flex-1 btn-danger text-sm py-1.5 flex items-center justify-center gap-1">
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Panel ajustes de stock */}
      {mostrarAjustes && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-bold text-lg">⚙️ Configuracion de Stock Bajo</h2>
              <button onClick={() => setMostrarAjustes(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Umbrales existentes */}
              {umbrales.length > 0 && (
                <div>
                  <p className="label mb-2">Umbrales configurados</p>
                  <div className="space-y-2">
                    {umbrales.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                        <div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${
                            u.tipo === 'global' ? 'bg-blue-100 text-blue-700' :
                            u.tipo === 'tipo' ? 'bg-purple-100 text-purple-700' :
                            u.tipo === 'marca' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{u.tipo}</span>
                          <span className="text-sm text-gray-600">{u.referencia || 'Todos los productos'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-600">≤ {u.umbral}</span>
                          <button onClick={() => eliminarUmbral(u.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar nuevo umbral */}
              <div className="border-t pt-4">
                <p className="label mb-3">Agregar umbral</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label text-xs">Aplicar a</label>
                    <select className="input text-sm" value={nuevoUmbral.tipo}
                      onChange={e => setNuevoUmbral(u => ({...u, tipo: e.target.value, referencia: ''}))}>
                      <option value="global">Todos los productos</option>
                      <option value="tipo">Por tipo/categoria</option>
                      <option value="marca">Por marca</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Cantidad minima</label>
                    <input type="number" className="input text-sm" value={nuevoUmbral.umbral}
                      onChange={e => setNuevoUmbral(u => ({...u, umbral: parseInt(e.target.value) || 0}))}
                      min="0" />
                  </div>
                </div>

                {nuevoUmbral.tipo === 'tipo' && (
                  <div className="mb-3">
                    <label className="label text-xs">Tipo / Categoria</label>
                    <AutocompleteInput
                      value={nuevoUmbral.referencia}
                      onChange={val => setNuevoUmbral(u => ({...u, referencia: val}))}
                      opciones={tiposExistentes}
                      placeholder="Ej: Bebida"
                    />
                  </div>
                )}

                {nuevoUmbral.tipo === 'marca' && (
                  <div className="mb-3">
                    <label className="label text-xs">Marca</label>
                    <AutocompleteInput
                      value={nuevoUmbral.referencia}
                      onChange={val => setNuevoUmbral(u => ({...u, referencia: val}))}
                      opciones={marcasExistentes}
                      placeholder="Ej: Coca-Cola"
                    />
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-3">
                  <strong>Prioridad:</strong> Producto individual &gt; Por tipo &gt; Por marca &gt; Global
                </div>

                <button onClick={guardarUmbral} className="btn-primary w-full">
                  Guardar umbral
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <ModalProducto
          producto={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); cargar() }}
          tiposExistentes={tiposExistentes}
          marcasExistentes={marcasExistentes}
        />
      )}
    </div>
  )
}
