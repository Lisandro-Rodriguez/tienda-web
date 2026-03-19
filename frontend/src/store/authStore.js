import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      negocioNombre: '',

      login: (token, usuario, negocioNombre) => {
        localStorage.setItem('token', token)
        set({ token, usuario, negocioNombre })
      },

      logout: () => {
        localStorage.clear()
        set({ token: null, usuario: null, negocioNombre: '' })
      },

      isAdmin: () => {
        const state = useAuthStore.getState()
        return state.usuario?.rol === 'ADMIN'
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        usuario: state.usuario,
        negocioNombre: state.negocioNombre
      })
    }
  )
)
