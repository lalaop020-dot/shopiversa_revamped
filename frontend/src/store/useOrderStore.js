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
        const items = (cartItems || []).map(item => ({
          productId: Number(item.id ?? item.productId ?? 0),
          name: item.name || 'Product',
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 1),
          image: item.image || null,
          category: item.category || null,
          sellerEmail: item.sellerEmail || null,
        }))
        const formattedShipping = {
          name: shippingInfo?.name || `${shippingInfo?.firstName || ''} ${shippingInfo?.lastName || ''}`.trim() || 'Customer',
          address: shippingInfo?.address || 'N/A',
          city: shippingInfo?.city || 'N/A',
          zip: shippingInfo?.zip || '00000',
          email: shippingInfo?.email || null,
        }
        const { data } = await api.post('/orders', {
          items,
          shippingAddress: formattedShipping,
          paymentMethod: paymentMethod || 'card',
          txHash: paymentProof?.txHash || null,
          walletAddress: paymentProof?.walletAddress || null,
        })
        const order = data.data.order
        if (shippingInfo?.email) {
          if (order.shippingAddress) order.shippingAddress.email = shippingInfo.email
          order.customerEmail = shippingInfo.email
        }
        set((state) => ({
          orders: [order, ...state.orders],
          adminOrders: [order, ...state.adminOrders.filter(o => o.id !== order.id)]
        }))
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
        const updated = data.data.order
        set((state) => ({
          orders: state.orders.map(o => o.id === orderId ? { ...o, ...updated } : o),
          adminOrders: state.adminOrders.map(o => {
            if (o.id !== orderId) return o
            const mergedItems = (updated.items || []).map((item, idx) => ({
              ...item,
              sellerName: o.items?.[idx]?.sellerName || item.sellerName,
              sellerEmail: o.items?.[idx]?.sellerEmail || item.sellerEmail,
            }))
            return {
              ...o,
              ...updated,
              customerEmail: o.customerEmail || updated.customerEmail,
              items: mergedItems.length ? mergedItems : updated.items,
            }
          }),
        }))
        return updated
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
