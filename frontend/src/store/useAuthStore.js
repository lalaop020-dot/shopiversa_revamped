import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
import useCartStore from './useCartStore'
import useOrderStore from './useOrderStore'
import useChatStore from './useChatStore'
import usePlatformStore from './usePlatformStore'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      token: null,

      setAuth: (user, role, token) => {
        if (token) localStorage.setItem('token', token)
        set({ user, role, token, isAuthenticated: !!user })
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        const { user, role, token } = data.data
        localStorage.setItem('token', token)
        set({ user, role, token, isAuthenticated: true })
        return { user, role }
      },

      registerCustomer: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password })
        const { user, role, token } = data.data
        localStorage.setItem('token', token)
        set({ user, role, token, isAuthenticated: true })
        return { user, role }
      },

      // Seller signup does NOT log the user in — the shop is pending admin
      // approval and can't be used until then, so no token is issued.
      // The argument is a FormData: name, shopName, email, password + the KYC image files
      // (docFront, docBack, optional profile), stored server-side on Cloudinary.
      registerSeller: async (form) => {
        const { data } = await api.post('/auth/register/seller', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data.data
      },

      logout: () => {
        localStorage.removeItem('token')
        set({ user: null, role: null, token: null, isAuthenticated: false })
        // Clear cross-store state so the next login on this browser
        // doesn't inherit the previous user's cart/orders/chats/balances.
        useCartStore.getState().clearCart()
        useOrderStore.setState({ orders: [] })
        useChatStore.setState({ conversations: {}, conversationsList: [] })
        usePlatformStore.setState({
          balances: {}, transactions: [], sellerSubscriptions: {}, packageRequests: [],
          adminSubscriptions: [], adminDashboardStats: null, sellerStats: null,
        })
      },

      updateUser: async (userData) => {
        const { data } = await api.put('/auth/profile', userData)
        set((state) => ({ user: { ...state.user, ...data.data.user } }))
      },

      changePassword: async (currentPassword, newPassword) => {
        await api.put('/auth/password', { currentPassword, newPassword })
      },

      setTransactionPassword: async (password, confirmPassword) => {
        await api.put('/auth/transaction-password', { password, confirmPassword })
      },

      updateAdminCredentials: async (email, newPassword) => {
        const payload = { email }
        if (newPassword) payload.newPassword = newPassword
        await api.put('/auth/admin/credentials', payload)
        set((state) => ({ user: { ...state.user, email } }))
      },

      // Keep for backward compat — registers locally if no backend
      registerUser: (name, email, password, role) => {
        console.warn('registerUser is a local mock — use registerSeller/registerCustomer instead')
      },

    }),
    { name: 'auth-storage-v3' }
  )
)

export default useAuthStore
