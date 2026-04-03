import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, Wrench, AlertCircle, Play, Monitor, Smartphone } from 'lucide-react'

// ── Datos de contenido (Idénticos a Ayuda.jsx) ────────────────────────────────

const SECCIONES = [
  {
    id: 'primeros-pasos',
    icono: BookOpen,
    color: '#10b981',
    colorBg: 'rgba(16,185,129,0.08)',
    titulo: 'Primeros Pasos',
    subtitulo: 'Para empezar desde cero',
    items: [
      {
        titulo: '¿Cómo cargo mis productos rápidamente?',
        pasos: [
          'Andá a la sección **Inventario** en el menú lateral.',
          'Hacé clic en **"+ Producto"**.',
          'Si tenés un lector de código de barras, **pistoleá el producto** — el sistema busca automáticamente en el catálogo SEPA y completa nombre, marca y categoría.',
          'Si no lo encuentra, escribí el nombre a mano. Ponés el precio de costo, el margen de ganancia y el stock inicial.',
          'Guardás y listo. El producto ya aparece en la caja.',
        ],
        gifDesktop: '/gifs/cargar-producto-desktop.gif',
        gifMovil: '/gifs/cargar-producto-movil.gif',
        nota: 'El catálogo SEPA tiene más de 36.000 productos de consumo masivo. Si el código no aparece, no te preocupes — simplemente escribí el nombre vos.',
      },
      {
        titulo: '¿Cómo registro mi primera venta?',
        pasos: [
          'Andá a **Caja** en el menú.',
          'Escribí el nombre del producto o **pistoleá el código de barras** para agregarlo al carrito.',
          'Si vendés varios, repetís el paso. El sistema suma todo automáticamente.',
          'Elegís el método de pago: Efectivo, Tarjeta, Transferencia o Fiado.',
          'Si es efectivo, podés ingresar cuánto te da el cliente y el sistema calcula el vuelto.',
          'Tocás **"Confirmar venta"** y listo. La venta queda registrada y el stock se descuenta solo.',
        ],
        gifDesktop: '/gifs/primera-venta-desktop.gif',
        gifMovil: '/gifs/primera-venta-movil.gif',
      },
      {
        titulo: '¿Cómo funciona el módulo de Clientes (Fiado)?',
        pasos: [
          'Andá a **Fiado** en el menú y tocás **"+ Cliente"** para agregar a la persona.',
          'Cuando esa persona compre, en la Caja elegís método de pago **"Fiado"** y seleccionás su nombre.',
          'La deuda se suma automáticamente a su cuenta.',
          'Cuando venga a pagar, entrás a Fiado, buscás al cliente y tocás **"Registrar abono"**.',
          'Ingresás el monto que paga y confirmás. La deuda se reduce automáticamente.',
        ],
        gifDesktop: '/gifs/fiado-desktop.gif',
        gifMovil: '/gifs/fiado-movil.gif',
        nota: 'Podés ver el historial completo de pagos y deudas de cada cliente tocando su nombre.',
      },
    ],
  },
  {
    id: 'tareas-frecuentes',
    icono: Wrench,
    color: '#3b82f6',
    colorBg: 'rgba(59,130,246,0.08)',
    titulo: 'Tareas Frecuentes',
    subtitulo: 'Corrección de errores comunes',
    items: [
      {
        titulo: '"Me equivoqué al cobrar, ¿cómo anulo una venta?"',
        pasos: [
          'Andá a **Historial** en el menú.',
          'Buscá la venta que querés anular (podés filtrar por "Hoy").',
          'Tocás la fila para ver el detalle completo.',
          'Usá el botón **"Anular venta"** — el sistema devuelve el stock de los productos vendidos.',
        ],
        gifDesktop: '/gifs/anular-venta-desktop.gif',
        gifMovil: '/gifs/anular-venta-movil.gif',
        nota: 'Solo los administradores pueden anular ventas. Si sos cajero, pedile al encargado.',
      },
      {
        titulo: '"El código de barras no trae el nombre del producto"',
        pasos: [
          'Esto es normal — el catálogo SEPA tiene más de 36.000 productos, pero no tiene absolutamente todos.',
          'Si el sistema no encuentra el código, simplemente **escribí el nombre del producto a mano** en el campo de búsqueda.',
          'Al guardar el producto con ese código, la próxima vez que lo escanees ya va a aparecer automáticamente.',
        ],
        nota: 'No hay que preocuparse — la mayoría de los productos de consumo masivo sí están en el catálogo.',
      },
      {
        titulo: '"¿Cómo actualizo los precios si hay inflación?"',
        pasos: [
          'Andá a **Inventario**.',
          'Buscá el producto que querés actualizar y tocás el ícono de editar (lápiz).',
          'Cambiás el **precio de costo** y el sistema recalcula el precio de venta automáticamente según tu margen.',
          'O podés editar el **precio de venta** directamente si preferís.',
          'Guardás los cambios.',
        ],
        gifDesktop: '/gifs/actualizar-precio-desktop.gif',
        gifMovil: '/gifs/actualizar-precio-movil.gif',
        nota: 'Si tenés muchos productos para actualizar, escribinos para implementar una actualización masiva por categoría.',
      },
    ],
  },
  {
    id: 'problemas-tecnicos',
    icono: AlertCircle,
    color: '#f59e0b',
    colorBg: 'rgba(245,158,11,0.08)',
    titulo: 'Problemas Técnicos',
    subtitulo: 'Soluciones antes de llamar',
    items: [
      {
        titulo: '"El lector de códigos no escribe nada"',
        pasos: [
          'El lector de barras funciona como un **teclado** — escribe el código automáticamente en el campo de búsqueda.',
          'Primero hacé **clic dentro del campo de búsqueda** de Caja o Inventario para que el cursor esté ahí.',
          'Después pistoleá el producto. Si el cursor no está en el campo, el código "se pierde".',
          'Si sigue sin funcionar, probá conectar y desconectar el lector USB.',
        ],
        nota: 'En celular, el escáner de cámara se activa tocando el ícono de cámara al lado del campo de búsqueda.',
      },
      {
        titulo: '"Me olvidé la contraseña de administrador"',
        pasos: [
          'En la pantalla de login, tocás **"¿Olvidaste tu contraseña?"**.',
          'Seleccionás tu negocio e ingresás el email que registraste cuando creaste la cuenta.',
          'Te llega un email con un link para crear una nueva contraseña. El link dura 2 horas.',
          'Si no tenés acceso al email o no recordás cuál pusiste, contactá a la Municipalidad de Salta para que restablezcan el acceso manualmente.',
        ],
        nota: 'Si sos cajero y olvidaste tu contraseña, pedile al administrador del negocio que te cree un usuario nuevo desde Configuración.',
      },
      {
        titulo: '"La página se quedó cargando / se cortó el internet"',
        pasos: [
          'Este sistema funciona en la nube — necesitás **conexión a internet** para que las ventas se guarden.',
          'Si se cortó el internet en medio de una venta, **no confirmés** hasta que vuelva la conexión.',
          'Si la página se colgó, recargala con F5 (o deslizando hacia abajo en celular).',
          'Tus datos no se pierden — todo lo que confirmaste antes de cortarse el internet ya quedó guardado.',
        ],
        nota: 'Para evitar problemas, se recomienda tener una conexión de datos móviles como respaldo si el WiFi del local falla.',
      },
    ],
  },
]

