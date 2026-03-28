import { useState, useEffect } from 'react'
import { ventaService } from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RefreshCw, ArrowUpRight, AlertTriangle } from 'lucide-react'

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
const pct = (g, v) => v > 0 ? `${((g / v) * 100).toFixed(1)}%` : null

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

  .db-root {
    min-height: 100%;
    background: #f7f7f5;
    font-family: 'DM Sans', sans-serif;
    padding: 2rem 1.5rem;
  }

  @media (min-width: 768px) {
    .db-root { padding: 2.5rem 2.5rem; }
  }

  .db-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2.5rem;
  }

  .db-titulo {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    color: #111;
    letter-spacing: -0.03em;
    margin: 0 0 0.2rem;
    line-height: 1;
  }

  .db-sub {
    font-size: 0.78rem;
    color: #999;
    font-weight: 300;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
  }

  .db-refresh {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    color: #888;
    background: none;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 0.5rem 0.875rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .db-refresh:hover { border-color: #bbb; color: #444; background: #fff; }

  /* ── Bloque principal de ganancias ── */
  .db-hero {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1px;
    background: #e8e8e4;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 1px;
  }

  @media (min-width: 640px) {
    .db-hero { grid-template-columns: repeat(3, 1fr); }
  }

  .db-hero-cell {
    background: #fff;
    padding: 1.75rem 1.5rem;
    position: relative;
    transition: background 0.15s;
  }

  .db-hero-cell:hover { background: #fafaf9; }

  .db-hero-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 0.75rem;
  }

  .db-hero-valor {
    font-family: 'DM Serif Display', serif;
    font-size: 1.9rem;
    color: #111;
    letter-spacing: -0.03em;
    margin: 0 0 0.3rem;
    line-height: 1;
  }

  .db-hero-pct {
    font-size: 0.75rem;
    color: #10b981;
    font-weight: 500;
  }

  .db-hero-arrow {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    color: #ddd;
  }

  .db-hero-cell:first-child .db-hero-valor { color: #111; }

  /* ── Fila de métricas secundarias ── */
  .db-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #e8e8e4;
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    margin-top: 1.5rem;
  }

  .db-metric {
    background: #fff;
    padding: 1.25rem 1.5rem;
    cursor: default;
    transition: background 0.15s;
  }

  .db-metric.clickable { cursor: pointer; }
  .db-metric.clickable:hover { background: #fafaf9; }

  .db-metric-num {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    color: #111;
    letter-spacing: -0.03em;
    line-height: 1;
    margin: 0 0 0.3rem;
  }

  .db-metric-num.alerta { color: #ef4444; }

  .db-metric-label {
    font-size: 0.68rem;
    font-weight: 500;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }

  .db-metric-sub {
    font-size: 0.72rem;
    color: #bbb;
    margin: 0.2rem 0 0;
  }

  /* ── Gráfico ── */
  .db-chart-wrap {
    background: #fff;
    border-radius: 16px;
    padding: 1.75rem 1.5rem 1.25rem;
  }

  .db-chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .db-chart-titulo {
    font-family: 'DM Serif Display', serif;
    font-size: 1.1rem;
    color: #111;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .db-chart-leyenda {
    display: flex;
    gap: 1rem;
  }

  .db-leyenda-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.7rem;
    color: #999;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .db-leyenda-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }

  /* Tooltip custom */
  .db-tooltip {
    background: #111;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 0.9rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.78rem;
    color: #fff;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }

  /* Welcome */
  .db-welcome {
    max-width: 480px;
    margin: 4rem auto;
    text-align: center;
  }

  .db-welcome-emoji {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }

  .db-welcome-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.75rem;
    color: #111;
    margin: 0 0 0.5rem;
    letter-spacing: -0.02em;
  }

  .db-welcome-desc {
    color: #999;
    font-size: 0.85rem;
    margin: 0 0 2rem;
    font-weight: 300;
  }

  .db-step {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    text-align: left;
    padding: 1rem 1.25rem;
    background: #fff;
    border-radius: 12px;
    margin-bottom: 0.75rem;
    text-decoration: none;
    transition: box-shadow 0.15s;
    border: 1px solid #eee;
  }

  .db-step:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); border-color: #ddd; }

  .db-step-num {
    width: 28px;
    height: 28px;
    background: #111;
    color: #fff;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  .db-step-titulo {
    font-weight: 600;
    font-size: 0.875rem;
    color: #111;
    margin: 0 0 0.2rem;
  }

  .db-step-desc {
    font-size: 0.78rem;
    color: #999;
    margin: 0;
    font-weight: 300;
  }
`

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      <p style={{ margin: '0 0 4px', color: '#aaa', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color === '#111' ? '#fff' : p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { negocio_nombre } = useAuthStore()
  const navigate = useNavigate()

  const cargar = async () => {
    setLoading(true)
    try {
      const res = await ventaService.dashboard()
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f7f7f5' }}>
      <div style={{ width: 36, height: 36, border: '2px solid #e0e0e0', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const esNuevo = !data?.total_productos && !data?.hoy_ventas
  if (esNuevo) return (
    <>
      <style>{STYLES}</style>
      <div className="db-root">
        <div className="db-welcome">
          <span className="db-welcome-emoji">🏪</span>
          <h1 className="db-welcome-title">¡Bienvenido a tu tienda!</h1>
          <p className="db-welcome-desc">Tu sistema está listo. Seguí estos pasos para empezar.</p>
          {[
            { num: '1', titulo: 'Cargá tus productos', desc: 'Andá a Inventario y agregá tus productos con precio y stock', link: '/inventario' },
            { num: '2', titulo: 'Registrá tus clientes', desc: 'En Fiado podés agregar clientes para ventas a cuenta', link: '/clientes' },
            { num: '3', titulo: 'Empezá a vender', desc: 'Usá la Caja para registrar ventas escaneando códigos', link: '/ventas' },
          ].map(p => (
            <a key={p.num} href={p.link} className="db-step">
              <div className="db-step-num">{p.num}</div>
              <div>
                <p className="db-step-titulo">{p.titulo}</p>
                <p className="db-step-desc">{p.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  )

  const chartData = [
    { nombre: 'Hoy', ventas: data.hoy_ventas, ganancia: data.hoy_ganancia },
    { nombre: '7 días', ventas: data.semana_ventas, ganancia: data.semana_ganancia },
    { nombre: '30 días', ventas: data.mes_ventas, ganancia: data.mes_ganancia },
  ]

  return (
    <>
      <style>{STYLES}</style>
      <div className="db-root">

        {/* Header */}
        <div className="db-header">
          <div>
            <h1 className="db-titulo">{negocio_nombre || 'Dashboard'}</h1>
            <p className="db-sub">Resumen de tu negocio</p>
          </div>
          <button onClick={cargar} className="db-refresh">
            <RefreshCw size={13} />
            Actualizar
          </button>
        </div>

        {/* Ganancias hero */}
        <div className="db-hero">
          {[
            { label: 'Ganancia hoy', value: fmt(data.hoy_ganancia), pct: pct(data.hoy_ganancia, data.hoy_ventas) },
            { label: 'Ganancia semana', value: fmt(data.semana_ganancia), pct: pct(data.semana_ganancia, data.semana_ventas) },
            { label: 'Ganancia 30 días', value: fmt(data.mes_ganancia), pct: pct(data.mes_ganancia, data.mes_ventas) },
          ].map((c, i) => (
            <div key={i} className="db-hero-cell">
              <ArrowUpRight size={14} className="db-hero-arrow" />
              <p className="db-hero-label">{c.label}</p>
              <p className="db-hero-valor">{c.value}</p>
              {c.pct && <p className="db-hero-pct">{c.pct} margen</p>}
            </div>
          ))}
        </div>

        {/* Métricas secundarias */}
        <div className="db-metrics">
          <div className="db-metric">
            <p className="db-metric-num">{data.total_productos || 0}</p>
            <p className="db-metric-label">Productos</p>
            <p className="db-metric-sub">en inventario</p>
          </div>
          <div
            className={`db-metric ${data.productos_bajo_stock > 0 ? 'clickable' : ''}`}
            onClick={data.productos_bajo_stock > 0 ? () => navigate('/inventario?bajo_stock=true') : undefined}
          >
            <p className={`db-metric-num ${data.productos_bajo_stock > 0 ? 'alerta' : ''}`}>
              {data.productos_bajo_stock || 0}
            </p>
            <p className="db-metric-label">
              {data.productos_bajo_stock > 0 ? '⚠ Stock bajo' : 'Stock bajo'}
            </p>
            <p className="db-metric-sub">
              {data.productos_bajo_stock > 0 ? 'Clic para ver' : 'Todo OK'}
            </p>
          </div>
          <div className="db-metric clickable" onClick={() => navigate('/clientes')}>
            <p className="db-metric-num">{data.clientes_con_deuda || 0}</p>
            <p className="db-metric-label">Con deuda</p>
            <p className="db-metric-sub">de {data.total_clientes || 0} clientes</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="db-chart-wrap">
          <div className="db-chart-header">
            <h2 className="db-chart-titulo">Ventas vs Ganancia</h2>
            <div className="db-chart-leyenda">
              <span className="db-leyenda-item">
                <span className="db-leyenda-dot" style={{ background: '#111' }} />
                Ventas
              </span>
              <span className="db-leyenda-item">
                <span className="db-leyenda-dot" style={{ background: '#10b981' }} />
                Ganancia
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barCategoryGap="35%" barGap={4}>
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#ccc', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="ventas" name="Ventas" fill="#111" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganancia" name="Ganancia" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </>
  )
}
