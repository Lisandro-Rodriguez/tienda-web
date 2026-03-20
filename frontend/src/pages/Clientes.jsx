import { useState, useEffect } from 'react'
import { clienteService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Plus, X, ChevronDown, ChevronUp, DollarSign, Edit2, Trash2, Search } from 'lucide-react'

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
    setClientes(r.data)
    setFiltrados(r.data)
  })
  useEffect(() => { cargar() }, [])

  // Filtrar por búsqueda
  useEffect(() => {
    if (!busqueda.trim()) {
      setFiltrados(clientes)
    } else {
      const b = busqueda.toLowerCase()
      setFiltrados(clientes.filter(c =>
        c.nombre.toLowerCase().includes(b) ||
        c.telefono?.toLowerCase().includes(b)
      ))
    }
  }, [busqueda, clientes])

  const crearCliente = async (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) { toast.error('El nombre es obligatorio'); return }
    const nombreLower = nuevoNombre.trim().toLowerCase()
    if (clientes.find(c => c.nombre.toLowerCase() === nombreLower)) {
      toast.error('Ya existe un cliente con ese nombre'); return
    }
    if (nuevoTel.trim() && clientes.find(c => c.telefono === nuevoTel.trim())) {
      toast.error('Ya existe un cliente con ese telefono'); return
    }
    try {
      await clienteService.crear({ nombre: nuevoNombre.trim(), telefono: nuevoTel.trim() })
      toast.success('Cliente registrado')
      setNuevoNombre(''); setNuevoTel(''); setShowForm(false)
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const editarCliente = async () => {
    if (!editNombre.trim()) { toast.error('El nombre es obligatorio'); return }
    const nombreLower = editNombre.trim().toLowerCase()
    const duplicado = clientes.find(c => c.nombre.toLowerCase() === nombreLower && c.id !== modalEditar.id)
    if (duplicado) { toast.error('Ya existe un cliente con ese nombre'); return }
    try {
      await clienteService.actualizar(modalEditar.id, { nombre: editNombre.trim(), telefono: editTel.trim() })
      toast.success('Cliente actualizado')
      setModalEditar(null)
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const eliminarCliente = async (cliente) => {
    if (cliente.deuda_total > 0) {
      toast.error(`${cliente.nombre} tiene deuda pendiente de $${cliente.deuda_total.toFixed(2)}`)
      return
    }
    if (!confirm(`¿Eliminar a ${cliente.nombre}?`)) return
    try {
      await clienteService.eliminar(cliente.id)
      toast.success('Cliente eliminado')
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
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
      await clienteService.registrarMovimiento(modalAbono.id, {
        tipo: 'ABONO', monto, detalle: 'Abono en efectivo'
      })
      toast.success('Abono registrado')
      setModalAbono(null); setMontoAbono('')
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const totalDeuda = clientes.reduce((s, c) => s + c.deuda_total, 0)
  const conDeuda = clientes.filter(c => c.deuda_total > 0).length

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-800">Cuentas Corrientes</h1>
          <p className="text-sm text-gray-500">
            {conDeuda > 0
              ? `${conDeuda} cliente${conDeuda > 1 ? 's' : ''} con deuda — Total: $${totalDeuda.toFixed(2)}`
              : `${clientes.length} clientes registrados`
            }
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm px-3 md:px-4">
          <Plus size={18} /> <span className="hidden sm:inline">Nuevo cliente</span><span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nombre o teléfono..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Formulario nuevo cliente */}
      {showForm && (
        <div className="card">
          <form onSubmit={crearCliente} className="space-y-3">
            <p className="font-semibold text-gray-700">Nuevo cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de clientes */}
      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-semibold">
            {busqueda ? 'No se encontraron clientes' : 'No hay clientes registrados'}
          </p>
          {!busqueda && <p className="text-sm mt-1">Creá el primer cliente con el botón de arriba</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => (
            <div key={c.id} className="card p-0 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                {/* Avatar */}
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700 flex-shrink-0">
                  {c.nombre[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{c.nombre}</p>
                  {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                </div>

                {/* Deuda */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-extrabold text-lg ${c.deuda_total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${c.deuda_total.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">{c.deuda_total > 0 ? 'debe' : 'al dia'}</p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                  {c.deuda_total > 0 && (
                    <button onClick={() => setModalAbono(c)}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1">
                      <DollarSign size={13} />
                      <span className="hidden sm:inline">Abonar</span>
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={() => { setModalEditar(c); setEditNombre(c.nombre); setEditTel(c.telefono || '') }}
                        className="text-blue-400 hover:text-blue-600 p-1.5">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => eliminarCliente(c)}
                        className="text-red-400 hover:text-red-600 p-1.5">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  <button onClick={() => verMovimientos(c.id)} className="text-gray-400 hover:text-gray-600 p-1.5">
                    {expandido === c.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Historial de movimientos */}
              {expandido === c.id && movimientos[c.id] && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Historial</p>
                  {movimientos[c.id].length === 0 ? (
                    <p className="text-sm text-gray-400">Sin movimientos</p>
                  ) : (
                    <div className="space-y-1.5">
                      {movimientos[c.id].map(m => (
                        <div key={m.id} className="flex items-center justify-between text-sm">
                          <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                            m.tipo === 'FIADO' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {m.tipo === 'FIADO' ? '↑ Fiado' : '↓ Abono'}
                          </span>
                          <span className="text-gray-400 text-xs truncate mx-2">{m.detalle}</span>
                          <span className="font-bold flex-shrink-0">${m.monto.toFixed(2)}</span>
                          <span className="text-gray-400 text-xs ml-2 flex-shrink-0">
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

      {/* Modal editar cliente */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Editar cliente</h2>
              <button onClick={() => setModalEditar(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Nombre *</label>
                <input className="input" value={editNombre}
                  onChange={e => setEditNombre(e.target.value)} required />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={editTel}
                  onChange={e => setEditTel(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalEditar(null)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={editarCliente} className="btn-primary flex-1">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal abono */}
      {modalAbono && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full md:max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Registrar abono</h2>
              <button onClick={() => setModalAbono(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Cliente: <strong>{modalAbono.nombre}</strong></p>
            <p className="text-sm text-red-600 mb-4">Deuda: <strong>${modalAbono.deuda_total.toFixed(2)}</strong></p>
            <label className="label">Monto a abonar ($)</label>
            <input type="number" step="0.01" min="0.01" className="input mb-4"
              value={montoAbono}
              onChange={e => { if (e.target.value === '' || parseFloat(e.target.value) >= 0) setMontoAbono(e.target.value) }}
              onKeyDown={e => { if (e.key === '-') e.preventDefault() }}
              placeholder="0.00" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setModalAbono(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={registrarAbono} className="btn-success flex-1">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
