import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api/axios'

const useProductStore = create(
  persist(
    (set) => ({
      storeroomProducts: [],
      storeroomMeta: { total: 0, page: 1, limit: 20, pages: 1 },
      sellerProducts: {},
      sellerProductsMeta: {},
      sellerImportedIds: {},
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
        } catch { return [] }
      },

      // Categories that actually have active, purchasable listings — with real counts.
      fetchPublicCategories: async () => {
        try {
          const { data } = await api.get('/marketplace/categories')
          const categories = data.data.categories
          set({ publicCategories: categories })
          return categories
        } catch { return [] }
      },

      // ── Storeroom (Admin) ────────────────────────
      fetchStoreroomProducts: async (params = {}) => {
        try {
          const q = new URLSearchParams(params).toString()
          const { data } = await api.get(`/products${q ? '?' + q : ''}`)
          const { products, categories, total, page, limit, pages } = data.data
          set({ storeroomProducts: products, categories, storeroomMeta: { total, page, limit, pages } })
          return products
        } catch { return [] }
      },

      // Add/remove change the total item count, which the currently-displayed
      // page/total no longer reflects locally — callers should refetch the
      // current page (fetchStoreroomProducts) after these resolve.
      addStoreroomProduct: async (product) => {
        const { data } = await api.post('/products', product)
        return data.data.product
      },

      // Editing doesn't change count/order, so it's safe to patch in place.
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
      },

      // Returns { imported, failed, errors } on success, or { imported: 0, failed: 0, errors: [], parseError: '<message>' }
      // if the JSON itself was malformed (couldn't even reach the server).
      // Changes the total item count — caller should refetch afterward.
      bulkUploadProducts: async (productsJson) => {
        let list
        try {
          list = JSON.parse(productsJson)
          if (!Array.isArray(list)) throw new Error('Payload must be a JSON array')
        } catch (e) {
          return { imported: 0, failed: 0, errors: [], parseError: e.message }
        }
        const { data } = await api.post('/products/bulk', { products: list })
        return data.data
      },

      // ── Seller Products ──────────────────────────
      fetchSellerProducts: async (email, params = {}) => {
        try {
          const q = new URLSearchParams(params).toString()
          const { data } = await api.get(`/seller/products${q ? '?' + q : ''}`)
          const { products, total, page, limit, pages } = data.data
          set((state) => ({
            sellerProducts: { ...state.sellerProducts, [email]: products },
            sellerProductsMeta: { ...state.sellerProductsMeta, [email]: { total, page, limit, pages } },
          }))
          return products
        } catch { return [] }
      },

      // Full (unpaginated) set of storeroom ids this seller already imported —
      // for "already imported" badges while browsing the storeroom.
      fetchSellerImportedIds: async (email) => {
        try {
          const { data } = await api.get('/seller/products/imported-ids')
          const globalIds = data.data.globalIds
          set((state) => ({ sellerImportedIds: { ...state.sellerImportedIds, [email]: globalIds } }))
          return globalIds
        } catch { return [] }
      },

      // Import/remove change the seller's total item count — callers should
      // refetch the current page (fetchSellerProducts) after these resolve.
      importProductToSellerStore: async (sellerEmail, globalId) => {
        const { data } = await api.post(`/seller/products/import/${globalId}`)
        return data.data.product
      },

      removeSellerProduct: async (sellerEmail, id) => {
        await api.delete(`/seller/products/${id}`)
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
