import { useState, useEffect } from 'react'
import { negocioService, catalogoService } from '../services/api'
import toast from 'react-hot-toast'
import { Save, Database, CheckCircle, Package } from 'lucide-react'

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '', mensaje_ticket: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [totalCatalogo, setTotalCatalogo] = useState(null)

  useEffect(() => {
    negocioService.miNegocio().then(r => setForm(r.data)).catch(() => {})
    catalogoService.stats().then(r => setTotalCatalogo(r.data.total)).catch(() => {})
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      await negocioService.actualizar(form)
      toast.success('Configuracion guardada')
    } catch { toast.error('Error al guardar') }
    finally { setGuardando(false) }
  }

  const campo = (label, key, placeholder, tipo = 'text') => (
    <div>
      <label className="label">{label}</label>
      <input type={tipo} className="input" value={form[key] || ''}
        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        placeholder={placeholder} />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl md:text-2xl font-extrabold text-gray-800">Configuracion</h1>

      {/* Datos del negocio */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-4">Datos del Negocio</h2>
        <form onSubmit={guardar} className="space-y-4">
          {campo('Nombre del negocio', 'nombre', 'Ej: Kiosco La Esquina')}
          {campo('Direccion', 'direccion', 'Ej: Av. San Martin 123')}
          <div className="grid grid-cols-2 gap-3">
            {campo('CUIT', 'cuit', '20-12345678-9')}
            {campo('Telefono', 'telefono', '387-1234567')}
          </div>
          {campo('Email', 'email', 'negocio@gmail.com', 'email')}
          <div>
            <label className="label">Mensaje en ticket</label>
            <textarea className="input h-16 resize-none" value={form.mensaje_ticket || ''}
              onChange={e => setForm(f => ({...f, mensaje_ticket: e.target.value}))}
              placeholder="Gracias por su compra!" />
          </div>
          <button type="submit" disabled={guardando}
            className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </form>
      </div>

      {/* Estado del catálogo SEPA */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-700">Catalogo SEPA</h2>
            <p className="text-xs text-gray-400">Base de productos argentina para autocompletar codigos</p>
          </div>
        </div>

        <div className={`rounded-xl p-4 flex items-center gap-4 ${
          totalCatalogo > 0
            ? 'bg-green-50 border border-green-200'
            : 'bg-gray-50 border border-gray-200'
        }`}>
          {totalCatalogo > 0
            ? <CheckCircle size={28} className="text-green-500 flex-shrink-0" />
            : <Package size={28} className="text-gray-400 flex-shrink-0" />
          }
          <div>
            <p className="font-bold text-lg">
              {totalCatalogo === null
                ? 'Cargando...'
                : totalCatalogo === 0
                  ? 'Catalogo vacio'
                  : `${totalCatalogo.toLocaleString('es-AR')} productos disponibles`
              }
            </p>
            <p className="text-sm text-gray-500">
              {totalCatalogo > 0
                ? 'Al escanear un codigo se autocompletara nombre, marca y categoria'
                : 'El catalogo aun no fue cargado por el administrador del sistema'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
