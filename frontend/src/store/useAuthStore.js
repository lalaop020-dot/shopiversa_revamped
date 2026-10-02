import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'
import useCartStore from './useCartStore'
import useOrderStore from './useOrderStore'
import useChatStore from './useChatStore'
import usePlatformStore from './usePlatformStore'

// ── Default transaction-password helpers ─────────────────────────────────────
// Generates a stable 6-char alphanumeric code for a given seller email.
// The code is seeded from the email so the same email always produces the
// same result (deterministic), and is cached in localStorage so refreshing
// the page never changes it. Sellers can override it via Settings → Security.
const TXN_PWD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const TXN_PWD_LENGTH  = 6

function seededRandom(seed) {
  // Simple LCG-based PRNG so the same seed always yields the same sequence.
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export function getOrCreateDefaultTxnPassword(email) {
  if (!email) return '------'
  const storageKey = `txnpwd:${email}`
  const existing = localStorage.getItem(storageKey)
  if (existing) return existing
  // Generate once and persist
  const rand = seededRandom(email + 'shopiversa_v1')
  let pwd = ''
  for (let i = 0; i < TXN_PWD_LENGTH; i++) {
    pwd += TXN_PWD_CHARSET[Math.floor(rand() * TXN_PWD_CHARSET.length)]
  }
  localStorage.setItem(storageKey, pwd)
  return pwd
}

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

      // Returns the auto-generated default transaction password for the
      // currently logged-in seller. Reads from / creates in localStorage.
      getDefaultTxnPassword: () => {
        const email = get().user?.email
        return getOrCreateDefaultTxnPassword(email)
      },

    }),
    { name: 'auth-storage-v3' }
  )
)

export default useAuthStore
