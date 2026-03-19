import { useState, useEffect } from 'react'
import { negocioService } from '../services/api'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '', mensaje_ticket: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    negocioService.miNegocio().then(r => setForm(r.data)).catch(() => {})
  }, [])

  const guardar = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await negocioService.actualizar(form)
      toast.success('Configuracion guardada')
    } catch { toast.error('Error al guardar') }
    finally { setLoading(false) }
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
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-extrabold text-gray-800 mb-6">Configuracion del Negocio</h1>
      <form onSubmit={guardar} className="card space-y-4">
        {campo('Nombre del negocio', 'nombre', 'Ej: Kiosco La Esquina')}
        {campo('Direccion', 'direccion', 'Ej: Av. San Martin 123')}
        {campo('CUIT', 'cuit', 'Ej: 20-12345678-9')}
        {campo('Telefono', 'telefono', 'Ej: 387-1234567')}
        {campo('Email', 'email', 'Ej: negocio@gmail.com', 'email')}
        <div>
          <label className="label">Mensaje en ticket</label>
          <textarea className="input h-20 resize-none" value={form.mensaje_ticket || ''}
            onChange={e => setForm(f => ({...f, mensaje_ticket: e.target.value}))}
            placeholder="Gracias por su compra!" />
        </div>
        <button type="submit" disabled={loading}
          className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {loading ? 'Guardando...' : 'Guardar configuracion'}
        </button>
      </form>
    </div>
  )
}
