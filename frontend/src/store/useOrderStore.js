import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useOrderStore = create(
  persist(
    (set) => ({
      orders: [],

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
        } catch (e) { return [] }
      },

      fetchSellerOrders: async () => {
        try {
          const { data } = await api.get('/orders/seller')
          set({ orders: data.data.orders })
          return data.data.orders
        } catch (e) { return [] }
      },

      updateOrderStatus: async (orderId, status) => {
        try {
          const { data } = await api.put(`/orders/${orderId}/status`, { status })
          set((state) => ({
            orders: state.orders.map(o => o.id === orderId ? data.data.order : o)
          }))
        } catch (e) { console.error(e) }
      },

    }),
    { name: 'shopiversa-orders-v2' }
  )
)

export default useOrderStore
