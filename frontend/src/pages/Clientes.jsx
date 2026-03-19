import { useState, useEffect } from 'react'
import { clienteService } from '../services/api'
import toast from 'react-hot-toast'
import { Plus, X, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [movimientos, setMovimientos] = useState({})
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoTel, setNuevoTel] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [modalAbono, setModalAbono] = useState(null)
  const [montoAbono, setMontoAbono] = useState('')

  const cargar = () => clienteService.listar().then(r => setClientes(r.data))
  useEffect(() => { cargar() }, [])

  const crearCliente = async (e) => {
    e.preventDefault()
    try {
      await clienteService.crear({ nombre: nuevoNombre, telefono: nuevoTel })
      toast.success('Cliente registrado')
      setNuevoNombre(''); setNuevoTel(''); setShowForm(false)
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
    if (!montoAbono || parseFloat(montoAbono) <= 0) { toast.error('Monto inválido'); return }
    try {
      await clienteService.registrarMovimiento(modalAbono.id, {
        tipo: 'ABONO', monto: parseFloat(montoAbono),
        detalle: 'Abono en efectivo'
      })
      toast.success('Abono registrado')
      setModalAbono(null); setMontoAbono('')
      cargar()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">Cuentas Corrientes</h1>
          <p className="text-sm text-gray-500">Gestión de fiado</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={crearCliente} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">Nombre</label>
              <input className="input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
                placeholder="Nombre del cliente" required />
            </div>
            <div className="w-40">
              <label className="label">Teléfono</label>
              <input className="input" value={nuevoTel} onChange={e => setNuevoTel(e.target.value)}
                placeholder="Opcional" />
            </div>
            <button type="submit" className="btn-primary">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {clientes.map(c => (
          <div key={c.id} className="card p-0 overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center font-bold text-blue-700">
                {c.nombre[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">{c.nombre}</p>
                {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
              </div>
              <div className="text-right">
                <p className={`font-extrabold text-lg ${c.deuda_total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${c.deuda_total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{c.deuda_total > 0 ? 'debe' : 'al día'}</p>
              </div>
              {c.deuda_total > 0 && (
                <button onClick={() => setModalAbono(c)}
                  className="btn-success flex items-center gap-1 text-sm px-3 py-1.5">
                  <DollarSign size={14} /> Abonar
                </button>
              )}
              <button onClick={() => verMovimientos(c.id)} className="text-gray-400 hover:text-gray-600">
                {expandido === c.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {expandido === c.id && movimientos[c.id] && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <p className="text-xs font-bold text-gray-500 mb-2">HISTORIAL DE MOVIMIENTOS</p>
                {movimientos[c.id].length === 0 ? (
                  <p className="text-sm text-gray-400">Sin movimientos</p>
                ) : (
                  <div className="space-y-1">
                    {movimientos[c.id].map(m => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className={`font-semibold ${m.tipo === 'FIADO' ? 'text-red-600' : 'text-green-600'}`}>
                          {m.tipo === 'FIADO' ? '↑ Fiado' : '↓ Abono'}
                        </span>
                        <span className="text-gray-500 text-xs">{m.detalle}</span>
                        <span className="font-bold">${m.monto.toFixed(2)}</span>
                        <span className="text-gray-400 text-xs">
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

      {/* Modal abono */}
      {modalAbono && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Registrar abono</h2>
              <button onClick={() => setModalAbono(null)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-1">Cliente: <strong>{modalAbono.nombre}</strong></p>
            <p className="text-sm text-red-600 mb-4">Deuda actual: <strong>${modalAbono.deuda_total.toFixed(2)}</strong></p>
            <label className="label">Monto a abonar ($)</label>
            <input type="number" step="0.01" className="input mb-4"
              value={montoAbono} onChange={e => setMontoAbono(e.target.value)}
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
