import { useState, useEffect, useRef } from 'react'
import { negocioService, catalogoService } from '../services/api'
import toast from 'react-hot-toast'
import { Save, Upload, Trash2, Database, CheckCircle } from 'lucide-react'

export default function Configuracion() {
  const [form, setForm] = useState({
    nombre: '', direccion: '', cuit: '', telefono: '', email: '', mensaje_ticket: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [totalCatalogo, setTotalCatalogo] = useState(null)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState('')
  const archivoRef = useRef(null)

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

  const importarSEPA = async (e) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    if (!archivo.name.endsWith('.csv')) {
      toast.error('El archivo debe ser .csv')
      return
    }

    setImportando(true)
    setProgreso('Subiendo archivo...')
    try {
      setProgreso('Procesando catálogo SEPA (esto puede tardar 1-2 minutos)...')
      const res = await catalogoService.importar(archivo)
      const d = res.data
      setTotalCatalogo(d.total_en_catalogo)
      toast.success(`Catálogo importado: ${d.importados.toLocaleString()} productos nuevos`)
      setProgreso('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al importar')
      setProgreso('')
    } finally {
      setImportando(false)
      if (archivoRef.current) archivoRef.current.value = ''
    }
  }

  const limpiarCatalogo = async () => {
    if (!confirm(`¿Eliminar los ${totalCatalogo?.toLocaleString()} productos del catálogo? Esto no afecta tu inventario.`)) return
    try {
      const res = await catalogoService.limpiar()
      setTotalCatalogo(0)
      toast.success(`Catálogo limpiado (${res.data.eliminados.toLocaleString()} productos eliminados)`)
    } catch { toast.error('Error al limpiar') }
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

      {/* Catálogo SEPA */}
      <div className="card">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Database size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-700">Catálogo SEPA</h2>
            <p className="text-xs text-gray-400">Base de datos de productos argentina para autocompletar</p>
          </div>
        </div>

        {/* Estado actual */}
        <div className={`rounded-xl p-4 mt-4 mb-4 flex items-center gap-3 ${
          totalCatalogo > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
        }`}>
          {totalCatalogo > 0
            ? <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
            : <Database size={20} className="text-gray-400 flex-shrink-0" />
          }
          <div>
            <p className="font-semibold text-sm">
              {totalCatalogo === null ? 'Cargando...'
                : totalCatalogo === 0 ? 'Catálogo vacío'
                : `${totalCatalogo.toLocaleString()} productos cargados`}
            </p>
            <p className="text-xs text-gray-500">
              {totalCatalogo > 0
                ? 'Al escanear un código se autocompletarán nombre, marca y tipo'
                : 'Importá el archivo SEPA para activar el autocompletado'}
            </p>
          </div>
        </div>

        {/* Progreso */}
        {progreso && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm text-blue-700">{progreso}</p>
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700">¿Cómo obtener el archivo SEPA?</p>
          <p>1. Entrá a <span className="font-mono text-blue-600">sepa.produccion.gob.ar</span></p>
          <p>2. Descargá el archivo de precios en formato CSV</p>
          <p>3. Subilo acá con el botón de abajo</p>
          <p className="text-xs text-gray-400 pt-1">El catálogo es compartido entre todos los negocios del sistema y no afecta el inventario de nadie.</p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 flex-wrap">
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-colors
            ${importando ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Upload size={16} />
            {importando ? 'Importando...' : totalCatalogo > 0 ? 'Actualizar catálogo' : 'Importar catálogo SEPA'}
            <input ref={archivoRef} type="file" accept=".csv" className="hidden"
              onChange={importarSEPA} disabled={importando} />
          </label>

          {totalCatalogo > 0 && (
            <button onClick={limpiarCatalogo} disabled={importando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
              Limpiar catálogo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
