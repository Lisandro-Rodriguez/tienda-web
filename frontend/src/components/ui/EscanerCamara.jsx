import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerCamara({ onEscaneo, onCerrar }) {
  const [error, setError] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const [tapPos, setTapPos] = useState(null)
  const scannerRef = useRef(null)
  const idDiv = 'escaner-camara-div'

  const detener = async () => {
    try {
      if (scannerRef.current?.isScanning) await scannerRef.current.stop()
    } catch (e) {}
  }

  const iniciarScanner = async () => {
    try {
      const scanner = new Html5Qrcode(idDiv)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 250, height: 150 }, aspectRatio: 1.5 },
        (codigo) => {
          if (navigator.vibrate) navigator.vibrate(60)
          onEscaneo(codigo)
          onCerrar()
        },
        () => {}
      )
      setIniciando(false)
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verificá los permisos.')
      setIniciando(false)
    }
  }

  useEffect(() => {
    iniciarScanner()
    return () => { detener() }
  }, [])

  const handleTap = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Mostrar círculo amarillo
    setTapPos({ x, y })
    setTimeout(() => setTapPos(null), 700)

    // Intentar foco nativo
    try {
      const video = document.querySelector(`#${idDiv} video`)
      const track = video?.srcObject?.getVideoTracks?.()?.[0]
      if (track) {
        const caps = track.getCapabilities?.() || {}
        if (caps.pointOfInterest) {
          await track.applyConstraints({
            advanced: [{
              pointOfInterest: { x: x / rect.width, y: y / rect.height },
              focusMode: 'auto'
            }]
          })
          return
        }
        if (caps.focusMode?.includes?.('auto')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'auto' }] })
          setTimeout(() => track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }), 500)
          return
        }
      }
    } catch (e) {}

    // Fallback iOS: reiniciar el scanner
    await detener()
    await new Promise(r => setTimeout(r, 150))
    await iniciarScanner()
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-black">
        <div className="flex items-center gap-2 text-white">
          <Camera size={20} />
          <span className="font-semibold text-lg">Escanear código</span>
        </div>
        <button onClick={onCerrar} className="text-white bg-white/20 rounded-full p-2">
          <X size={22} />
        </button>
      </div>

      {/* Cámara + overlay tap */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black px-4">
        {iniciando && <p className="text-white text-sm animate-pulse mb-4">Iniciando cámara...</p>}

        {error ? (
          <div className="text-center px-6">
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-6">Podés escribir el código manualmente</p>
            <button onClick={onCerrar} className="bg-white text-black font-bold px-6 py-3 rounded-xl">Cerrar</button>
          </div>
        ) : (
          <div className="w-full max-w-sm relative">
            {/* Video del scanner */}
            <div id={idDiv} className="rounded-2xl overflow-hidden w-full" style={{ minHeight: 280 }} />

            {/* Overlay transparente encima del video para capturar taps */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ zIndex: 10 }}
              onClick={handleTap}
            >
              {/* Círculo de foco */}
              {tapPos && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: tapPos.x - 28,
                    top: tapPos.y - 28,
                    width: 56,
                    height: 56,
                    border: '2px solid #facc15',
                    borderRadius: '50%',
                    boxShadow: '0 0 12px #facc15aa',
                    animation: 'focusRing 0.7s ease-out forwards'
                  }}
                />
              )}
            </div>

            <p className="text-gray-400 text-sm text-center mt-4">
              Tocá para enfocar · El escáner detecta automáticamente
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black px-6 py-6">
        <button onClick={onCerrar}
          className="w-full bg-white/10 text-white font-semibold py-3 rounded-xl border border-white/20">
          Cancelar
        </button>
      </div>

      <style>{`
        @keyframes focusRing {
          0%   { opacity: 1; transform: scale(1.3); }
          50%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
    </div>
  )
}