// ── Componente GIF placeholder ────────────────────────────────────────────────

function GifPlaceholder({ src, tipo }) {
  const [error, setError] = useState(false)
  const icono = tipo === 'desktop' ? <Monitor size={18} /> : <Smartphone size={16} />
  const label = tipo === 'desktop' ? 'Computadora' : 'Celular'

  if (error || !src) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
        borderRadius: 10, padding: '1.5rem', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        minHeight: 80,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          {icono} <span>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.15)', fontSize: 11 }}>
          <Play size={12} />
          <span>GIF de demostración próximamente</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        {icono} {label}
      </div>
      <img src={src} alt={`Demo ${label}`} style={{ width: '100%', height: 'auto', display: 'block' }} onError={() => setError(true)} />
    </div>
  )
}

// ── Item de ayuda expandible detallado ────────────────────────────────────────

function ItemAyuda({ item, accentColor }) {
  const [abierto, setAbierto] = useState(false)

  // Función para renderizar texto en negrita
  const renderTexto = (texto) => {
    const partes = texto.split(/\*\*(.*?)\*\*/g)
    return partes.map((p, i) =>
      i % 2 === 1
        ? <strong key={i} style={{ color: '#fff', fontWeight: 600 }}>{p}</strong>
        : p
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      <button
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e5e5e5', lineHeight: 1.4 }}>
          {item.titulo}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {abierto && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Pasos numerados */}
          <ol style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {item.pasos.map((paso, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  minWidth: 22, height: 22, borderRadius: 6,
                  background: accentColor, color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>
                  {renderTexto(paso)}
                </span>
              </li>
            ))}
          </ol>

          {/* GIFs correspondientes */}
          {(item.gifDesktop || item.gifMovil) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              {item.gifDesktop && <GifPlaceholder src={item.gifDesktop} tipo="desktop" />}
              {item.gifMovil && <GifPlaceholder src={item.gifMovil} tipo="movil" />}
            </div>
          )}

          {/* Nota destacada */}
          {item.nota && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${accentColor}`,
              borderRadius: '0 8px 8px 0',
            }}>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, margin: 0 }}>
                💡 {item.nota}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal Pública ──────────────────────────────────────────────────

export default function AyudaPublica() {
  const navigate = useNavigate()
  const [seccionActiva, setSeccionActiva] = useState('primeros-pasos')

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');
        .ap-root {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'DM Sans', sans-serif;
          position: relative;
        }
        .ap-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }
        .ap-wrap {
          position: relative;
          z-index: 1;
          max-width: 560px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
        }
      `}</style>

      <div className="ap-root">
        <div className="ap-wrap">

          {/* Botón volver */}
          <button
            onClick={() => navigate('/login')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem',
              padding: 0, marginBottom: '2rem',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <ArrowLeft size={14} /> Volver al login
          </button>

          {/* Header */}
          <h1 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '1.75rem', color: '#f0f0f0',
            letterSpacing: '-0.03em', margin: '0 0 0.35rem',
          }}>
            Centro de Ayuda
          </h1>
          <p style={{
            fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '0 0 2rem', fontWeight: 300,
          }}>
            Preguntas frecuentes
          </p>

          {/* Pestañas (Tabs) navegables */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1.5rem', gap: 0, overflowX: 'auto',
          }}>
            {SECCIONES.map((s) => {
              const Icono = s.icono
              return (
                <button
                  key={s.id}
                  onClick={() => setSeccionActiva(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.6rem 1rem', fontSize: '0.78rem', fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: seccionActiva === s.id ? s.color : 'rgba(255,255,255,0.35)',
                    borderBottom: `2px solid ${seccionActiva === s.id ? s.color : 'transparent'}`,
                    marginBottom: -1, whiteSpace: 'nowrap',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'color 0.15s',
                  }}
                >
                  <Icono size={13} />
                  {s.titulo}
                </button>
              )
            })}
          </div>

          {/* Renderizado del contenido activo */}
          {SECCIONES.filter((s) => s.id === seccionActiva).map((seccion) => (
            <div key={seccion.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {seccion.items.map((item, i) => (
                <ItemAyuda key={i} item={item} accentColor={seccion.color} />
              ))}
            </div>
          ))}

          {/* Footer específico de la versión pública */}
          <div style={{
            marginTop: '2.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '1rem 1.25rem',
          }}>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6, margin: 0 }}>
              ¿No encontrás lo que buscás? Contactá a la Municipalidad de Salta para soporte técnico.
              Una vez que iniciés sesión también podés ver la guía completa desde el menú <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Ayuda</strong>.
            </p>
          </div>

        </div>
      </div>
    </>
  )
}