import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useProductStore = create(
  persist(
    (set, get) => ({
      storeroomProducts: [],
      sellerProducts: {},
      categories: [],
      marketplaceProducts: [],
      marketplaceMeta: { total: 0, page: 1, limit: 24, pages: 1 },
      publicCategories: [],

      // ── Marketplace (public storefront) ──────────
      fetchMarketplaceProducts: async (params = {}) => {
        try {
          const q = new URLSearchParams(params).toString()
          const { data } = await api.get(`/marketplace/products${q ? '?' + q : ''}`)
          const { products, total, page, limit, pages } = data.data
          set({ marketplaceProducts: products, marketplaceMeta: { total, page, limit, pages } })
          return products
        } catch (e) { return [] }
      },

      // Categories that actually have active, purchasable listings — with real counts.
      fetchPublicCategories: async () => {
        try {
          const { data } = await api.get('/marketplace/categories')
          const categories = data.data.categories
          set({ publicCategories: categories })
          return categories
        } catch (e) { return [] }
      },

      // ── Storeroom (Admin) ────────────────────────
      fetchStoreroomProducts: async (params = {}) => {
        try {
          const q = new URLSearchParams(params).toString()
          const { data } = await api.get(`/products${q ? '?' + q : ''}`)
          const { products, categories } = data.data
          set({ storeroomProducts: products, categories })
          return products
        } catch (e) { return [] }
      },

      addStoreroomProduct: async (product) => {
        const { data } = await api.post('/products', product)
        const p = data.data.product
        set((state) => ({ storeroomProducts: [p, ...state.storeroomProducts] }))
        return p
      },

      editStoreroomProduct: async (id, updated) => {
        const { data } = await api.put(`/products/${id}`, updated)
        const p = data.data.product
        set((state) => ({
          storeroomProducts: state.storeroomProducts.map(sp => sp.id === id ? p : sp)
        }))
        return p
      },

      removeStoreroomProduct: async (id) => {
        await api.delete(`/products/${id}`)
        set((state) => ({
          storeroomProducts: state.storeroomProducts.filter(p => p.id !== id)
        }))
      },

      // Returns { imported, failed, errors } on success, or { imported: 0, failed: 0, errors: [], parseError: '<message>' }
      // if the JSON itself was malformed (couldn't even reach the server).
      bulkUploadProducts: async (productsJson) => {
        let list
        try {
          list = JSON.parse(productsJson)
          if (!Array.isArray(list)) throw new Error('Payload must be a JSON array')
        } catch (e) {
          return { imported: 0, failed: 0, errors: [], parseError: e.message }
        }
        const { data } = await api.post('/products/bulk', { products: list })
        await get().fetchStoreroomProducts()
        return data.data
      },

      // ── Seller Products ──────────────────────────
      fetchSellerProducts: async (email) => {
        try {
          const { data } = await api.get('/seller/products')
          const products = data.data.products
          set((state) => ({ sellerProducts: { ...state.sellerProducts, [email]: products } }))
          return products
        } catch (e) { return [] }
      },

      importProductToSellerStore: async (sellerEmail, globalId) => {
        try {
          const { data } = await api.post(`/seller/products/import/${globalId}`)
          const p = data.data.product
          set((state) => {
            const current = state.sellerProducts[sellerEmail] || []
            return { sellerProducts: { ...state.sellerProducts, [sellerEmail]: [p, ...current] } }
          })
          return p
        } catch (e) {
          throw e
        }
      },

      removeSellerProduct: async (sellerEmail, id) => {
        await api.delete(`/seller/products/${id}`)
        set((state) => {
          const current = state.sellerProducts[sellerEmail] || []
          return { sellerProducts: { ...state.sellerProducts, [sellerEmail]: current.filter(p => p.id !== id) } }
        })
      },

      updateSellerProduct: async (sellerEmail, id, updates) => {
        const { data } = await api.put(`/seller/products/${id}`, updates)
        const p = data.data.product
        set((state) => {
          const current = state.sellerProducts[sellerEmail] || []
          return { sellerProducts: { ...state.sellerProducts, [sellerEmail]: current.map(sp => sp.id === id ? p : sp) } }
        })
        return p
      },
    }),
    { name: 'shopiversa-products-v3' }
  )
)

export default { useProductStore }
export { useProductStore }
