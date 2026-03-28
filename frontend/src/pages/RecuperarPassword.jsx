import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { negocioService } from '../services/api'
import api from '../services/api'
import toast from 'react-hot-toast'
import { ArrowLeft, ChevronDown, Mail } from 'lucide-react'

export default function RecuperarPassword() {
  const [negocios, setNegocios] = useState([])
  const [negocioId, setNegocioId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  useEffect(() => {
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
      await api.post('/auth/recuperar', { email, negocio_id: parseInt(negocioId) })
      setEnviado(true)
    } catch {
      toast.error('Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        .rp-root {
          min-height: 100vh; background: #0a0a0a;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; font-family: 'DM Sans', sans-serif; position: relative;
        }
        .rp-root::before {
          content: ''; position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none;
        }
        .rp-wrap { position: relative; z-index: 1; width: 100%; max-width: 400px; }
        .rp-back { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.3); font-size: 0.78rem; text-decoration: none; margin-bottom: 2rem; transition: color 0.15s; }
        .rp-back:hover { color: rgba(255,255,255,0.6); }
        .rp-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 2rem; }
        .rp-title { font-family: 'DM Serif Display', serif; font-size: 1.6rem; color: #f5f5f5; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
        .rp-desc { font-size: 0.82rem; color: rgba(255,255,255,0.35); font-weight: 300; margin: 0 0 1.75rem; line-height: 1.5; }
        .rp-label { display: block; font-size: 0.7rem; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem; }
        .rp-field { margin-bottom: 1.25rem; }
        .rp-input {
          width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; padding: 0.75rem 1rem; color: #f5f5f5;
          font-size: 0.9rem; font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.2s; box-sizing: border-box; appearance: none;
        }
        .rp-input:focus { border-color: rgba(16,185,129,0.5); }
        .rp-input option { background: #1a1a1a; }
        .rp-input::placeholder { color: rgba(255,255,255,0.2); }
        .rp-select-wrap { position: relative; }
        .rp-select-wrap .rp-input { padding-right: 2.5rem; cursor: pointer; }
        .rp-chevron { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.25); pointer-events: none; }
        .rp-btn { width: 100%; padding: 0.85rem; background: #10b981; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; transition: background 0.2s, opacity 0.2s; }
        .rp-btn:hover:not(:disabled) { background: #059669; }
        .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rp-success { text-align: center; padding: 1rem 0; }
        .rp-success-icon { width: 56px; height: 56px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; }
        .rp-success-title { font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: #f5f5f5; margin: 0 0 0.75rem; }
        .rp-success-desc { font-size: 0.82rem; color: rgba(255,255,255,0.4); line-height: 1.6; margin: 0 0 1.5rem; }
        .rp-note { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 0.875rem 1rem; font-size: 0.75rem; color: rgba(255,255,255,0.3); line-height: 1.5; text-align: left; }
      `}</style>

      <div className="rp-root">
        <div className="rp-wrap">
          <Link to="/login" className="rp-back">
            <ArrowLeft size={14} /> Volver al login
          </Link>

          <div className="rp-card">
            {!enviado ? (
              <>
                <h1 className="rp-title">Recuperar contraseña</h1>
                <p className="rp-desc">
                  Ingresá el email registrado en tu negocio y te enviamos un link para restablecer la contraseña del administrador.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="rp-field">
                    <label className="rp-label">Negocio</label>
                    <div className="rp-select-wrap">
                      <select value={negocioId} onChange={e => setNegocioId(e.target.value)} className="rp-input" required>
                        <option value="">Seleccioná tu negocio...</option>
                        {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                      </select>
                      <ChevronDown size={14} className="rp-chevron" />
                    </div>
                  </div>

                  <div className="rp-field">
                    <label className="rp-label">Email del negocio</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      className="rp-input" placeholder="negocio@gmail.com" required autoFocus />
                  </div>

                  <button type="submit" disabled={loading} className="rp-btn">
                    {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                  </button>
                </form>
              </>
            ) : (
              <div className="rp-success">
                <div className="rp-success-icon">
                  <Mail size={24} color="#10b981" />
                </div>
                <h2 className="rp-success-title">Revisá tu email</h2>
                <p className="rp-success-desc">
                  Si el email está registrado en el sistema, vas a recibir un link para restablecer la contraseña en los próximos minutos.
                </p>
                <div className="rp-note">
                  <strong style={{color:'rgba(255,255,255,0.5)'}}>¿No llegó el email?</strong><br />
                  Revisá la carpeta de spam. Si sigue sin aparecer, contactá a la Municipalidad de Salta para que el administrador restablezca tu acceso manualmente.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
