import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Inyectar token en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirigir al login si el token expiró
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ─── Servicios ────────────────────────────────────────────────────────────────

export const authService = {
  login: (username, password, negocio_id) =>
    api.post('/auth/login', { username, password, negocio_id }),
  me: () => api.get('/auth/me'),
}

export const negocioService = {
  listar: () => api.get('/negocios/'),
  registrar: (data) => api.post('/negocios/registro', data),
  miNegocio: () => api.get('/negocios/mi-negocio'),
  actualizar: (data) => api.put('/negocios/mi-negocio', data),
  listarUsuarios: () => api.get('/negocios/usuarios'),
  crearUsuario: (data) => api.post('/negocios/usuarios', data),
  eliminarUsuario: (id) => api.delete(`/negocios/usuarios/${id}`),
}

export const productoService = {
  listar: (params) => api.get('/productos/', { params }),
  buscarPorCodigo: (codigo) => api.get(`/productos/buscar/${codigo}`),
  buscarEnCatalogo: (codigo) => api.get(`/productos/catalogo/${codigo}`),
  tipos: () => api.get('/productos/tipos'),
  crear: (data) => api.post('/productos/', data),
  actualizar: (id, data) => api.put(`/productos/${id}`, data),
  eliminar: (id) => api.delete(`/productos/${id}`),
}

export const ventaService = {
  registrar: (data) => api.post('/ventas/', data),
  listar: (periodo) => api.get('/ventas/', { params: { periodo } }),
  dashboard: () => api.get('/ventas/dashboard'),
  cerrarCaja: (fondo_inicial) => api.post('/ventas/cierre', { fondo_inicial }),
  historialCierres: () => api.get('/ventas/cierres'),
}

export const clienteService = {
  listar: () => api.get('/clientes/'),
  crear: (data) => api.post('/clientes/', data),
  movimientos: (id) => api.get(`/clientes/${id}/movimientos`),
  registrarMovimiento: (id, data) => api.post(`/clientes/${id}/movimientos`, data),
  eliminar: (id) => api.delete(`/clientes/${id}`),
}

export const catalogoService = {
  buscar: (codigo) => api.get(`/catalogo/buscar/${codigo}`),
  stats: () => api.get('/catalogo/stats'),
  importar: (archivo) => {
    const form = new FormData()
    form.append('archivo', archivo)
    return api.post('/catalogo/importar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minutos — el archivo es grande
    })
  },
  limpiar: () => api.delete('/catalogo/limpiar'),
}

export const stockService = {
  listarUmbrales: () => api.get('/stock/umbrales'),
  guardarUmbral: (data) => api.post('/stock/umbrales', data),
  eliminarUmbral: (id) => api.delete(`/stock/umbrales/${id}`),
}
