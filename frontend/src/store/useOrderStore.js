import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useOrderStore = create(
  persist(
    (set) => ({
      orders: [],
      // Kept separate from `orders` (seller/customer scoped) so the admin's
      // cross-seller listing never clobbers or mixes with a seller's own cache.
      adminOrders: [],

      createOrder: async (cartItems, shippingInfo, paymentMethod, paymentProof = {}) => {
        const items = cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          category: item.category,
          sellerEmail: item.sellerEmail,
        }))
        const { data } = await api.post('/orders', {
          items,
          shippingAddress: shippingInfo,
          paymentMethod,
          txHash: paymentProof.txHash,
          walletAddress: paymentProof.walletAddress,
        })
        const order = data.data.order
        set((state) => ({ orders: [order, ...state.orders] }))
        return order
      },

      fetchMyOrders: async () => {
        try {
          const { data } = await api.get('/orders')
          set({ orders: data.data.orders })
          return data.data.orders
        } catch { return [] }
      },

      fetchSellerOrders: async () => {
        try {
          const { data } = await api.get('/orders/seller')
          set({ orders: data.data.orders })
          return data.data.orders
        } catch { return [] }
      },

      updateOrderStatus: async (orderId, status) => {
        const { data } = await api.put(`/orders/${orderId}/status`, { status })
        set((state) => ({
          orders: state.orders.map(o => o.id === orderId ? data.data.order : o),
          adminOrders: state.adminOrders.map(o => o.id === orderId ? data.data.order : o),
        }))
        return data.data.order
      },

      // ── Admin: all orders across every seller ─────
      fetchAdminOrders: async (status) => {
        try {
          const url = status ? `/admin/orders?status=${encodeURIComponent(status)}` : '/admin/orders'
          const { data } = await api.get(url)
          set({ adminOrders: data.data.orders })
          return data.data.orders
        } catch { return [] }
      },

    }),
    { name: 'shopiversa-orders-v2' }
  )
)

export default useOrderStore
