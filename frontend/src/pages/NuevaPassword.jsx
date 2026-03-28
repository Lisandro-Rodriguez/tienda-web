import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

export default function NuevaPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [tokenValido, setTokenValido] = useState(null) // null=cargando, true/false
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!token) { setTokenValido(false); return }
    api.get(`/auth/verificar-token/${token}`)
      .then(() => setTokenValido(true))
      .catch(() => setTokenValido(false))
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmar) { toast.error('Las contraseñas no coinciden'); return }
    if (password.length < 4) { toast.error('Mínimo 4 caracteres'); return }
    setLoading(true)
    try {
      await api.post('/auth/resetear', { token, password_nuevo: password })
      setListo(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar contraseña')
    } finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        .np-root { min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; padding: 1.5rem; font-family: 'DM Sans', sans-serif; position: relative; }
        .np-root::before { content: ''; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
        .np-wrap { position: relative; z-index: 1; width: 100%; max-width: 400px; }
        .np-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2rem; }
        .np-title { font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: #f5f5f5; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
        .np-desc { font-size: 0.82rem; color: rgba(255,255,255,0.35); margin: 0 0 1.75rem; line-height: 1.5; }
        .np-label { display: block; font-size: 0.7rem; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
        .np-field { margin-bottom: 1.25rem; }
        .np-pass-wrap { position: relative; }
        .np-input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0.75rem 1rem; color: #f5f5f5; font-size: 0.9rem; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .np-input:focus { border-color: rgba(16,185,129,0.5); }
        .np-input::placeholder { color: rgba(255,255,255,0.2); }
        .np-pass-wrap .np-input { padding-right: 2.75rem; }
        .np-eye { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.25); padding: 0; display: flex; }
        .np-eye:hover { color: rgba(255,255,255,0.6); }
        .np-btn { width: 100%; padding: 0.85rem; background: #10b981; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s, opacity 0.2s; }
        .np-btn:hover:not(:disabled) { background: #059669; }
        .np-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .np-center { text-align: center; padding: 1rem 0; }
        .np-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
        .np-icon.ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); }
        .np-icon.err { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); }
        .np-big-title { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: #f5f5f5; margin: 0 0 0.75rem; }
        .np-big-desc { font-size: 0.82rem; color: rgba(255,255,255,0.4); line-height: 1.6; margin: 0 0 1.5rem; }
        .np-link { color: #10b981; font-size: 0.82rem; text-decoration: none; }
        .np-link:hover { text-decoration: underline; }
        .np-no-match { font-size: 0.72rem; color: #f87171; margin-top: 0.4rem; }
      `}</style>

      <div className="np-root">
        <div className="np-wrap">
          <div className="np-card">
            {tokenValido === null && (
              <div className="np-center">
                <p style={{color:'rgba(255,255,255,0.3)',fontSize:'0.85rem'}}>Verificando link...</p>
              </div>
            )}

            {tokenValido === false && (
              <div className="np-center">
                <div className="np-icon err"><XCircle size={24} color="#ef4444" /></div>
                <h2 className="np-big-title">Link inválido</h2>
                <p className="np-big-desc">Este link ya fue usado o expiró. Podés solicitar uno nuevo.</p>
                <Link to="/recuperar-password" className="np-link">Solicitar nuevo link</Link>
              </div>
            )}

            {tokenValido === true && !listo && (
              <>
                <h1 className="np-title">Nueva contraseña</h1>
                <p className="np-desc">Elegí una contraseña nueva para tu cuenta de administrador.</p>
                <form onSubmit={handleSubmit}>
                  <div className="np-field">
                    <label className="np-label">Nueva contraseña</label>
                    <div className="np-pass-wrap">
                      <input type={showPass ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="np-input" placeholder="Mínimo 4 caracteres" required autoFocus />
                      <button type="button" className="np-eye" onClick={() => setShowPass(!showPass)}>
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="np-field">
                    <label className="np-label">Confirmar contraseña</label>
                    <div className="np-pass-wrap">
                      <input type={showPass ? 'text' : 'password'} value={confirmar}
                        onChange={e => setConfirmar(e.target.value)}
                        className="np-input" placeholder="Repetí la contraseña" required />
                    </div>
                    {password && confirmar && password !== confirmar && (
                      <p className="np-no-match">Las contraseñas no coinciden</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className="np-btn">
                    {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              </>
            )}

            {listo && (
              <div className="np-center">
                <div className="np-icon ok"><CheckCircle size={24} color="#10b981" /></div>
                <h2 className="np-big-title">¡Contraseña actualizada!</h2>
                <p className="np-big-desc">Tu contraseña fue cambiada correctamente. Te redirigimos al login en unos segundos.</p>
                <Link to="/login" className="np-link">Ir al login ahora</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
