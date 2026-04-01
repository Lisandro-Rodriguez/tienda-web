import { useState, useEffect, useCallback, useRef } from 'react'
import { reporteService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { BarChart2, Download, Filter, TrendingUp, RefreshCw, Calendar, X } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

const hoyISO = () => new Date().toISOString().split('T')[0]

const restarDias = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().split('T')[0]
}

const inicioSemana = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
  return d.toISOString().split('T')[0]
}

const inicioMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const QUICK_RANGES = [
  { label: 'Hoy',       desde: () => hoyISO(),      hasta: () => hoyISO() },
  { label: 'Esta semana', desde: inicioSemana,        hasta: () => hoyISO() },
  { label: 'Este mes',  desde: inicioMes,             hasta: () => hoyISO() },
  { label: '7 días',    desde: () => restarDias(7),   hasta: () => hoyISO() },
  { label: '30 días',   desde: () => restarDias(30),  hasta: () => hoyISO() },
  { label: 'Todo',      desde: () => '',              hasta: () => '' },
]

const ORDEN_OPCIONES = [
  { value: 'cantidad_desc',  label: 'Más vendidos (cantidad)' },
  { value: 'cantidad_asc',   label: 'Menos vendidos (cantidad)' },
  { value: 'ingresos_desc',  label: 'Mayor ingreso' },
  { value: 'ingresos_asc',   label: 'Menor ingreso' },
  { value: 'ganancia_desc',  label: 'Mayor ganancia' },
  { value: 'ganancia_asc',   label: 'Menor ganancia' },
]

// ── Autocomplete select ───────────────────────────────────────────────────────

