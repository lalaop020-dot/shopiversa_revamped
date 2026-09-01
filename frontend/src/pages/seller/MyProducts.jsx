import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, ExternalLink, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Pagination } from '../../components/common/Pagination'
import { formatCurrency } from '../../utils/formatters'
import useAuthStore from '../../store/useAuthStore'
import { useProductStore } from '../../store/useProductStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

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

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingProduct, setEditingProduct] = useState(null)

  // Debounce the search box so we don't fire a request per keystroke, and
  // jump back to page 1 whenever the search term actually changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const load = (targetPage = page) => {
    const params = { page: targetPage, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    return useProductStore.getState().fetchSellerProducts(sellerEmail, params)
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerEmail, page, debouncedSearch])

  // Edit Form States
  const [editPrice, setEditPrice] = useState('')
  const [editStock, setEditStock] = useState('')

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your store?`)) return
    await removeSellerProduct(sellerEmail, id)
    toast.success(`${name} removed from your storefront`)
    // If that was the last item on this page, step back a page; otherwise refresh it.
    if (sellerProducts.length === 1 && page > 1) setPage(page - 1); else load(page)
  }

  const handleEditClick = (product) => {
    setEditingProduct(product)
    setEditPrice(product.price)
    setEditStock(product.stock)
  }

  const handleUpdateSubmit = (e) => {
    e.preventDefault()
    if (!editPrice || parseFloat(editPrice) < 0) {
      toast.error('Invalid price amount')
      return
    }
    if (editStock === '' || parseInt(editStock) < 0) {
      toast.error('Invalid stock quantity')
      return
    }

    updateSellerProduct(sellerEmail, editingProduct.id, {
      price: parseFloat(editPrice),
      stock: parseInt(editStock),
      status: parseInt(editStock) === 0 ? 'Out of Stock' : 'Active'
    })

    toast.success('Product configurations updated successfully!')
    setEditingProduct(null)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Products</h1>
          <p className="text-slate-400">View and adjust pricing/stock for products imported from the system storeroom.</p>
        </div>
        <Button onClick={() => navigate('/seller/storehouse')}>
          <Plus className="w-4 h-4" /> Import from Storeroom
        </Button>
      </div>

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

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium">Sales</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sellerProducts.map((product) => (
                <tr key={product.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'} 
                        alt={product.name} 
                        className="w-10 h-10 bg-slate-800 rounded-lg object-cover shrink-0" 
                      />
                      <div>
                        <div className="font-bold text-sm">{product.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4">
                    <span className={product.stock === 0 ? 'text-red-500 font-bold' : 'text-slate-300'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{product.sales}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      product.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Link to={`/product/${product.globalId}`} target="_blank" className="p-2 hover:bg-dark-bg rounded-lg text-slate-400 hover:text-white transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleEditClick(product)}
                      className="p-2 hover:bg-dark-bg rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id, product.name)}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sellerProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-500">
                    You have not imported any products yet. Go to the Storeroom to select items.
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

      {/* Edit stock and price modal */}
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
              <Input 
                label="Your Store Price ($)" 
                type="number"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
              />
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
