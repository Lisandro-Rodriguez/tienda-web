import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerCamara({ onEscaneo, onCerrar }) {
  const [error, setError] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const scannerRef = useRef(null)
  const idDiv = 'escaner-camara-div'

  useEffect(() => {
    const scanner = new Html5Qrcode(idDiv)
    scannerRef.current = scanner

    Html5Qrcode.getCameras()
      .then(camaras => {
        if (!camaras || camaras.length === 0) {
          setError('No se encontró ninguna cámara.')
          setIniciando(false)
          return
        }
        // Preferir cámara trasera en móvil
        const camara = camaras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear')
        ) || camaras[camaras.length - 1]

        scanner.start(
          camara.id,
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (codigo) => {
            onEscaneo(codigo)
            onCerrar()
          },
          () => {} // ignorar errores de frame
        )
        .then(() => setIniciando(false))
        .catch(err => {
          setError('No se pudo acceder a la cámara. Verificá los permisos.')
          setIniciando(false)
          console.error(err)
        })
      })
      .catch(() => {
        setError('No se pudo acceder a la cámara. Verificá los permisos.')
        setIniciando(false)
      })

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-2 text-white">
          <Camera size={20} />
          <span className="font-semibold">Escanear código</span>
        </div>
        <button onClick={onCerrar} className="text-white p-1">
          <X size={24} />
        </button>
      </div>

      {/* Escáner */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {iniciando && (
          <p className="text-white text-sm mb-4 animate-pulse">Iniciando cámara...</p>
        )}
        {error ? (
          <div className="text-center">
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <p className="text-gray-400 text-sm">Podés escribir el código manualmente</p>
            <button onClick={onCerrar} className="mt-4 btn-primary">Cerrar</button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div id={idDiv} className="rounded-2xl overflow-hidden" />
            <p className="text-gray-400 text-xs text-center mt-4">
              Apuntá la cámara al código de barras
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