function AutocompleteSelect({ opciones, value, onChange, placeholder }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  const filtradas = opciones.filter(o =>
    o.toLowerCase().includes(busqueda.toLowerCase())
  )

  const seleccionar = (v) => {
    onChange(v)
    setBusqueda('')
    setAbierto(false)
  }

  const limpiar = () => {
    onChange('')
    setBusqueda('')
    setAbierto(false)
  }

  // Cerrar al hacer click afuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input"
          style={{ fontSize: 13, paddingRight: value ? 28 : 12 }}
          placeholder={value || placeholder}
          value={busqueda}
          onFocus={() => setAbierto(true)}
          onChange={e => { setBusqueda(e.target.value); setAbierto(true) }}
        />
        {value && (
          <button
            type="button"
            onClick={limpiar}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', padding: 0, display: 'flex'
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {abierto && (
        <div style={{
          position: 'absolute', zIndex: 9999, width: '100%', top: '100%', marginTop: 4,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
        }}>
          <button
            type="button"
            onMouseDown={() => seleccionar('')}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)',
            }}
          >
            Todos
          </button>
          {filtradas.length === 0 ? (
            <p style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-3)' }}>Sin resultados</p>
          ) : filtradas.map(o => (
            <button
              key={o}
              type="button"
              onMouseDown={() => seleccionar(o)}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                background: value === o ? 'var(--surface)' : 'none',
                border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={e => e.currentTarget.style.background = value === o ? 'var(--surface)' : 'none'}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Exportar Excel ────────────────────────────────────────────────────────────

async function exportarExcel(datos, isAdmin, filtros) {
  try {
    const XLSX = await import('xlsx')
    const filas = datos.map((r, i) => {
      const base = {
        '#': i + 1,
        'Producto': r.nombre_producto,
        'Tipo': r.tipo,
        'Marca': r.marca,
        'Cantidad': r.cantidad_vendida,
        'Ingresos': r.ingresos,
      }
      if (isAdmin) base['Ganancia'] = r.ganancia
      return base
    })
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    XLSX.writeFile(wb, `reporte-productos-${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Excel descargado')
  } catch {
    toast.error('Error al generar Excel')
  }
}

// ── Exportar PDF ──────────────────────────────────────────────────────────────

async function exportarPDF(datos, isAdmin, negocioNombre, filtros) {
  try {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Reporte de Productos Vendidos', 14, 16)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text(negocioNombre || '', 14, 22)

    // Incluir rango de fechas en el PDF si está definido
    const rango = filtros.desde || filtros.hasta
      ? `Período: ${filtros.desde || '...'} → ${filtros.hasta || '...'}`
      : 'Período: Todo'
    doc.text(rango, 14, 27)
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 32)

    const head = [['#', 'Producto', 'Tipo', 'Marca', 'Cantidad', 'Ingresos']]
    if (isAdmin) head[0].push('Ganancia')

    const body = datos.map((r, i) => {
      const row = [i + 1, r.nombre_producto, r.tipo, r.marca, r.cantidad_vendida, fmt(r.ingresos)]
      if (isAdmin) row.push(fmt(r.ganancia))
      return row
    })

    autoTable(doc, {
      startY: 37,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    doc.save(`reporte-productos-${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success('PDF descargado')
  } catch {
    toast.error('Error al generar PDF')
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Reportes() {
  const { usuario, negocioNombre } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(false)
  const [quickActivo, setQuickActivo] = useState('7 días') // label del rango activo

  const [filtros, setFiltros] = useState({
    desde:  restarDias(7),
    hasta:  hoyISO(),
    tipo:   '',
    marca:  '',
    orden:  'cantidad_desc',
    limite: 50,
  })
  const [opciones, setOpciones] = useState({ tipos: [], marcas: [] })

  useEffect(() => {
    reporteService.filtros().then(r => setOpciones(r.data)).catch(() => {})
  }, [])

  const cargar = useCallback((f = filtros) => {
    setLoading(true)
    const params = {}
    if (f.desde)  params.desde  = f.desde
    if (f.hasta)  params.hasta  = f.hasta
    if (f.tipo)   params.tipo   = f.tipo
    if (f.marca)  params.marca  = f.marca
    params.orden  = f.orden
    params.limite = f.limite

    reporteService.productos(params)
      .then(r => setDatos(r.data))
      .catch(() => toast.error('Error al cargar el reporte'))
      .finally(() => setLoading(false))
  }, [filtros])

  useEffect(() => { cargar() }, [])

  const set = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  const aplicarQuick = (rango) => {
    const nuevos = { ...filtros, desde: rango.desde(), hasta: rango.hasta() }
    setFiltros(nuevos)
    setQuickActivo(rango.label)
    cargar(nuevos)
  }

  const aplicarFiltros = () => cargar(filtros)

  const totalCantidad = datos.reduce((s, r) => s + r.cantidad_vendida, 0)
  const totalIngresos = datos.reduce((s, r) => s + r.ingresos, 0)
  const totalGanancia = isAdmin ? datos.reduce((s, r) => s + (r.ganancia || 0), 0) : null

  return (
    <div className="page-wrap">

      {/* Header */}
      <div style={{
        marginBottom: '1.25rem',
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={22} style={{ color: 'var(--accent)' }} />
            Reporte de Productos
          </h1>
          <p className="page-sub">Ranking por ventas, ingresos{isAdmin ? ' y ganancia' : ''}</p>
        </div>
        {/* Botones exportar — en móvil van abajo, en desktop a la derecha */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Excel', fn: () => exportarExcel(datos, isAdmin, filtros) },
            { label: 'PDF',   fn: () => exportarPDF(datos, isAdmin, negocioNombre, filtros) },
          ].map(b => (
            <button key={b.label} onClick={b.fn} disabled={datos.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.5rem 0.875rem',
                background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: datos.length === 0 ? 'not-allowed' : 'pointer',
                color: 'var(--text-2)', opacity: datos.length === 0 ? 0.5 : 1,
              }}>
              <Download size={13} /> {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{
        background: '#fff', border: '1px solid var(--border)',
        borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem',
      }}>

        {/* Header filtros */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.875rem' }}>
          <Filter size={13} style={{ color: 'var(--text-3)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Filtros
          </span>
        </div>

        {/* Quick ranges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.875rem' }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginRight: 2 }}>
            <Calendar size={11} /> Período rápido:
          </span>
          {QUICK_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => aplicarQuick(r)}
              style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: quickActivo === r.label ? 'var(--navy)' : 'var(--surface)',
                color: quickActivo === r.label ? '#fff' : 'var(--text-2)',
                border: `1px solid ${quickActivo === r.label ? 'var(--navy)' : 'var(--border)'}`,
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Grid de filtros — en móvil 1 col, en desktop auto-fill */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Desde</label>
            <input type="date" className="input" style={{ fontSize: 13 }}
              value={filtros.desde}
              onChange={e => { set('desde', e.target.value); setQuickActivo('') }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Hasta</label>
            <input type="date" className="input" style={{ fontSize: 13 }}
              value={filtros.hasta}
              onChange={e => { set('hasta', e.target.value); setQuickActivo('') }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Tipo</label>
            <AutocompleteSelect
              opciones={opciones.tipos}
              value={filtros.tipo}
              onChange={v => set('tipo', v)}
              placeholder="Todos los tipos"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Marca</label>
            <AutocompleteSelect
              opciones={opciones.marcas}
              value={filtros.marca}
              onChange={v => set('marca', v)}
              placeholder="Todas las marcas"
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Ordenar por</label>
            <select className="input" style={{ fontSize: 13 }}
              value={filtros.orden} onChange={e => set('orden', e.target.value)}>
              {ORDEN_OPCIONES
                .filter(o => isAdmin || !o.value.includes('ganancia'))
                .map(o => <option key={o.value} value={o.value}>{o.label}</option>)
              }
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mostrar</label>
            <select className="input" style={{ fontSize: 13 }}
              value={filtros.limite} onChange={e => set('limite', parseInt(e.target.value))}>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Todos</option>
            </select>
          </div>

        </div>

        {/* Botón aplicar */}
        <div style={{ marginTop: '0.875rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={aplicarFiltros}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0.55rem 1.25rem',
              background: 'var(--navy)', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              width: '100%',
            }}>
            <RefreshCw size={13} /> Aplicar filtros
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      {datos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${isAdmin ? 3 : 2}, 1fr)`,
          gap: 10, marginBottom: '1.25rem',
        }}>
          {[
            { label: 'Unidades vendidas', value: totalCantidad.toLocaleString('es-AR'), color: 'var(--accent)' },
            { label: 'Ingresos totales',  value: fmt(totalIngresos),                    color: '#3b82f6' },
            ...(isAdmin ? [{ label: 'Ganancia total', value: fmt(totalGanancia), color: 'var(--green)' }] : []),
          ].map((c, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 12, padding: '0.875rem 1rem',
            }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.label}</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: c.color, letterSpacing: '-0.02em' }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla desktop */}
      <div className="hidden md:block" style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
              <th style={{ textAlign: 'right' }}>Ingresos</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>Ganancia</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '3rem' }}>
                <span className="loader" />
              </td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-3)' }}>
                Sin datos para los filtros seleccionados
              </td></tr>
            ) : datos.map((r, i) => (
              <tr key={r.producto_id ?? r.nombre_producto}>
                <td style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>{i + 1}</td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{r.nombre_producto}</td>
                <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.tipo}</td>
                <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.marca}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{r.cantidad_vendida.toLocaleString('es-AR')}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.ingresos)}</td>
                {isAdmin && (
                  <td style={{
                    textAlign: 'right', fontWeight: 800,
                    backgroundColor: '#f8fafc',
                    color: r.ganancia < 0 ? '#ef4444' : 'var(--green)',
                  }}>
                    {fmt(r.ganancia)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="md:hidden" style={{ flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div className="empty-state"><span className="loader" /></div>
        ) : datos.length === 0 ? (
          <div className="empty-state"><p>Sin datos para los filtros seleccionados</p></div>
        ) : datos.map((r, i) => (
          <div key={r.producto_id ?? r.nombre_producto} className="card"
            style={{ padding: '0.875rem', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: 'var(--navy)', borderRadius: 4,
                    padding: '1px 5px', flexShrink: 0,
                  }}>#{i + 1}</span>
                  <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.nombre_producto}
                  </p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.tipo} · {r.marca}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>{r.cantidad_vendida} uds.</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{fmt(r.ingresos)}</p>
                {isAdmin && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: r.ganancia < 0 ? '#ef4444' : 'var(--green)' }}>
                    {fmt(r.ganancia)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
