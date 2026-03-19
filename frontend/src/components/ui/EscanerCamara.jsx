import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Camera, Focus } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerCamara({ onEscaneo, onCerrar }) {
  const [error, setError] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const [refocusing, setRefocusing] = useState(false)
  const [tapPos, setTapPos] = useState(null)
  const scannerRef = useRef(null)
  const streamRef = useRef(null)
  const idDiv = 'escaner-camara-div'

  const detener = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
    } catch (e) {}
  }

  const iniciar = useCallback(async () => {
    try {
      // Si ya hay un scanner, detenerlo primero
      await detener()

      const scanner = new Html5Qrcode(idDiv)
      scannerRef.current = scanner

      const camaras = await Html5Qrcode.getCameras()
      if (!camaras || camaras.length === 0) {
        setError('No se encontró ninguna cámara.')
        setIniciando(false)
        return
      }

      const camara = camaras.find(c =>
        c.label.toLowerCase().includes('back') ||
        c.label.toLowerCase().includes('trasera') ||
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      ) || camaras[camaras.length - 1]

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.5,
        },
        (codigo) => {
          if (navigator.vibrate) navigator.vibrate(60)
          onEscaneo(codigo)
          onCerrar()
        },
        () => {}
      )

      // Guardar referencia al stream para control de foco
      const video = document.querySelector(`#${idDiv} video`)
      if (video?.srcObject) {
        streamRef.current = video.srcObject
      }

      setIniciando(false)
    } catch (err) {
      console.error(err)
      setError('No se pudo acceder a la cámara. Verificá los permisos.')
      setIniciando(false)
    }
  }, [])

  useEffect(() => {
    iniciar()
    return () => { detener() }
  }, [])

  // Tap to focus: en iOS reinicia brevemente el stream para forzar foco
  const handleTap = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setTapPos({ x, y })
    setRefocusing(true)

    setTimeout(() => setTapPos(null), 800)

    // Intentar foco nativo via MediaStreamTrack (Android/algunos iPhones)
    try {
      const video = document.querySelector(`#${idDiv} video`)
      const stream = video?.srcObject
      if (stream) {
        const track = stream.getVideoTracks()[0]
        if (track && track.getCapabilities) {
          const caps = track.getCapabilities()
          if (caps.focusMode && caps.focusMode.includes('manual')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] })
          }
          // pointOfInterest para iOS
          if (caps.pointOfInterest) {
            const px = x / rect.width
            const py = y / rect.height
            await track.applyConstraints({
              advanced: [{ pointOfInterest: { x: px, y: py }, focusMode: 'auto' }]
            })
          }
        }
      }
    } catch (e) {
      // fallback: reiniciar scanner para refrescar el foco
      await detener()
      setTimeout(async () => {
        const nuevoScanner = new Html5Qrcode(idDiv)
        scannerRef.current = nuevoScanner
        try {
          await nuevoScanner.start(
            { facingMode: 'environment' },
            { fps: 15, qrbox: { width: 260, height: 160 }, aspectRatio: 1.5 },
            (codigo) => {
              if (navigator.vibrate) navigator.vibrate(60)
              onEscaneo(codigo)
              onCerrar()
            },
            () => {}
          )
        } catch (e2) {}
      }, 200)
    }

    setTimeout(() => setRefocusing(false), 800)
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

      {/* Área de escaneo con tap to focus */}
      <div
        className="flex-1 flex flex-col items-center justify-center bg-black px-4 relative cursor-crosshair"
        onClick={handleTap}
      >
        {iniciando && (
          <p className="text-white text-sm mb-6 animate-pulse">Iniciando cámara...</p>
        )}

        {error ? (
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} className="text-red-400" />
            </div>
            <p className="text-red-400 font-semibold mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-6">Podés escribir el código manualmente</p>
            <button onClick={onCerrar} className="bg-white text-black font-bold px-6 py-3 rounded-xl">
              Cerrar y escribir
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm relative">
            <div
              id={idDiv}
              className="rounded-2xl overflow-hidden w-full"
              style={{ minHeight: '300px' }}
            />

            {/* Indicador de tap */}
            {tapPos && (
              <div
                className="absolute pointer-events-none"
                style={{ left: tapPos.x - 30, top: tapPos.y - 30 }}
              >
                <div className={`w-14 h-14 border-2 border-yellow-400 rounded-full flex items-center justify-center
                  transition-all duration-300 ${refocusing ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                  <Focus size={20} className="text-yellow-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instrucción tap */}
        {!error && !iniciando && (
          <div className="absolute bottom-24 left-0 right-0 text-center">
            <p className="text-gray-400 text-sm">Tocá la pantalla para enfocar</p>
            <p className="text-gray-600 text-xs mt-1">El escáner detecta automáticamente</p>
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
    </div>
  )
}
