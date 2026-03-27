import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

export default function EscanerCamara({ onEscaneo, onCerrar }) {
  const [error, setError] = useState(null)
  const [iniciando, setIniciando] = useState(true)
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
        { fps: 15, qrbox: { width: 260, height: 160 }, aspectRatio: window.innerHeight / window.innerWidth },
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

  const reenfocar = async () => {
    setIniciando(true)
    await detener()
    await new Promise(r => setTimeout(r, 200))
    await iniciarScanner()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.8)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
          <Camera size={20} />
          <span style={{ fontWeight: 600, fontSize: 17 }}>Escanear código</span>
        </div>
        <button onClick={onCerrar} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
          <X size={20} />
        </button>
      </div>

      {/* Área cámara */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {iniciando && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <p style={{ color: 'white', fontSize: 15 }}>Iniciando cámara...</p>
          </div>
        )}
        {error ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
            <Camera size={48} color="#f87171" style={{ marginBottom: 16 }} />
            <p style={{ color: '#f87171', fontWeight: 600, marginBottom: 8 }}>{error}</p>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Podés escribir el código manualmente</p>
            <button onClick={onCerrar} style={{ background: 'white', color: 'black', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Cerrar y escribir</button>
          </div>
        ) : (
          <>
            <div id={idDiv} style={{ width: '100%', height: '100%' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 80, pointerEvents: 'none' }}>
              <button onClick={reenfocar} style={{
                background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.4)',
                borderRadius: 20, padding: '8px 20px', fontSize: 14, cursor: 'pointer', fontWeight: 600
              }}>
                ↺ Reenfocar cámara
              </button>
            </div>

          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.8)', flexShrink: 0 }}>
        <button onClick={onCerrar} style={{ width: '100%', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>

      <style>{`
        #${idDiv} video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        #${idDiv} > div { width: 100% !important; height: 100% !important; padding: 0 !important; }
        @keyframes focusRing { 0% { opacity:1; transform:scale(1.3); } 50% { opacity:1; transform:scale(1); } 100% { opacity:0; transform:scale(0.9); } }
      `}</style>
    </div>
  )
}
