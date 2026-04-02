import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, BookOpen, Wrench, AlertCircle } from 'lucide-react'

const FAQ = [
  {
    seccion: 'Primeros Pasos',
    icono: BookOpen,
    color: '#10b981',
    items: [
      {
        q: '¿Cómo cargo mis productos?',
        a: 'Entrá a Inventario y tocá el botón "+" o "Nuevo producto". Si tenés lector de código de barras, escanear el producto lo autocompleta con datos del catálogo SEPA (más de 36.000 productos). Si no aparece, escribí el nombre a mano.',
      },
      {
        q: '¿Cómo registro una venta?',
        a: 'Andá a Caja, buscá el producto por nombre o escaneá el código de barras. Elegí el método de pago (Efectivo, Tarjeta, Transferencia o Fiado) y tocá "Confirmar venta". El stock se descuenta solo.',
      },
      {
        q: '¿Cómo funciona el módulo de Fiado?',
        a: 'En la sección Fiado podés crear clientes. Al hacer una venta, elegí "Fiado" y seleccioná el cliente — la deuda se suma automáticamente. Cuando venga a pagar, tocá "Abonar" en su perfil.',
      },
    ],
  },
  {
    seccion: 'Problemas Frecuentes',
    icono: Wrench,
    color: '#3b82f6',
    items: [
      {
        q: 'Me equivoqué al cobrar, ¿cómo anulo la venta?',
        a: 'Andá a Historial, tocá la venta para ver el detalle y usá el botón "Anular". El stock vuelve automáticamente. Solo los administradores pueden anular ventas.',
      },
      {
        q: 'El código de barras no encuentra el producto',
        a: 'El catálogo SEPA tiene más de 36.000 productos pero no está completo. Si no lo encuentra, escribí el nombre a mano y guardalo — la próxima vez que escanees ese código ya va a aparecer.',
      },
      {
        q: '¿Cómo actualizo los precios?',
        a: 'En Inventario, tocá el lápiz de editar del producto. Cambiá el costo o el precio de venta directamente y guardá.',
      },
    ],
  },
  {
    seccion: 'Problemas Técnicos',
    icono: AlertCircle,
    color: '#f59e0b',
    items: [
      {
        q: 'El lector de códigos no escribe nada',
        a: 'El lector funciona como un teclado. Tocá primero dentro del campo de búsqueda para que el cursor esté ahí, y después escanear el producto. Sin cursor activo, el código se pierde.',
      },
      {
        q: 'Olvidé la contraseña de administrador',
        a: 'En la pantalla de login, tocá "¿Olvidaste tu contraseña?" e ingresá el email registrado del negocio. Te llegará un link para crear una nueva contraseña. El link dura 2 horas.',
      },
      {
        q: 'La página se quedó cargando',
        a: 'El sistema necesita conexión a internet. Si se cortó, no confirmes la venta hasta que vuelva. Recargá la página con F5 o deslizando hacia abajo en celular. Los datos ya guardados no se pierden.',
      },
    ],
  },
]

function ItemFAQ({ item, color }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <button
        onClick={() => setAbierto(!abierto)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '1rem 1.25rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e5e5e5', lineHeight: 1.4 }}>
          {item.q}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {abierto && (
        <div style={{
          padding: '0 1.25rem 1rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{
            fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6, marginTop: '0.875rem',
          }}>
            {item.a}
          </p>
        </div>
      )}
    </div>
  )
}

export default function AyudaPublica() {
  const navigate = useNavigate()
  const [seccionActiva, setSeccionActiva] = useState(0)

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

          {/* Back */}
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

          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1.5rem', gap: 0, overflowX: 'auto',
          }}>
            {FAQ.map((s, i) => {
              const Icono = s.icono
              return (
                <button
                  key={i}
                  onClick={() => setSeccionActiva(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '0.6rem 1rem', fontSize: '0.78rem', fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: seccionActiva === i ? s.color : 'rgba(255,255,255,0.35)',
                    borderBottom: `2px solid ${seccionActiva === i ? s.color : 'transparent'}`,
                    marginBottom: -1, whiteSpace: 'nowrap',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'color 0.15s',
                  }}
                >
                  <Icono size={13} />
                  {s.seccion}
                </button>
              )
            })}
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQ[seccionActiva].items.map((item, i) => (
              <ItemFAQ key={i} item={item} color={FAQ[seccionActiva].color} />
            ))}
          </div>

          {/* Footer */}
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
