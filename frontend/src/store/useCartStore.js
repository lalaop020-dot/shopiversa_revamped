import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find(item => item.id === product.id)
          if (existing) {
            return {
              items: state.items.map(item =>
                item.id === product.id
                  ? { ...item, quantity: item.stock != null ? Math.min(item.quantity + quantity, item.stock) : item.quantity + quantity }
                  : item
              )
            }
          }
          return {
            items: [...state.items, {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              category: product.category,
              stock: product.stock,
              sellerEmail: product.sellerEmail,
              quantity: product.stock != null ? Math.min(quantity, product.stock) : quantity
            }]
          }
        })
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map(item =>
            item.id === id
              ? { ...item, quantity: item.stock != null ? Math.min(quantity, item.stock) : quantity }
              : item
          )
        }))
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }))
      },

      clearCart: () => set({ items: [] }),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      },

      getTax: () => {
        return get().getSubtotal() * 0.08
      },

      getTotal: () => {
        return get().getSubtotal() + get().getTax()
      }
    }),
    {
      name: 'shopiversa-cart-v1'
    }
  )
)

export default useCartStore
