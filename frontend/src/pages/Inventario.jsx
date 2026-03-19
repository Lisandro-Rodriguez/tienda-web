import { useState, useEffect } from 'react'
import { productoService } from '../services/api'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

function ModalProducto({ producto, onClose, onSave }) {
  const [form, setForm] = useState(producto || {
    codigo_barras: '', nombre: '', tipo: '', marca: '',
    precio_costo: '', margen_ganancia: 30, stock: 0
  })
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)

  const precioVenta = form.precio_costo
    ? (parseFloat(form.precio_costo) * (1 + parseFloat(form.margen_ganancia || 0) / 100)).toFixed(2)
    : '0.00'

  const buscarCodigo = async () => {
    if (!form.codigo_barras || producto) return
    setBuscando(true)
    try {
      const res = await productoService.buscarEnCatalogo(form.codigo_barras)
      setForm(f => ({ ...f, nombre: res.data.nombre, marca: res.data.marca, tipo: res.data.tipo }))
      toast.success('Datos completados desde catálogo SEPA')
    } catch {
      toast('Producto no encontrado en catálogo, completá manualmente', { icon: 'ℹ️' })
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (producto) {
        await productoService.actualizar(producto.id, form)
        toast.success('Producto actualizado')
      } else {
        await productoService.crear(form)
        toast.success('Producto registrado')
      }
      onSave()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-lg">{producto ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="label">Código de barras</label>
            <div className="flex gap-2">
              <input className="input" value={form.codigo_barras}
                onChange={e => setForm(f => ({...f, codigo_barras: e.target.value}))}
                placeholder="Escanear o escribir" disabled={!!producto} required />
              {!producto && (
                <button type="button" onClick={buscarCodigo} disabled={buscando}
                  className="btn-secondary px-3 text-sm whitespace-nowrap">
                  {buscando ? '...' : 'Buscar'}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre}
              onChange={e => setForm(f => ({...f, nombre: e.target.value}))}
              placeholder="Nombre del producto" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo / Categoría</label>
              <input className="input" value={form.tipo}
                onChange={e => setForm(f => ({...f, tipo: e.target.value}))}
                placeholder="Ej: Bebida" />
            </div>
            <div>
              <label className="label">Marca</label>
              <input className="input" value={form.marca}
                onChange={e => setForm(f => ({...f, marca: e.target.value}))}
                placeholder="Ej: Coca-Cola" />
            </div>
          </div>
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
          <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm">
            <span className="text-gray-600">Precio de venta calculado: </span>
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

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [bajoStock, setBajoStock] = useState(false)
  const [modal, setModal] = useState(null) // null | 'nuevo' | producto
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const { usuario } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await productoService.listar({
        busqueda: busqueda || undefined,
        bajo_stock: bajoStock || undefined
      })
      setProductos(res.data)
    } catch { toast.error('Error al cargar productos') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (searchParams.get('bajo_stock')) setBajoStock(true)
  }, [])

  useEffect(() => { cargar() }, [busqueda, bajoStock])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return
    try {
      await productoService.eliminar(id)
      toast.success('Producto eliminado')
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Inventario</h1>
          <p className="text-sm text-gray-500">{productos.length} productos</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('nuevo')} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Nuevo producto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre, código o marca..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <button
          onClick={() => setBajoStock(!bajoStock)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
            bajoStock ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          <AlertTriangle size={16} />
          Stock bajo
        </button>
      </div>

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Código', 'Nombre', 'Tipo', 'Marca', 'Costo', 'Venta', 'Stock', ''].map(h => (
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
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.codigo_barras}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                <td className="px-4 py-3 text-gray-500">{p.tipo}</td>
                <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                <td className="px-4 py-3 text-gray-700">${p.precio_costo.toFixed(2)}</td>
                <td className="px-4 py-3 font-semibold text-green-700">${p.precio_venta.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
                    {p.stock}
                  </span>
                  {p.stock <= 5 && <AlertTriangle size={12} className="inline ml-1 text-red-500" />}
                </td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => setModal(p)} className="text-blue-500 hover:text-blue-700">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => eliminar(p.id)} className="text-red-400 hover:text-red-600">
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

      {modal && (
        <ModalProducto
          producto={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); cargar() }}
        />
      )}
    </div>
  )
}
