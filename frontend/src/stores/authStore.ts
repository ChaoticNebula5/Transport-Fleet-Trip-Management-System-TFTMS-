import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi } from '../api/endpoints'

interface User {
  user_id: number
  email: string
  role: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authApi.login(email, password)
          set({ token: res.data.access_token, isAuthenticated: true, isLoading: false })
          await get().fetchMe()
        } catch (err: any) {
          const msg = err.response?.data?.detail || 'Login failed'
          set({ isLoading: false, error: msg, token: null, isAuthenticated: false })
          throw err
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false, error: null })
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me()
          set({ user: res.data })
        } catch {
          set({ token: null, user: null, isAuthenticated: false })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tftms-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
