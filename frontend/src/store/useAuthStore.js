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
      registerSeller: async (name, shopName, email, password) => {
        const { data } = await api.post('/auth/register/seller', { name, shopName, email, password })
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
          adminSubscriptions: [], adminTotalWithdrawn: 0, adminBankWithdrawals: [], adminDashboardStats: null,
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

      // Admin wallet addresses for crypto deposits (USDT, ETH TRC20, BNB)
      adminWallets: {
        usdt: 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b',
        eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        bnb: 'bnb1gr29kewfvwfj2zcqw2l7h0n50g6c6w86k4'
      },
      updateAdminWallets: (usdt, eth, bnb) => set((state) => ({
        adminWallets: {
          usdt: usdt ?? state.adminWallets?.usdt ?? 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b',
          eth: eth ?? state.adminWallets?.eth ?? '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          bnb: bnb ?? state.adminWallets?.bnb ?? 'bnb1gr29kewfvwfj2zcqw2l7h0n50g6c6w86k4'
        }
      })),
    }),
    { name: 'auth-storage-v3' }
  )
)

export default useAuthStore
