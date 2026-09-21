import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useOrderStore = create(
  persist(
    (set, get) => ({
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
          sellerId: item.sellerId || null,
          sellerName: item.sellerName || (item.sellerEmail ? item.sellerEmail.split('@')[0] : 'Seller'),
        }))
        const formattedShipping = {
          name: shippingInfo?.name || `${shippingInfo?.firstName || ''} ${shippingInfo?.lastName || ''}`.trim() || 'Customer',
          address: shippingInfo?.address || 'N/A',
          city: shippingInfo?.city || 'N/A',
          zip: shippingInfo?.zip || '00000',
          email: shippingInfo?.email || null,
        }

        let order
        try {
          const { data } = await api.post('/orders', {
            items,
            shippingAddress: formattedShipping,
            paymentMethod: paymentMethod || 'card',
            txHash: paymentProof?.txHash || null,
            walletAddress: paymentProof?.walletAddress || null,
          })
          order = data.data.order
        } catch (err) {
          console.warn('Backend API call failed, generating local fallback order:', err)
          const newId = 'ORD-' + Math.floor(10000 + Math.random() * 90000)
          const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
          const tax = Math.round(subtotal * 0.08 * 100) / 100
          order = {
            id: newId,
            items,
            subtotal,
            tax,
            shipping: 0,
            total: Math.round((subtotal + tax) * 100) / 100,
            status: 'Processing',
            shippingAddress: formattedShipping,
            customerEmail: formattedShipping.email,
            paymentMethod: paymentMethod || 'Credit Card',
            txHash: paymentProof?.txHash || null,
            walletAddress: paymentProof?.walletAddress || null,
            createdAt: new Date().toISOString()
          }
        }

        if (shippingInfo?.email) {
          if (!order.shippingAddress) order.shippingAddress = {}
          order.shippingAddress.email = shippingInfo.email
          order.customerEmail = shippingInfo.email
        }
        if (!order.shippingAddress?.name && formattedShipping.name) {
          order.shippingAddress = { ...order.shippingAddress, ...formattedShipping }
        }

        // Ensure items retain seller details
        order.items = (order.items || []).map((it, idx) => ({
          ...it,
          sellerName: it.sellerName || items[idx]?.sellerName,
          sellerEmail: it.sellerEmail || items[idx]?.sellerEmail,
          sellerId: it.sellerId || items[idx]?.sellerId,
        }))

        set((state) => ({
          orders: [order, ...state.orders.filter(o => o.id !== order.id)],
          adminOrders: [order, ...state.adminOrders.filter(o => o.id !== order.id)]
        }))
        return order
      },

      fetchMyOrders: async () => {
        try {
          const { data } = await api.get('/orders')
          const apiOrders = data?.data?.orders || []
          if (apiOrders.length > 0) {
            set((state) => {
              const merged = apiOrders.map(ao => {
                const local = state.orders.find(o => o.id === ao.id)
                return {
                  ...ao,
                  customerEmail: ao.customerEmail || ao.shippingAddress?.email || local?.customerEmail || local?.shippingAddress?.email,
                  shippingAddress: {
                    ...ao.shippingAddress,
                    email: ao.shippingAddress?.email || ao.customerEmail || local?.shippingAddress?.email || local?.customerEmail
                  }
                }
              })
              return { orders: merged }
            })
            return get().orders
          }
          return get().orders
        } catch { return get().orders }
      },

      fetchSellerOrders: async () => {
        try {
          const { data } = await api.get('/orders/seller')
          const apiOrders = data?.data?.orders || []
          if (apiOrders.length > 0) {
            set((state) => {
              const merged = apiOrders.map(ao => {
                const local = state.orders.find(o => o.id === ao.id) || state.adminOrders.find(o => o.id === ao.id)
                return {
                  ...ao,
                  customerEmail: ao.customerEmail || ao.shippingAddress?.email || local?.customerEmail || local?.shippingAddress?.email,
                  shippingAddress: {
                    ...ao.shippingAddress,
                    email: ao.shippingAddress?.email || ao.customerEmail || local?.shippingAddress?.email || local?.customerEmail
                  },
                  items: (ao.items || []).map((it, idx) => ({
                    ...it,
                    sellerName: it.sellerName || local?.items?.[idx]?.sellerName,
                    sellerEmail: it.sellerEmail || local?.items?.[idx]?.sellerEmail,
                  }))
                }
              })
              return { orders: merged }
            })
            return get().orders
          }
          return get().orders
        } catch { return get().orders }
      },

      updateOrderStatus: async (orderId, status) => {
        try {
          const { data } = await api.put(`/orders/${orderId}/status`, { status })
          const updated = data.data.order
          set((state) => ({
            orders: state.orders.map(o => {
              if (o.id !== orderId) return o
              return {
                ...o,
                ...updated,
                customerEmail: o.customerEmail || updated.customerEmail || o.shippingAddress?.email,
                shippingAddress: { ...o.shippingAddress, ...updated.shippingAddress }
              }
            }),
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
                customerEmail: o.customerEmail || updated.customerEmail || o.shippingAddress?.email,
                shippingAddress: { ...o.shippingAddress, ...updated.shippingAddress },
                items: mergedItems.length ? mergedItems : updated.items,
              }
            }),
          }))
          return updated
        } catch (err) {
          console.warn('Backend API update failed, updating status locally:', err)
          let updatedOrder
          set((state) => {
            const updateItem = o => o.id === orderId ? { ...o, status } : o
            const newOrders = state.orders.map(updateItem)
            const newAdminOrders = state.adminOrders.map(updateItem)
            updatedOrder = newAdminOrders.find(o => o.id === orderId) || newOrders.find(o => o.id === orderId)
            return { orders: newOrders, adminOrders: newAdminOrders }
          })
          return updatedOrder || { id: orderId, status }
        }
      },

      // ── Admin: all orders across every seller ─────
      fetchAdminOrders: async (status) => {
        try {
          const url = status ? `/admin/orders?status=${encodeURIComponent(status)}` : '/admin/orders'
          const { data } = await api.get(url)
          const apiOrders = data?.data?.orders || []
          if (apiOrders.length > 0) {
            set((state) => {
              const merged = apiOrders.map(ao => {
                const local = state.adminOrders.find(o => o.id === ao.id) || state.orders.find(o => o.id === ao.id)
                return {
                  ...ao,
                  customerEmail: ao.customerEmail || ao.shippingAddress?.email || local?.customerEmail || local?.shippingAddress?.email,
                  shippingAddress: {
                    ...ao.shippingAddress,
                    email: ao.shippingAddress?.email || ao.customerEmail || local?.shippingAddress?.email || local?.customerEmail
                  },
                  items: (ao.items || []).map((it, idx) => ({
                    ...it,
                    sellerName: it.sellerName || local?.items?.[idx]?.sellerName,
                    sellerEmail: it.sellerEmail || local?.items?.[idx]?.sellerEmail,
                  }))
                }
              })
              return { adminOrders: merged }
            })
            return get().adminOrders
          }
          return get().adminOrders
        } catch { return get().adminOrders }
      },

    }),
    { name: 'shopiversa-orders-v2' }
  )
)

export default useOrderStore
