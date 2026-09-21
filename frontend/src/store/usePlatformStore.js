import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

export const DEFAULT_BALANCE = Object.freeze({
  balance: 0, withdrawable: 0, pendingDeposit: 0, totalWithdrawn: 0
})

export const DEFAULT_SUBSCRIPTION = Object.freeze({ name: 'Silver', status: 'Active' })

const usePlatformStore = create(
  persist(
    (set, get) => ({
      // Local cache
      balances: {},
      transactions: [],
      sellerSubscriptions: {},
      packageRequests: [],

      // ── Balance ──────────────────────────────────
      fetchBalance: async () => {
        try {
          const { data } = await api.get('/wallet/balance')
          const bal = data.data
          set((state) => {
            const email = JSON.parse(localStorage.getItem('auth-storage-v2') || '{}')?.state?.user?.email || 'me'
            return { balances: { ...state.balances, [email]: bal } }
          })
          return bal
        } catch (e) { return DEFAULT_BALANCE }
      },

      // ── Deposit ──────────────────────────────────
      addDepositRequest: async (email, amount, txHash, proofFile) => {
        const form = new FormData()
        form.append('amount', amount)
        form.append('txHash', txHash)
        form.append('method', 'USDT (TRC20)')
        if (proofFile) form.append('proof', proofFile)

        const { data } = await api.post('/wallet/deposit', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const tx = data.data.transaction
        set((state) => {
          const currentBal = state.balances[email] || { ...DEFAULT_BALANCE }
          return {
            transactions: [tx, ...state.transactions],
            balances: {
              ...state.balances,
              [email]: { ...currentBal, pendingDeposit: currentBal.pendingDeposit + parseFloat(amount) }
            }
          }
        })
        return tx
      },

      // ── Withdrawal ───────────────────────────────
      // Throws on failure so the caller can show the server's reason
      // (insufficient balance, upload problem, ...).
      addWithdrawalRequest: async (email, amount, walletAddress, proofFile) => {
        const form = new FormData()
        form.append('amount', parseFloat(amount))
        form.append('walletAddress', walletAddress)
        form.append('method', 'Crypto (USDT / ETH / BTC)')
        if (proofFile) form.append('proof', proofFile)

        const { data } = await api.post('/wallet/withdraw', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const tx = data.data.transaction
        set((state) => {
          const currentBal = state.balances[email] || { ...DEFAULT_BALANCE }
          return {
            transactions: [tx, ...state.transactions],
            balances: {
              ...state.balances,
              [email]: { ...currentBal, withdrawable: currentBal.withdrawable - parseFloat(amount) }
            }
          }
        })
        return true
      },

      // ── Fetch Transactions ────────────────────────
      fetchTransactions: async () => {
        try {
          const { data } = await api.get('/wallet/transactions')
          const txns = data.data.transactions
          set({ transactions: txns })
          return txns
        } catch (e) { return [] }
      },

      // ── Admin: Dashboard Stats (real aggregate counts) ─
      adminDashboardStats: null,
      fetchAdminDashboardStats: async () => {
        try {
          const { data } = await api.get('/admin/dashboard/stats')
          set({ adminDashboardStats: data.data })
          return data.data
        } catch (e) { return null }
      },

      // ── Admin: Fetch All Transactions ─────────────
      fetchAdminTransactions: async (type, status) => {
        try {
          let url = '/admin/transactions'
          const params = []
          if (type) params.push(`type=${type}`)
          if (status) params.push(`status=${status}`)
          if (params.length) url += '?' + params.join('&')
          const { data } = await api.get(url)
          const txns = data.data.transactions
          set({ transactions: txns })
          return txns
        } catch (e) { return [] }
      },

      approveDeposit: async (txId) => {
        const { data } = await api.put(`/admin/transactions/${txId}/approve`)
        const tx = data.data.transaction
        set((state) => ({
          transactions: state.transactions.map(t => t.id === txId ? tx : t)
        }))
      },

      rejectDeposit: async (txId) => {
        const { data } = await api.put(`/admin/transactions/${txId}/reject`)
        set((state) => ({
          transactions: state.transactions.map(t => t.id === txId ? data.data.transaction : t)
        }))
      },

      approveWithdrawal: async (txId) => {
        const { data } = await api.put(`/admin/transactions/${txId}/approve`)
        set((state) => ({
          transactions: state.transactions.map(t => t.id === txId ? data.data.transaction : t)
        }))
      },

      rejectWithdrawal: async (txId) => {
        const { data } = await api.put(`/admin/transactions/${txId}/reject`)
        set((state) => ({
          transactions: state.transactions.map(t => t.id === txId ? data.data.transaction : t)
        }))
      },

      // ── Package Requests ──────────────────────────
      fetchCurrentPackage: async () => {
        try {
          const { data } = await api.get('/packages/current')
          const pkg = data.data
          set((state) => {
            const email = JSON.parse(localStorage.getItem('auth-storage-v2') || '{}')?.state?.user?.email || 'me'
            return { sellerSubscriptions: { ...state.sellerSubscriptions, [email]: pkg } }
          })
          return pkg
        } catch (e) { return DEFAULT_SUBSCRIPTION }
      },

      addPackageRequest: async (email, packageName, price, walletAddress, txHash, proofFile) => {
        const form = new FormData()
        form.append('packageName', packageName)
        // price is decided by the server (Silver 0 / Gold 499 / Platinum 999)
        if (walletAddress) form.append('walletAddress', walletAddress)
        if (txHash) form.append('txHash', txHash)
        if (proofFile) form.append('proof', proofFile)

        const { data } = await api.post('/packages/request', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const req = data.data.request
        set((state) => ({ packageRequests: [req, ...state.packageRequests] }))
        return req
      },

      fetchPackageRequests: async () => {
        try {
          const { data } = await api.get('/packages/requests')
          set({ packageRequests: data.data.requests })
          return data.data.requests
        } catch (e) { return [] }
      },

      // Admin: all package requests across every seller
      fetchAdminPackageRequests: async () => {
        try {
          const { data } = await api.get('/admin/requests')
          set({ packageRequests: data.data.requests })
          return data.data.requests
        } catch (e) { return [] }
      },

      // Admin package management
      approvePackageRequest: async (reqId) => {
        await api.put(`/admin/requests/${reqId}/approve`)
        set((state) => ({
          packageRequests: state.packageRequests.map(r =>
            r.id === reqId ? { ...r, status: 'Approved' } : r
          )
        }))
      },

      rejectPackageRequest: async (reqId) => {
        await api.put(`/admin/requests/${reqId}/reject`)
        set((state) => ({
          packageRequests: state.packageRequests.map(r =>
            r.id === reqId ? { ...r, status: 'Rejected' } : r
          )
        }))
      },

      freezePackage: async (sellerId) => {
        await api.put(`/admin/seller/${sellerId}/freeze`)
      },

      unfreezePackage: async (sellerId) => {
        await api.put(`/admin/seller/${sellerId}/unfreeze`)
      },

      // Admin: all sellers' subscriptions (for freeze/unfreeze management)
      adminSubscriptions: [],
      fetchAdminSubscriptions: async () => {
        try {
          const { data } = await api.get('/admin/subscriptions')
          set({ adminSubscriptions: data.data.subscriptions })
          return data.data.subscriptions
        } catch (e) { return [] }
      },
    }),
    { name: 'platform-storage-v3' }
  )
)

export default usePlatformStore
