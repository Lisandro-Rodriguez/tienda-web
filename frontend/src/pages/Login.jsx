import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { Store, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [negocios, setNegocios] = useState([])
  const [negocioId, setNegocioId] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (token) navigate('/')
    negocioService.listar().then(r => {
      setNegocios(r.data)
      if (r.data.length === 1) setNegocioId(r.data[0].id)
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!negocioId) { toast.error('Seleccioná un negocio'); return }
    setLoading(true)
    try {
      const res = await authService.login(username, password, parseInt(negocioId))
      login(res.data.access_token, {
        username: res.data.username,
        rol: res.data.rol
      }, res.data.negocio_nombre)
      toast.success(`Bienvenido, ${res.data.username}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] to-[#1e5aa0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-white text-3xl font-extrabold">Sistema Tienda</h1>
          <p className="text-blue-200 text-sm mt-1">Gestión de ventas e inventario</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Negocio */}
            <div>
              <label className="label">Negocio</label>
              <select
                value={negocioId}
                onChange={e => setNegocioId(e.target.value)}
                className="input"
                required
              >
                <option value="">Seleccioná tu negocio...</option>
                {negocios.map(n => (
                  <option key={n.id} value={n.id}>{n.nombre}</option>
                ))}
              </select>
            </div>

            {/* Usuario */}
            <div>
              <label className="label">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="input"
                placeholder="Tu usuario"
                required
                autoFocus
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Negocio nuevo?{' '}
            <a href="/registro" className="text-blue-600 font-semibold hover:underline">
              Registrate acá
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
