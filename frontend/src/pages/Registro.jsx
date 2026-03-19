import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { Store, ArrowLeft } from 'lucide-react'

export default function Registro() {
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    cuit: '',
    telefono: '',
    email: '',
    admin_username: '',
    admin_password: '',
    admin_password2: ''
  })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.admin_password !== form.admin_password2) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (form.admin_password.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setLoading(true)
    try {
      await negocioService.registrar({
        nombre: form.nombre,
        direccion: form.direccion,
        cuit: form.cuit,
        telefono: form.telefono,
        email: form.email,
        admin_username: form.admin_username,
        admin_password: form.admin_password,
      })
      toast.success('Negocio registrado. Ya podés iniciar sesión.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#1e5aa0] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur">
            <Store size={28} className="text-white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold">Registrar Negocio</h1>
          <p className="text-blue-200 text-sm mt-1">Creá tu cuenta gratis</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">

            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Datos del negocio</p>

            <div>
              <label className="label">Nombre del negocio *</label>
              <input className="input" value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Kiosco La Esquina" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Dirección</label>
                <input className="input" value={form.direccion}
                  onChange={e => set('direccion', e.target.value)}
                  placeholder="Av. San Martin 123" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                  placeholder="387-1234567" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CUIT</label>
                <input className="input" value={form.cuit}
                  onChange={e => set('cuit', e.target.value)}
                  placeholder="20-12345678-9" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="negocio@gmail.com" />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                Usuario administrador
              </p>

              <div>
                <label className="label">Nombre de usuario *</label>
                <input className="input" value={form.admin_username}
                  onChange={e => set('admin_username', e.target.value)}
                  placeholder="Ej: admin" required />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Contraseña *</label>
                  <input className="input" type="password" value={form.admin_password}
                    onChange={e => set('admin_password', e.target.value)}
                    placeholder="••••••••" required />
                </div>
                <div>
                  <label className="label">Repetir contraseña *</label>
                  <input className="input" type="password" value={form.admin_password2}
                    onChange={e => set('admin_password2', e.target.value)}
                    placeholder="••••••••" required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2">
              {loading ? 'Registrando...' : 'Crear negocio'}
            </button>
          </form>

          <div className="text-center mt-4">
            <Link to="/login" className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft size={14} /> Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
