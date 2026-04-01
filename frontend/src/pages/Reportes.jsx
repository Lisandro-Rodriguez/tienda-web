import { useState, useEffect, useCallback } from 'react'
import { reporteService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { BarChart2, Download, Filter, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`

const ORDEN_OPCIONES = [
  { value: 'cantidad_desc',  label: 'Más vendidos (cantidad)' },
  { value: 'cantidad_asc',   label: 'Menos vendidos (cantidad)' },
  { value: 'ingresos_desc',  label: 'Mayor ingreso' },
  { value: 'ingresos_asc',   label: 'Menor ingreso' },
  { value: 'ganancia_desc',  label: 'Mayor ganancia' },
  { value: 'ganancia_asc',   label: 'Menor ganancia' },
]

// ── Exportar Excel ────────────────────────────────────────────────────────────

async function exportarExcel(datos, isAdmin, filtros) {
  try {
    const XLSX = await import('xlsx')
    const filas = datos.map((r, i) => {
      const base = {
        '#':          i + 1,
        'Producto':   r.nombre_producto,
        'Tipo':       r.tipo,
        'Marca':      r.marca,
        'Cantidad':   r.cantidad_vendida,
        'Ingresos':   r.ingresos,
      }
      if (isAdmin) base['Ganancia'] = r.ganancia
      return base
    })
    const ws = XLSX.utils.json_to_sheet(filas)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte')
    const nombre = `reporte-productos-${new Date().toISOString().slice(0,10)}.xlsx`
    XLSX.writeFile(wb, nombre)
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
    doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 14, 27)

    const head = [['#', 'Producto', 'Tipo', 'Marca', 'Cantidad', 'Ingresos']]
    if (isAdmin) head[0].push('Ganancia')

    const body = datos.map((r, i) => {
      const row = [i + 1, r.nombre_producto, r.tipo, r.marca, r.cantidad_vendida, fmt(r.ingresos)]
      if (isAdmin) row.push(fmt(r.ganancia))
      return row
    })

    autoTable(doc, {
      startY: 32,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    doc.save(`reporte-productos-${new Date().toISOString().slice(0,10)}.pdf`)
    toast.success('PDF descargado')
  } catch {
    toast.error('Error al generar PDF')
  }
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Reportes() {
  const { usuario, negocioNombre } = useAuthStore()
  const isAdmin = usuario?.rol === 'ADMIN'

  const [datos, setDatos]       = useState([])
  const [loading, setLoading]   = useState(false)
  // Calcular fechas por defecto (hoy y hace 7 días)
  const hoy = new Date();
  const haceUnaSemana = new Date();
  haceUnaSemana.setDate(hoy.getDate() - 7);
  
  // Formatear a YYYY-MM-DD para el input type="date"
  const hoyStr = hoy.toISOString().split('T')[0];
  const haceUnaSemanaStr = haceUnaSemana.toISOString().split('T')[0];

  const [filtros, setFiltros]   = useState({
    desde:  haceUnaSemanaStr,
    hasta:  hoyStr,
    tipo:   '',
    marca:  '',
    orden:  'cantidad_desc',
    limite: 50,
  })
  const [opciones, setOpciones] = useState({ tipos: [], marcas: [] })

  // Cargar filtros disponibles al montar
  useEffect(() => {
    reporteService.filtros()
      .then(r => setOpciones(r.data))
      .catch(() => {})
  }, [])

  const cargar = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filtros.desde)  params.desde  = filtros.desde
    if (filtros.hasta)  params.hasta  = filtros.hasta
    if (filtros.tipo)   params.tipo   = filtros.tipo
    if (filtros.marca)  params.marca  = filtros.marca
    params.orden  = filtros.orden
    params.limite = filtros.limite

    reporteService.productos(params)
      .then(r => setDatos(r.data))
      .catch(() => toast.error('Error al cargar el reporte'))
      .finally(() => setLoading(false))
  }, [filtros])

  useEffect(() => { cargar() }, []) // carga inicial sin filtros

  const set = (k, v) => setFiltros(f => ({ ...f, [k]: v }))

  const totalCantidad  = datos.reduce((s, r) => s + r.cantidad_vendida, 0)
  const totalIngresos  = datos.reduce((s, r) => s + r.ingresos, 0)
  const totalGanancia  = isAdmin ? datos.reduce((s, r) => s + (r.ganancia || 0), 0) : null

  return (
    <div className="page-wrap">

      {/* Header */}
      <div style={{marginBottom:'1.5rem',display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div>
          <h1 className="page-title" style={{display:'flex',alignItems:'center',gap:8}}>
            <BarChart2 size={22} style={{color:'var(--accent)'}} />
            Reporte de Productos
          </h1>
          <p className="page-sub">Ranking de productos por ventas, ingresos{isAdmin ? ' y ganancia' : ''}</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={() => exportarExcel(datos, isAdmin, filtros)}
            disabled={datos.length === 0}
            style={{display:'flex',alignItems:'center',gap:6,padding:'0.55rem 1rem',
              background:'#fff',border:'1px solid var(--border)',borderRadius:8,
              fontSize:13,fontWeight:600,cursor: datos.length === 0 ? 'not-allowed' : 'pointer',
              color:'var(--text-2)', opacity: datos.length === 0 ? 0.5 : 1}}>
            <Download size={14} /> Excel
          </button>
          <button onClick={() => exportarPDF(datos, isAdmin, negocioNombre, filtros)}
            disabled={datos.length === 0}
            style={{display:'flex',alignItems:'center',gap:6,padding:'0.55rem 1rem',
              background:'#fff',border:'1px solid var(--border)',borderRadius:8,
              fontSize:13,fontWeight:600,cursor: datos.length === 0 ? 'not-allowed' : 'pointer',
              color:'var(--text-2)', opacity: datos.length === 0 ? 0.5 : 1}}>
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,
        padding:'1rem 1.25rem',marginBottom:'1.25rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:'0.75rem'}}>
          <Filter size={14} style={{color:'var(--text-3)'}} />
          <span style={{fontSize:12,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>Filtros</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Desde</label>
            <input type="date" className="input" style={{fontSize:13}}
              value={filtros.desde} onChange={e => set('desde', e.target.value)} />
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Hasta</label>
            <input type="date" className="input" style={{fontSize:13}}
              value={filtros.hasta} onChange={e => set('hasta', e.target.value)} />
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Tipo</label>
            <select className="input" style={{fontSize:13}}
              value={filtros.tipo} onChange={e => set('tipo', e.target.value)}>
              <option value="">Todos</option>
              {opciones.tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Marca</label>
            <select className="input" style={{fontSize:13}}
              value={filtros.marca} onChange={e => set('marca', e.target.value)}>
              <option value="">Todas</option>
              {opciones.marcas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Ordenar por</label>
            <select className="input" style={{fontSize:13}}
              value={filtros.orden} onChange={e => set('orden', e.target.value)}>
              {ORDEN_OPCIONES
                .filter(o => isAdmin || !o.value.includes('ganancia'))
                .map(o => <option key={o.value} value={o.value}>{o.label}</option>)
              }
            </select>
          </div>

          <div>
            <label style={{fontSize:11,fontWeight:500,color:'var(--text-3)',display:'block',marginBottom:4}}>Mostrar</label>
            <select className="input" style={{fontSize:13}}
              value={filtros.limite} onChange={e => set('limite', parseInt(e.target.value))}>
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
              <option value={200}>Todos</option>
            </select>
          </div>

        </div>
        <div style={{marginTop:'0.875rem',display:'flex',justifyContent:'flex-end'}}>
          <button onClick={cargar}
            style={{display:'flex',alignItems:'center',gap:6,padding:'0.55rem 1.25rem',
              background:'var(--navy)',color:'#fff',border:'none',borderRadius:8,
              fontSize:13,fontWeight:600,cursor:'pointer'}}>
            <RefreshCw size={13} /> Aplicar filtros
          </button>
        </div>
      </div>

      {/* Resumen */}
      {datos.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:`repeat(${isAdmin ? 3 : 2},1fr)`,gap:10,marginBottom:'1.25rem'}}>
          {[
            { label: 'Unidades vendidas', value: totalCantidad.toLocaleString('es-AR'), icon: TrendingUp, color: 'var(--accent)' },
            { label: 'Ingresos totales',  value: fmt(totalIngresos), icon: BarChart2, color: '#3b82f6' },
            ...(isAdmin ? [{ label: 'Ganancia total', value: fmt(totalGanancia), icon: TrendingUp, color: 'var(--green)' }] : []),
          ].map((c, i) => (
            <div key={i} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:'1rem 1.25rem'}}>
              <p style={{fontSize:11,fontWeight:500,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:4}}>{c.label}</p>
              <p style={{fontSize:'1.5rem',fontWeight:700,color:c.color,letterSpacing:'-0.02em'}}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla desktop */}
      <div className="hidden md:block" style={{background:'#fff',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden'}}>
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Marca</th>
              <th style={{textAlign:'right'}}>Cantidad</th>
              <th style={{textAlign:'right'}}>Ingresos</th>
              {isAdmin && <th style={{textAlign:'right'}}>Ganancia</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} style={{textAlign:'center',padding:'3rem'}}>
                <span className="loader" />
              </td></tr>
            ) : datos.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} style={{textAlign:'center',padding:'3rem',color:'var(--text-3)'}}>
                Sin datos para los filtros seleccionados
              </td></tr>
            ) : datos.map((r, i) => (
              <tr key={r.producto_id ?? r.nombre_producto}>
                <td style={{color:'var(--text-3)',fontSize:12,fontWeight:600}}>{i + 1}</td>
                <td style={{fontWeight:600,fontSize:13}}>{r.nombre_producto}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{r.tipo}</td>
                <td style={{fontSize:12,color:'var(--text-2)'}}>{r.marca}</td>
                <td style={{textAlign:'right',fontWeight:700,fontSize:14}}>{r.cantidad_vendida.toLocaleString('es-AR')}</td>
                <td style={{textAlign:'right',fontWeight:600,color:'var(--accent)'}}>{fmt(r.ingresos)}</td>
                {isAdmin && (
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 800, /* 1. Hacemos el texto más gordito/negrita para resaltarlo */
                    backgroundColor: '#f8fafc', /* 2. Le ponemos un fondo gris ultra clarito a la celda */
                    color: r.ganancia < 0 ? '#ef4444' : 'var(--green)' /* 3. Magia: Si es menor a 0 es rojo, si no, verde */
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
      <div className="md:hidden" style={{flexDirection:'column',gap:8}}>
        {loading ? (
          <div className="empty-state"><span className="loader" /></div>
        ) : datos.length === 0 ? (
          <div className="empty-state"><p>Sin datos para los filtros seleccionados</p></div>
        ) : datos.map((r, i) => (
          <div key={r.producto_id ?? r.nombre_producto} className="card" style={{padding:'1rem',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--text-3)',minWidth:20}}>#{i+1}</span>
                  <p style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{r.nombre_producto}</p>
                </div>
                <p style={{fontSize:12,color:'var(--text-3)'}}>{r.tipo} · {r.marca}</p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontWeight:700,fontSize:16,color:'var(--accent)'}}>{r.cantidad_vendida} uds.</p>
                <p style={{fontSize:12,color:'var(--text-2)'}}>{fmt(r.ingresos)}</p>
                {isAdmin && (
                  <p style={{
                    fontSize:12,
                    fontWeight:700,
                    color: r.ganancia < 0 ? '#ef4444' : 'var(--green)'
                  }}>
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
