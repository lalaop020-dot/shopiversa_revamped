import { useState, useEffect, useCallback } from 'react'
import { Search, Warehouse, CheckCircle2, PackageCheck, Zap, Info } from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { Pagination } from '../../components/common/Pagination'
import useAuthStore from '../../store/useAuthStore'
import { useProductStore } from '../../store/useProductStore'
import usePlatformStore, { DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import toast from 'react-hot-toast'

const LIMIT = 24

// Package → max product slots
const PACKAGE_LIMITS = {
  Silver: 300,
  Gold: 1000,
  Platinum: 2000,
}

export default function ProductStorehouse() {
  const { user } = useAuthStore()
  const sellerEmail = user?.email || 'seller@demo.com'

  const storeroomProducts = useProductStore((state) => state.storeroomProducts)
  const storeroomMeta = useProductStore((state) => state.storeroomMeta)
  const importedIds = useProductStore((state) => state.sellerImportedIds[sellerEmail]) || []
  const importProduct = useProductStore((state) => state.importProductToSellerStore)

  // Active subscription
  const sub = usePlatformStore((state) => state.sellerSubscriptions[sellerEmail] || DEFAULT_SUBSCRIPTION)
  const packageLimit = PACKAGE_LIMITS[sub?.name] ?? 300

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isImporting, setIsImporting] = useState(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)

  // Debounce search & jump to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Fetch current page of storeroom
  useEffect(() => {
    const params = { page, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    useProductStore.getState().fetchStoreroomProducts(params)
  }, [page, debouncedSearch])

  // Fetch already-imported ids
  useEffect(() => {
    useProductStore.getState().fetchSellerImportedIds(sellerEmail)
  }, [sellerEmail])

  const handleImport = async (product) => {
    // Single-import: check if limit is already reached
    if (importedIds.length >= packageLimit) {
      toast.error(
        `Your ${sub?.name} package allows a maximum of ${packageLimit} products. Upgrade your plan to import more.`
      )
      return
    }

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

  /**
   * Bulk-import all storeroom products up to the package limit.
   * Fetches ALL storeroom products (no search filter) to fill the quota
   * starting from the first page, then imports as many as the remaining
   * slots allow — entirely on the frontend.
   */
  const handleSelectAll = useCallback(async () => {
    const alreadyImported = importedIds.length
    const remaining = packageLimit - alreadyImported

    if (remaining <= 0) {
      toast.error(
        `You have already reached the maximum of ${packageLimit} products for your ${sub?.name} package.`
      )
      return
    }

    setIsBulkImporting(true)
    const toastId = toast.loading(`Importing up to ${remaining} products…`)

    try {
      // Fetch enough products to fill remaining slots (up to packageLimit total pages)
      let allProducts = []
      let fetchPage = 1
      const fetchLimit = 100 // large page to minimise round-trips

      while (allProducts.length < remaining) {
        const params = { page: fetchPage, limit: fetchLimit }
        const fetched = await useProductStore.getState().fetchStoreroomProducts(params)
        if (!fetched || fetched.length === 0) break

        // Only keep products not yet imported
        const notImported = fetched.filter((p) => !importedIds.includes(p.id))
        allProducts = [...allProducts, ...notImported]

        if (fetched.length < fetchLimit) break // last page
        fetchPage++
      }

      // Trim to the remaining quota
      const toImport = allProducts.slice(0, remaining)

      if (toImport.length === 0) {
        toast.dismiss(toastId)
        toast('All available products are already in your store.', { icon: '✅' })
        setIsBulkImporting(false)
        return
      }

      let successCount = 0
      let failCount = 0

      for (const product of toImport) {
        try {
          await importProduct(sellerEmail, product.id)
          successCount++
        } catch {
          failCount++
        }
      }

      // Refresh imported IDs and storeroom page
      await useProductStore.getState().fetchSellerImportedIds(sellerEmail)
      const params = { page, limit: LIMIT }
      if (debouncedSearch) params.search = debouncedSearch
      await useProductStore.getState().fetchStoreroomProducts(params)

      toast.dismiss(toastId)
      if (failCount === 0) {
        toast.success(`✅ ${successCount} product${successCount !== 1 ? 's' : ''} imported successfully!`)
      } else {
        toast(
          `Imported ${successCount} product${successCount !== 1 ? 's' : ''}. ${failCount} failed.`,
          { icon: '⚠️' }
        )
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Bulk import encountered an error. Please try again.')
    } finally {
      setIsBulkImporting(false)
    }
  }, [importedIds, packageLimit, sub, sellerEmail, importProduct, page, debouncedSearch])

  const usedSlots = importedIds.length
  const remainingSlots = Math.max(0, packageLimit - usedSlots)
  const usedPercent = Math.min(100, Math.round((usedSlots / packageLimit) * 100))

  // Colour for the quota bar
  const barColour =
    usedPercent >= 90 ? 'bg-red-500' : usedPercent >= 70 ? 'bg-yellow-500' : 'bg-primary'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" /> Admin Storeroom
          </h1>
          <p className="text-slate-400">
            Choose from products pre-approved and imported by default by the system administrators.
          </p>
        </div>

        {/* Select All Button */}
        <Button
          onClick={handleSelectAll}
          disabled={isBulkImporting || remainingSlots === 0}
          className="flex items-center gap-2 shrink-0"
          title={
            remainingSlots === 0
              ? `Package limit of ${packageLimit} reached`
              : `Import up to ${remainingSlots} more products (${sub?.name} plan)`
          }
        >
          {isBulkImporting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Select All ({remainingSlots} left)
            </>
          )}
        </Button>
      </div>

      {/* Package quota bar */}
      <div className="glass-card p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-300 font-medium">
            <PackageCheck className="w-4 h-4 text-primary" />
            Product Quota —{' '}
            <span className="font-bold text-white">
              {sub?.name} Plan
            </span>
          </span>
          <span className={`font-bold ${usedPercent >= 90 ? 'text-red-400' : 'text-slate-300'}`}>
            {usedSlots} / {packageLimit} used
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColour}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>

        {remainingSlots === 0 ? (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Info className="w-3 h-3" />
            You've reached your {sub?.name} package limit. Upgrade to import more products.
          </p>
        ) : (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {remainingSlots} more product{remainingSlots !== 1 ? 's' : ''} can be imported under your{' '}
            <strong className="text-slate-400">{sub?.name}</strong> plan.
          </p>
        )}
      </div>

      {/* Search */}
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

      {/* Product grid */}
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
