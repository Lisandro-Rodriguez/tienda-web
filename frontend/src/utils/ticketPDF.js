// src/utils/ticketPDF.js
// Genera y descarga un ticket de comprobante en PDF
// Uso: generarTicketPDF({ venta, negocio })
// Requiere: npm install jspdf

import { jsPDF } from 'jspdf'

export function generarTicketPDF({ venta, negocio }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // ancho ticket térmico 80mm, alto dinámico
  })

  const ancho = 80
  const margen = 6
  const contenido = ancho - margen * 2
  let y = 8

  const linea = () => {
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.line(margen, y, ancho - margen, y)
    y += 4
  }

  const texto = (str, opciones = {}) => {
    const {
      size = 8,
      bold = false,
      align = 'left',
      color = [30, 30, 30],
    } = opciones
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const x = align === 'center' ? ancho / 2 : align === 'right' ? ancho - margen : margen
    doc.text(str, x, y, { align })
    y += size * 0.45
  }

  const textoDobleColumna = (izq, der, size = 8) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(izq, margen, y)
    doc.text(der, ancho - margen, y, { align: 'right' })
    y += size * 0.45
  }

  // ── Encabezado ──────────────────────────────────────────
  texto(negocio?.nombre || 'Mi Negocio', { size: 12, bold: true, align: 'center' })
  y += 1

  if (negocio?.direccion) texto(negocio.direccion, { size: 7, align: 'center', color: [100, 100, 100] })
  if (negocio?.telefono) texto(`Tel: ${negocio.telefono}`, { size: 7, align: 'center', color: [100, 100, 100] })
  if (negocio?.cuit) texto(`CUIT: ${negocio.cuit}`, { size: 7, align: 'center', color: [100, 100, 100] })

  y += 2
  linea()

  // ── Número y fecha ───────────────────────────────────────
  texto(`COMPROBANTE N° ${String(venta.id).padStart(6, '0')}`, { size: 9, bold: true, align: 'center' })
  y += 1

  const fecha = new Date(venta.fecha)
  const fechaStr = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  texto(`${fechaStr}  ${horaStr}`, { size: 7, align: 'center', color: [100, 100, 100] })

  y += 2
  linea()

  // ── Items ────────────────────────────────────────────────
  texto('DETALLE', { size: 7, bold: true, color: [100, 100, 100] })
  y += 1

  for (const item of venta.items || []) {
    // Nombre del producto (puede truncarse si es muy largo)
    const nombre = item.nombre_producto.length > 28
      ? item.nombre_producto.substring(0, 26) + '…'
      : item.nombre_producto

    texto(nombre, { size: 8, bold: false })
    y -= 1 // pequeño ajuste para la línea de precio

    const cantPrecio = `${item.cantidad} x $${item.precio_unitario.toFixed(2)}`
    const subtotal = `$${item.subtotal.toFixed(2)}`
    textoDobleColumna(cantPrecio, subtotal, 7.5)
    y += 1
  }

  y += 1
  linea()

  // ── Total ────────────────────────────────────────────────
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('TOTAL', margen, y)
  doc.text(`$${venta.total.toFixed(2)}`, ancho - margen, y, { align: 'right' })
  y += 6

  // Método de pago
  texto(`Forma de pago: ${venta.metodo_pago}`, { size: 7.5, color: [80, 80, 80] })

  y += 3
  linea()

  // ── Mensaje / pie ────────────────────────────────────────
  const mensajePie = negocio?.mensaje_ticket || '¡Gracias por su compra!'
  texto(mensajePie, { size: 7.5, align: 'center', color: [100, 100, 100] })
  y += 2
  texto('Este comprobante no reemplaza a la factura legal.', {
    size: 6,
    align: 'center',
    color: [160, 160, 160],
  })

  // Ajustar alto del PDF al contenido real
  // jsPDF no permite resize después de crear, pero 200mm alcanza para la mayoría
  // Si querés altura exacta, calculá antes de crear el doc.

  // ── Descargar ────────────────────────────────────────────
  doc.save(`ticket-${String(venta.id).padStart(6, '0')}.pdf`)
}
