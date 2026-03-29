import { useState, useEffect } from 'react'

import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authService, negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ChevronDown, HelpCircle } from 'lucide-react'

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
      const data = Array.isArray(r.data) ? r.data : []
      setNegocios(data)
      if (data.length === 1) setNegocioId(data[0].id)
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

        .login-root {
          min-height: 100vh;
          background-color: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .login-root::after {
          content: '';
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-wrap { position: relative; z-index: 1; width: 100%; max-width: 400px; }
        .login-header { text-align: center; margin-bottom: 2.5rem; }
        .login-logo {
          display: inline-flex; align-items: center; justify-content: center;
          width: 48px; height: 48px;
          border: 1px solid rgba(16,185,129,0.4); border-radius: 12px;
          margin-bottom: 1.25rem; background: rgba(16,185,129,0.08);
        }
        .login-logo svg { width: 22px; height: 22px; stroke: #10b981; }
        .login-title { font-family: 'DM Serif Display', serif; font-size: 2rem; color: #f5f5f5; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
        .login-sub { font-size: 0.8rem; color: rgba(255,255,255,0.35); font-weight: 300; letter-spacing: 0.08em; text-transform: uppercase; }
        .login-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2rem; backdrop-filter: blur(12px); }
        .login-label { display: block; font-size: 0.7rem; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
        .login-field { margin-bottom: 1.25rem; }
        .login-input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 0.75rem 1rem; color: #f5f5f5;
          font-size: 0.9rem; font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.2s, background 0.2s; box-sizing: border-box;
          appearance: none; -webkit-appearance: none;
        }
        .login-input:focus { border-color: rgba(16,185,129,0.5); background: rgba(16,185,129,0.05); }
        .login-input option { background: #1a1a1a; color: #f5f5f5; }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-pass-wrap { position: relative; }
        .login-pass-wrap .login-input { padding-right: 2.75rem; }
        .login-eye { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.25); padding: 0; display: flex; align-items: center; transition: color 0.2s; }
        .login-eye:hover { color: rgba(255,255,255,0.6); }
        .login-select-wrap { position: relative; }
        .login-select-wrap .login-input { padding-right: 2.5rem; cursor: pointer; }
        .login-chevron { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.25); pointer-events: none; }
        .login-btn { width: 100%; padding: 0.85rem; background: #10b981; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; margin-top: 0.5rem; transition: background 0.2s, transform 0.1s, opacity 0.2s; letter-spacing: 0.02em; }
        .login-btn:hover:not(:disabled) { background: #059669; }
        .login-btn:active:not(:disabled) { transform: scale(0.99); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .login-footer { text-align: center; margin-top: 1.5rem; font-size: 0.78rem; color: rgba(255,255,255,0.25); }
        .login-footer a { color: #10b981; font-weight: 500; text-decoration: none; }
        .login-footer a:hover { text-decoration: underline; }
        .login-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 1.25rem 0; }
        .login-links { display: flex; justify-content: space-between; align-items: center; }
        .login-link-small { font-size: 0.72rem; color: rgba(255,255,255,0.3); text-decoration: none; display: flex; align-items: center; gap: 4px; transition: color 0.15s; }
        .login-link-small:hover { color: rgba(255,255,255,0.6); }
        .login-link-recover { font-size: 0.72rem; color: rgba(16,185,129,0.7); text-decoration: none; transition: color 0.15s; }
        .login-link-recover:hover { color: #10b981; }
      `}</style>

      <div className="login-root">
        <div className="login-wrap">
          <div className="login-header">
            <div className="login-logo">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l1-5h16l1 5" />
                <path d="M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" />
                <path d="M9 9v4a3 3 0 006 0V9" />
              </svg>
            </div>
            <h1 className="login-title">Sistema Tienda</h1>
            <p className="login-sub">Gestión · Ventas · Inventario</p>
          </div>

          <div className="login-card">
            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">Negocio</label>
                <div className="login-select-wrap">
                  <select value={negocioId} onChange={e => setNegocioId(e.target.value)} className="login-input" required>
                    <option value="">Seleccioná tu negocio...</option>
                    {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                  <ChevronDown size={14} className="login-chevron" />
                </div>
              </div>

              <div className="login-field">
                <label className="login-label">Usuario</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="login-input" placeholder="Tu usuario" required autoFocus />
              </div>

              <div className="login-field">
                <label className="login-label">Contraseña</label>
                <div className="login-pass-wrap">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="login-input" placeholder="••••••••" required />
                  <button type="button" className="login-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </form>

            <div className="login-divider" />

            <div className="login-links">
              <Link to="/recuperar-password" className="login-link-recover">
                ¿Olvidaste tu contraseña?
              </Link>
              {/* Lo que tenías antes seguro era un <span>, un <button> o un <a> vacío */}
              <Link to="/ayuda" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                Ayuda
              </Link>
            </div>

            <div className="login-divider" />

            <p className="login-footer">
              ¿Negocio nuevo?{' '}
              <a href="/registro">Registrate acá</a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
