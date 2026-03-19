import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerCamara({ onEscaneo, onCerrar }) {
  const [error, setError] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const scannerRef = useRef(null)
  const idDiv = 'escaner-camara-div'

  useEffect(() => {
    let scanner

    const iniciar = async () => {
      try {
        scanner = new Html5Qrcode(idDiv)
        scannerRef.current = scanner

        const camaras = await Html5Qrcode.getCameras()
        if (!camaras || camaras.length === 0) {
          setError('No se encontró ninguna cámara.')
          setIniciando(false)
          return
        }

        // Preferir cámara trasera
        const camara = camaras.find(c =>
          c.label.toLowerCase().includes('back') ||
          c.label.toLowerCase().includes('trasera') ||
          c.label.toLowerCase().includes('rear') ||
          c.label.toLowerCase().includes('environment')
        ) || camaras[camaras.length - 1]

        await scanner.start(
          { deviceId: { exact: camara.id } },
          {
            fps: 15,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.333,
            // iOS Safari: usar facingMode en lugar de advanced
            videoConstraints: {
              deviceId: { exact: camara.id },
              focusMode: 'continuous',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          (codigo) => {
            // Vibrar al escanear (si el dispositivo lo soporta)
            if (navigator.vibrate) navigator.vibrate(50)
            onEscaneo(codigo)
            onCerrar()
          },
          () => {}
        )
        setIniciando(false)
      } catch (err) {
        console.error(err)
        // Fallback: intentar con facingMode environment (cámara trasera genérica)
        try {
          if (scanner) {
            await scanner.start(
              { facingMode: 'environment' },
              { fps: 15, qrbox: { width: 260, height: 160 } },
              (codigo) => {
                if (navigator.vibrate) navigator.vibrate(50)
                onEscaneo(codigo)
                onCerrar()
              },
              () => {}
            )
            setIniciando(false)
          }
        } catch (err2) {
          setError('No se pudo acceder a la cámara. Verificá los permisos en tu navegador.')
          setIniciando(false)
        }
      }
    }

    iniciar()

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

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

      {/* Área de escaneo */}
      <div className="flex-1 flex flex-col items-center justify-center bg-black px-4">
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
          <div className="w-full max-w-sm">
            {/* Visor de la cámara */}
            <div
              id={idDiv}
              className="rounded-2xl overflow-hidden w-full"
              style={{ minHeight: '300px' }}
            />
            <p className="text-gray-400 text-sm text-center mt-6">
              Apuntá la cámara al código de barras y mantené estable
            </p>
            <p className="text-gray-600 text-xs text-center mt-1">
              El escáner detecta automáticamente
            </p>
          </div>
        )}
      </div>

      {/* Footer con botón cerrar */}
      <div className="bg-black px-6 py-6">
        <button onClick={onCerrar}
          className="w-full bg-white/10 text-white font-semibold py-3 rounded-xl border border-white/20">
          Cancelar
        </button>
      </div>
    </div>
  )
}
