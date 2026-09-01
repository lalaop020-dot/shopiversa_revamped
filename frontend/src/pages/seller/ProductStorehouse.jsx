import { useState, useEffect } from 'react'
import { Search, Warehouse, CheckCircle2 } from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { Input } from '../../components/common/Input'
import { Pagination } from '../../components/common/Pagination'
import useAuthStore from '../../store/useAuthStore'
import { useProductStore } from '../../store/useProductStore'
import toast from 'react-hot-toast'

const LIMIT = 24

export default function ProductStorehouse() {
  const { user } = useAuthStore()
  const sellerEmail = user?.email || 'seller@demo.com'

  const storeroomProducts = useProductStore((state) => state.storeroomProducts)
  const storeroomMeta = useProductStore((state) => state.storeroomMeta)
  const importedIds = useProductStore((state) => state.sellerImportedIds[sellerEmail]) || []
  const importProduct = useProductStore((state) => state.importProductToSellerStore)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isImporting, setIsImporting] = useState(null)

  // Debounce the search box so we don't fire a request per keystroke, and
  // jump back to page 1 whenever the search term actually changes.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const params = { page, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    useProductStore.getState().fetchStoreroomProducts(params)
  }, [page, debouncedSearch])

  useEffect(() => {
    useProductStore.getState().fetchSellerImportedIds(sellerEmail)
  }, [sellerEmail])

  const handleImport = async (product) => {
    setIsImporting(product.id)
    try {
      await importProduct(sellerEmail, product.id)
      toast.success(`${product.name} imported to your store!`)
      useProductStore.getState().fetchSellerImportedIds(sellerEmail)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to import product')
    } finally {
      setIsImporting(null)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" /> Admin Storeroom
          </h1>
          <p className="text-slate-400">Choose from products pre-approved and imported by default by the system administrators.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search approved products by name or category..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {storeroomProducts.map((product) => {
          const isAlreadyImported = importedIds.includes(product.id)
          return (
            <div key={product.id} className="relative group">
              <ProductCard
                product={product}
                onImport={() => handleImport(product)}
                isImported={isAlreadyImported}
                isLoading={isImporting === product.id}
              />
              {isAlreadyImported && (
                <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {storeroomProducts.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-dark-border rounded-xl">
          <div className="text-slate-500">No products found matching your search.</div>
        </div>
      )}

      <Pagination
        page={storeroomMeta.page}
        pages={storeroomMeta.pages}
        total={storeroomMeta.total}
        limit={storeroomMeta.limit}
        onPageChange={setPage}
      />
    </div>
  )
}
