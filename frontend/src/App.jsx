// Código temporal para "apagar" el frontend (Modo Mantenimiento)
export default function App() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Sistema Pausado
        </h1>
        <p className="text-gray-600">
          El Sistema Tienda Web se encuentra apagado temporalmente por mantenimiento.
        </p>
      </div>
    </div>
  );
}