import { useState, useEffect, useRef } from 'react'
import { productoService } from '../services/api'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, Camera } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import EscanerCamara from '../components/ui/EscanerCamara'

// ── Componente AutocompleteInput ──────────────────────────────────────────────
function AutocompleteInput({ value, onChange, opciones, placeholder, className }) {
  const [abierto, setAbierto] = useState(false)
  const [filtradas, setFiltradas] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleChange = (val) => {
    onChange(val)
    const f = opciones.filter(o =>
      o.toLowerCase().includes(val.toLowerCase()) &&
      o.toLowerCase() !== val.toLowerCase()
    )
    setFiltradas(f)
    setAbierto(f.length > 0 && val.length > 0)
  }

  const handleFocus = () => {
    const f = value
      ? opciones.filter(o => o.toLowerCase().includes(value.toLowerCase()))
      : opciones
    setFiltradas(f)
    setAbierto(f.length > 0)
  }

  const seleccionar = (opcion) => {
    onChange(opcion)
    setAbierto(false)
  }

  return (
    <div className="relative" ref={ref}>
      <input
        className={className || 'input'}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
      />
      {abierto && filtradas.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtradas.map((op, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => seleccionar(op)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
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
    precio_costo: '', margen_ganancia: 30, stock: 0
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
      toast.success('Datos completados desde catalogo SEPA')
    } catch { toast('No encontrado en catalogo, completa manualmente', { icon: 'ℹ️' }) }
    finally { setBuscando(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
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
              />
            </div>
            <div>
              <label className="label">Marca</label>
              <AutocompleteInput
                value={form.marca}
                onChange={val => setForm(f => ({...f, marca: val}))}
                opciones={marcasExistentes}
                placeholder="Ej: Coca-Cola"
              />
            </div>
          </div>

          {/* Costo, Margen, Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Costo ($)</label>
              <input className="input" type="number" step="0.01" value={form.precio_costo}
                onChange={e => setForm(f => ({...f, precio_costo: e.target.value}))}
                placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Margen (%)</label>
              <input className="input" type="number" value={form.margen_ganancia}
                onChange={e => setForm(f => ({...f, margen_ganancia: e.target.value}))} />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" value={form.stock}
                onChange={e => setForm(f => ({...f, stock: e.target.value}))} />
            </div>
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

  useEffect(() => { if (searchParams.get('bajo_stock')) setBajoStock(true) }, [])
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
        {isAdmin && (
          <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2 text-sm md:text-base px-3 md:px-4">
            <Plus size={18} /> <span className="hidden sm:inline">Nuevo producto</span><span className="sm:hidden">Nuevo</span>
          </button>
        )}
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
