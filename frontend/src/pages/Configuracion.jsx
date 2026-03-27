import { useState, useEffect } from 'react'
import { negocioService, catalogoService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { Save, Database, CheckCircle, Package, Plus, Trash2, User, Shield, Eye, EyeOff, FileText } from 'lucide-react'

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        value ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '', mensaje_ticket: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [totalCatalogo, setTotalCatalogo] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [nuevoUsuario, setNuevoUsuario] = useState({ username: '', password: '', rol: 'CAJERO' })
  const [showPass, setShowPass] = useState(false)
  const [creando, setCreando] = useState(false)

  // Preferencias de ticket en localStorage
  const [ticketAutomatico, setTicketAutomatico] = useState(
    localStorage.getItem('ticket_automatico') !== 'false'
  )
  const [ticketAbrirAutomatico, setTicketAbrirAutomatico] = useState(
    localStorage.getItem('ticket_abrir_automatico') === 'true'
  )

  const { usuario } = useAuthStore()

  useEffect(() => {
    negocioService.miNegocio().then(r => setForm(r.data)).catch(() => {})
    catalogoService.stats().then(r => setTotalCatalogo(r.data.total)).catch(() => {})
    cargarUsuarios()
  }, [])

  const cargarUsuarios = () => {
    negocioService.listarUsuarios().then(r => setUsuarios(r.data)).catch(() => {})
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre del negocio es obligatorio'); return }
    setGuardando(true)
    try {
      await negocioService.actualizar(form)
      toast.success('Configuracion guardada')
    } catch { toast.error('Error al guardar') }
    finally { setGuardando(false) }
  }

  const crearUsuario = async (e) => {
    e.preventDefault()
    if (!nuevoUsuario.username.trim()) { toast.error('El nombre de usuario es obligatorio'); return }
    if (nuevoUsuario.password.length < 4) { toast.error('La contrasena debe tener al menos 4 caracteres'); return }
    const duplicado = usuarios.find(u => u.username.toLowerCase() === nuevoUsuario.username.toLowerCase())
    if (duplicado) { toast.error('Ya existe un usuario con ese nombre'); return }
    setCreando(true)
    try {
      await negocioService.crearUsuario(nuevoUsuario)
      toast.success(`Usuario ${nuevoUsuario.username} creado`)
      setNuevoUsuario({ username: '', password: '', rol: 'CAJERO' })
      cargarUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear usuario')
    } finally { setCreando(false) }
  }

  const eliminarUsuario = async (id, username) => {
    if (id === usuario?.id) { toast.error('No podes eliminarte a vos mismo'); return }
    if (!confirm(`¿Eliminar el usuario "${username}"?`)) return
    try {
      await negocioService.eliminarUsuario(id)
      toast.success('Usuario eliminado')
      cargarUsuarios()
    } catch (err) { toast.error(err.response?.data?.detail || 'Error') }
  }

  const handleTicketAutomatico = (val) => {
    setTicketAutomatico(val)
    localStorage.setItem('ticket_automatico', String(val))
  }

  const handleTicketAbrir = (val) => {
    setTicketAbrirAutomatico(val)
    localStorage.setItem('ticket_abrir_automatico', String(val))
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
        <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Shield size={18} className="text-blue-600" /> Datos del Negocio
        </h2>
        <form onSubmit={guardar} className="space-y-4">
          {campo('Nombre del negocio', 'nombre', 'Ej: Kiosco La Esquina')}
          {campo('Direccion', 'direccion', 'Ej: Av. San Martin 123')}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <button type="submit" disabled={guardando} className="btn-primary flex items-center gap-2">
            <Save size={16} />
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </form>
      </div>

      {/* Ticket PDF */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-1 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" /> Ticket de comprobante
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Comprobante interno con datos del negocio, productos y total. No reemplaza a la factura legal.
        </p>
        <div className="space-y-3">

          {/* Toggle 1: generar automáticamente */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold text-sm text-gray-800">Generar ticket al confirmar venta</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {ticketAutomatico
                  ? 'El ticket se genera automáticamente con cada venta'
                  : 'Podés generarlo manualmente desde el historial o el aviso post-venta'}
              </p>
            </div>
            <Toggle value={ticketAutomatico} onChange={handleTicketAutomatico} />
          </div>

          {/* Toggle 2: abrir o descargar */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 transition-opacity ${
            ticketAutomatico ? 'bg-gray-50 opacity-100' : 'bg-gray-50 opacity-40 pointer-events-none'
          }`}>
            <div>
              <p className="font-semibold text-sm text-gray-800">Abrir ticket en el navegador</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {ticketAbrirAutomatico
                  ? 'El PDF se abre en una pestaña nueva para imprimir o guardar'
                  : 'El PDF se descarga directo a la carpeta de descargas'}
              </p>
            </div>
            <Toggle value={ticketAbrirAutomatico} onChange={handleTicketAbrir} />
          </div>

        </div>
      </div>

      {/* Gestión de usuarios */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-1 flex items-center gap-2">
          <User size={18} className="text-blue-600" /> Usuarios del negocio
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Los cajeros solo pueden vender, registrar fiado y ver historial. No ven costos ni ganancias.
        </p>
        <div className="space-y-2 mb-4">
          {usuarios.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  u.rol === 'ADMIN' ? 'bg-blue-600' : 'bg-gray-400'
                }`}>
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{u.username}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    u.rol === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.rol === 'ADMIN' ? 'Administrador' : 'Cajero'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!u.activo && <span className="text-xs text-gray-400">Inactivo</span>}
                {u.id !== usuario?.id && u.rol !== 'ADMIN' && (
                  <button onClick={() => eliminarUsuario(u.id, u.username)}
                    className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                )}
                {u.id === usuario?.id && (
                  <span className="text-xs text-blue-500 font-semibold">Vos</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-4">
          <p className="text-sm font-bold text-gray-600 mb-3">Agregar nuevo usuario</p>
          <form onSubmit={crearUsuario} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Nombre de usuario</label>
                <input className="input text-sm" value={nuevoUsuario.username}
                  onChange={e => setNuevoUsuario(u => ({...u, username: e.target.value}))}
                  placeholder="Ej: maria" required />
              </div>
              <div>
                <label className="label text-xs">Rol</label>
                <select className="input text-sm" value={nuevoUsuario.rol}
                  onChange={e => setNuevoUsuario(u => ({...u, rol: e.target.value}))}>
                  <option value="CAJERO">Cajero</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label text-xs">Contrasena</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input text-sm pr-10"
                  value={nuevoUsuario.password}
                  onChange={e => setNuevoUsuario(u => ({...u, password: e.target.value}))}
                  placeholder="Minimo 4 caracteres" required minLength={4} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className={`rounded-lg p-3 text-xs ${
              nuevoUsuario.rol === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
            }`}>
              {nuevoUsuario.rol === 'ADMIN'
                ? '✓ Acceso total: ventas, inventario, fiado, reportes, configuracion y ganancias'
                : '✓ Acceso limitado: solo caja de ventas, fiado e historial. No ve costos ni ganancias'}
            </div>
            <button type="submit" disabled={creando}
              className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus size={16} />
              {creando ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>
        </div>
      </div>

      {/* Catálogo SEPA */}
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
          totalCatalogo > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
        }`}>
          {totalCatalogo > 0
            ? <CheckCircle size={28} className="text-green-500 flex-shrink-0" />
            : <Package size={28} className="text-gray-400 flex-shrink-0" />}
          <div>
            <p className="font-bold text-lg">
              {totalCatalogo === null ? 'Cargando...'
                : totalCatalogo === 0 ? 'Catalogo vacio'
                : `${totalCatalogo.toLocaleString('es-AR')} productos disponibles`}
            </p>
            <p className="text-sm text-gray-500">
              {totalCatalogo > 0
                ? 'Al escanear un codigo se autocompletara nombre, marca y categoria'
                : 'El catalogo aun no fue cargado'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
