import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, ExternalLink, ShieldCheck, CheckSquare, Square, MinusSquare, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Pagination } from '../../components/common/Pagination'
import { formatCurrency, PRODUCT_PLACEHOLDER } from '../../utils/formatters'
import useAuthStore from '../../store/useAuthStore'
import { useProductStore } from '../../store/useProductStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const LIMIT = 20

export default function MyProducts() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const sellerEmail = user?.email || 'seller@demo.com'

  const sellerProducts = useProductStore((state) => state.sellerProducts[sellerEmail]) || []
  const sellerProductsMeta = useProductStore((state) => state.sellerProductsMeta[sellerEmail]) ||
    { total: 0, page: 1, limit: LIMIT, pages: 1 }
  const removeSellerProduct = useProductStore((state) => state.removeSellerProduct)
  const updateSellerProduct = useProductStore((state) => state.updateSellerProduct)

  const [searchTerm, setSearchTerm]       = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]                   = useState(1)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editStock, setEditStock]         = useState('')

  // Multi-select state
  const [selected, setSelected]           = useState(new Set())  // seller product ids
  const [isBulkRemoving, setIsBulkRemoving] = useState(false)

  // ── Debounce ───────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const load = useCallback((targetPage = page) => {
    const params = { page: targetPage, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    return useProductStore.getState().fetchSellerProducts(sellerEmail, params)
  }, [sellerEmail, page, debouncedSearch])

  useEffect(() => { load(page) }, [sellerEmail, page, debouncedSearch])

  // Clear selection on page/search change
  useEffect(() => { setSelected(new Set()) }, [page, debouncedSearch])

  // ── Selection helpers ─────────────────────────────────
  const pageIds        = sellerProducts.map((p) => p.id)
  const allSelected    = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected   = pageIds.some((id) => selected.has(id))
  const totalSelected  = selected.size
  const hasSelection   = totalSelected > 0

  const toggleRow = (id) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const toggleAll = () => {
    setSelected((prev) => {
      const n = new Set(prev)
      allSelected ? pageIds.forEach((id) => n.delete(id)) : pageIds.forEach((id) => n.add(id))
      return n
    })
  }

  const clearSelection = () => setSelected(new Set())

  // ── Single delete ─────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your store?`)) return
    await removeSellerProduct(sellerEmail, id)
    toast.success(`${name} removed from your storefront`)
    if (sellerProducts.length === 1 && page > 1) setPage(page - 1); else load(page)
  }

  // ── Bulk remove ────────────────────────────────────────
  const handleBulkRemove = useCallback(async () => {
    if (selected.size === 0) return
    const names = sellerProducts.filter((p) => selected.has(p.id)).map((p) => p.name)
    if (!window.confirm(`Remove ${selected.size} product${selected.size !== 1 ? 's' : ''} from your store?\n\n${names.slice(0, 5).join(', ')}${names.length > 5 ? ` and ${names.length - 5} more…` : ''}`)) return

    setIsBulkRemoving(true)
    const toastId = toast.loading(`Removing ${selected.size} product${selected.size !== 1 ? 's' : ''}…`)
    let ok = 0, fail = 0

    for (const id of selected) {
      try { await removeSellerProduct(sellerEmail, id); ok++ } catch { fail++ }
    }

    clearSelection()
    // Recalculate page after removal
    const newTotal = (sellerProductsMeta.total || 0) - ok
    const newPages = Math.max(1, Math.ceil(newTotal / LIMIT))
    const targetPage = Math.min(page, newPages)
    if (targetPage !== page) setPage(targetPage); else load(page)

    toast.dismiss(toastId)
    fail === 0
      ? toast.success(`🗑️ ${ok} product${ok !== 1 ? 's' : ''} removed from your store.`)
      : toast(`Removed ${ok}, ${fail} failed.`, { icon: '⚠️' })
    setIsBulkRemoving(false)
  }, [selected, sellerProducts, removeSellerProduct, sellerEmail, page, sellerProductsMeta, load])

  // ── Edit ───────────────────────────────────────────────
  const handleEditClick = (product) => {
    setEditingProduct(product)
    setEditStock(product.stock)
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (editStock === '' || parseInt(editStock) < 0) { toast.error('Invalid stock quantity'); return }
    try {
      // Price is set by the server from your package's profit rate — never sent from here.
      await updateSellerProduct(sellerEmail, editingProduct.id, {
        stock: parseInt(editStock),
        status: parseInt(editStock) === 0 ? 'Out of Stock' : 'Active'
      })
      toast.success('Product updated successfully!')
      setEditingProduct(null)
    } catch (error) {
      // Only claim success once the server has actually saved it.
      toast.error(error?.response?.data?.message || 'Could not update the product')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Products</h1>
          <p className="text-slate-400">
            View your listings and update stock. Prices follow your package's profit rate. Select multiple products to remove them in bulk.
          </p>
        </div>
        <Button onClick={() => navigate('/seller/storehouse')}>
          <Plus className="w-4 h-4" /> Import from Storeroom
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search your imported products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                {/* Select-all checkbox */}
                <th className="px-4 py-4 w-10">
                  <button
                    onClick={toggleAll}
                    className="flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                    title={allSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  >
                    {allSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : someSelected
                        ? <MinusSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />
                    }
                  </button>
                </th>
                <th className="px-4 py-4 font-medium">Product</th>
                <th className="px-4 py-4 font-medium">Price</th>
                <th className="px-4 py-4 font-medium">Stock</th>
                <th className="px-4 py-4 font-medium">Sales</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sellerProducts.map((product) => {
                const isSelected = selected.has(product.id)
                return (
                  <tr
                    key={product.id}
                    className={`transition-colors cursor-pointer
                      ${isSelected
                        ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-dark-bg/50'
                      }`}
                    onClick={() => toggleRow(product.id)}
                  >
                    {/* Row checkbox */}
                    <td className="px-4 py-4" onClick={(e) => { e.stopPropagation(); toggleRow(product.id) }}>
                      <div className="flex items-center justify-center">
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4 text-slate-500" />
                        }
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image || PRODUCT_PLACEHOLDER}
                          alt={product.name}
                          className="w-10 h-10 bg-slate-800 rounded-lg object-cover shrink-0"
                        />
                        <div>
                          <div className="font-bold text-sm">{product.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold">{formatCurrency(product.price)}</td>
                    <td className="px-4 py-4">
                      <span className={product.stock === 0 ? 'text-red-500 font-bold' : 'text-slate-300'}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-400">{product.sales}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        product.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/product/${product.globalId}`}
                          target="_blank"
                          className="p-2 hover:bg-dark-bg rounded-lg text-slate-400 hover:text-white transition-all"
                          title="View in marketplace"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleEditClick(product)}
                          className="p-2 hover:bg-dark-bg rounded-lg text-slate-400 hover:text-white transition-all"
                          title="Edit price & stock"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"
                          title="Remove from store"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {sellerProducts.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-500">
                    You have not imported any products yet.{' '}
                    <button onClick={() => navigate('/seller/storehouse')} className="text-primary underline">
                      Go to the Storeroom
                    </button>{' '}
                    to select items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={sellerProductsMeta.page}
        pages={sellerProductsMeta.pages}
        total={sellerProductsMeta.total}
        limit={sellerProductsMeta.limit}
        onPageChange={setPage}
      />

      {/* Floating bulk remove bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-lg"
          >
            <div className="glass-card border border-dark-border/80 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
              {/* Count */}
              <div className="flex items-center gap-2 text-sm font-semibold text-white pr-3 border-r border-dark-border shrink-0">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">
                  {totalSelected}
                </div>
                product{totalSelected !== 1 ? 's' : ''} selected
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkRemove}
                  disabled={isBulkRemoving}
                  className="flex items-center gap-1.5 border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  {isBulkRemoving
                    ? <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  Remove ({totalSelected})
                </Button>

                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-lg hover:bg-dark-bg text-slate-400 hover:text-white transition-all"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingProduct(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md p-8 rounded-2xl relative z-10"
          >
            <h2 className="text-xl font-bold mb-2">Adjust Offer Details</h2>
            <p className="text-xs text-slate-400 mb-6">
              You are modifying options for <strong className="text-white">{editingProduct.name}</strong>. Product titles, descriptions, and images can only be altered by system administrators.
            </p>
            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              <div className="p-3 bg-dark-bg border border-dark-border rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Storeroom price</span><span>{formatCurrency(editingProduct.storeroomPrice ?? editingProduct.price)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Your store price</span><span className="font-bold">{formatCurrency(editingProduct.price)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Your profit per unit</span><span className="font-bold text-green-500">+{formatCurrency(editingProduct.profitPerUnit ?? 0)}</span></div>
                <p className="text-[10px] text-slate-500 pt-1">Store price is set automatically from your package's profit rate.</p>
              </div>
              <Input
                label="Your Stock Quantity"
                type="number"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                required
              />
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-slate-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Default system parameters remain intact. The changes apply to your storefront listings only.</span>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setEditingProduct(null)}>Cancel</Button>
                <Button type="submit" className="flex-grow">Save Changes</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
