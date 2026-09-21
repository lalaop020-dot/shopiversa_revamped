import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Warehouse, CheckCircle2, PackageCheck, Zap, Info,
  X, Download, Trash2, CheckSquare, Square, MinusSquare
} from 'lucide-react'
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

  const storeroomProducts = useProductStore((s) => s.storeroomProducts)
  const storeroomMeta    = useProductStore((s) => s.storeroomMeta)
  const importedIds      = useProductStore((s) => s.sellerImportedIds[sellerEmail]) || []
  const sellerProducts   = useProductStore((s) => s.sellerProducts[sellerEmail])    || []
  const importProduct    = useProductStore((s) => s.importProductToSellerStore)
  const removeProduct    = useProductStore((s) => s.removeSellerProduct)

  // globalId → seller-local product id  (needed to call removeSellerProduct)
  const globalToSellerId = useMemo(() => {
    const map = {}
    sellerProducts.forEach((p) => { if (p.globalId) map[p.globalId] = p.id })
    return map
  }, [sellerProducts])

  // Active subscription
  const sub          = usePlatformStore((s) => s.sellerSubscriptions[sellerEmail] || DEFAULT_SUBSCRIPTION)
  const packageLimit = PACKAGE_LIMITS[sub?.name] ?? 300

  const [searchTerm,     setSearchTerm]     = useState('')
  const [debouncedSearch,setDebouncedSearch] = useState('')
  const [page,           setPage]           = useState(1)

  // Per-card loading states
  const [singleLoading,  setSingleLoading]  = useState(null)   // product.id being single-acted on

  // Multi-select state  (Set of storeroom product ids)
  const [selected,       setSelected]       = useState(new Set())
  const [isBulkWorking,  setIsBulkWorking]  = useState(false)

  // ── Data fetching ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchTerm.trim()); setPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const params = { page, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    useProductStore.getState().fetchStoreroomProducts(params)
  }, [page, debouncedSearch])

  useEffect(() => {
    useProductStore.getState().fetchSellerImportedIds(sellerEmail)
    useProductStore.getState().fetchSellerProducts(sellerEmail, { page: 1, limit: 2000 })
  }, [sellerEmail])

  // Clear selection when page/search changes
  useEffect(() => { setSelected(new Set()) }, [page, debouncedSearch])

  // ── Helper refreshers ─────────────────────────────────
  const refreshAll = useCallback(async () => {
    await useProductStore.getState().fetchSellerImportedIds(sellerEmail)
    await useProductStore.getState().fetchSellerProducts(sellerEmail, { page: 1, limit: 2000 })
    const params = { page, limit: LIMIT }
    if (debouncedSearch) params.search = debouncedSearch
    await useProductStore.getState().fetchStoreroomProducts(params)
  }, [sellerEmail, page, debouncedSearch])

  // ── Quota helpers ─────────────────────────────────────
  const usedSlots      = importedIds.length
  const remainingSlots = Math.max(0, packageLimit - usedSlots)
  const usedPercent    = Math.min(100, Math.round((usedSlots / packageLimit) * 100))
  const barColour      = usedPercent >= 90 ? 'bg-red-500' : usedPercent >= 70 ? 'bg-yellow-500' : 'bg-primary'

  // ── Selection helpers ─────────────────────────────────
  const toggleSelect = (productId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(productId) ? next.delete(productId) : next.add(productId)
      return next
    })
  }

  // "Select page" toggle logic
  const pageIds          = storeroomProducts.map((p) => p.id)
  const allPageSelected  = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const somePageSelected = pageIds.some((id) => selected.has(id))

  const togglePageSelection = () => {
    if (allPageSelected) {
      setSelected((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelected((prev) => { const n = new Set(prev); pageIds.forEach((id) => n.add(id)); return n })
    }
  }

  // Classify selected items
  const selectedToImport = storeroomProducts
    .filter((p) => selected.has(p.id) && !importedIds.includes(p.id))
  const selectedToRemove = storeroomProducts
    .filter((p) => selected.has(p.id) && importedIds.includes(p.id))

  // ── Single-card actions ───────────────────────────────
  const handleSingleImport = async (product) => {
    if (importedIds.length >= packageLimit) {
      toast.error(`Your ${sub?.name} plan allows max ${packageLimit} products. Upgrade to import more.`)
      return
    }
    setSingleLoading(product.id)
    try {
      await importProduct(sellerEmail, product.id)
      toast.success(`${product.name} imported to your store!`)
      await refreshAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to import product')
    } finally {
      setSingleLoading(null)
    }
  }

  const handleSingleRemove = async (product) => {
    const sellerId = globalToSellerId[product.id]
    if (!sellerId) {
      toast.error('Cannot find this product in your store to remove.')
      return
    }
    setSingleLoading(product.id)
    try {
      await removeProduct(sellerEmail, sellerId)
      toast.success(`${product.name} removed from your store.`)
      await refreshAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove product')
    } finally {
      setSingleLoading(null)
    }
  }

  // ── Bulk-import selected ──────────────────────────────
  const handleImportSelected = useCallback(async () => {
    if (selectedToImport.length === 0) return

    const canImport = Math.min(selectedToImport.length, remainingSlots)
    if (canImport === 0) {
      toast.error(`Package limit of ${packageLimit} reached. Upgrade to import more.`)
      return
    }
    if (canImport < selectedToImport.length) {
      toast(`Only ${canImport} of ${selectedToImport.length} selected products can be imported (quota limit).`, { icon: '⚠️' })
    }

    setIsBulkWorking(true)
    const toastId = toast.loading(`Importing ${canImport} product${canImport !== 1 ? 's' : ''}…`)
    let success = 0, fail = 0

    for (const product of selectedToImport.slice(0, canImport)) {
      try { await importProduct(sellerEmail, product.id); success++ }
      catch { fail++ }
    }

    await refreshAll()
    setSelected(new Set())
    toast.dismiss(toastId)
    if (fail === 0) toast.success(`✅ ${success} product${success !== 1 ? 's' : ''} imported!`)
    else toast(`Imported ${success}, ${fail} failed.`, { icon: '⚠️' })
    setIsBulkWorking(false)
  }, [selectedToImport, remainingSlots, packageLimit, importProduct, sellerEmail, refreshAll])

  // ── Bulk-remove selected ──────────────────────────────
  const handleRemoveSelected = useCallback(async () => {
    if (selectedToRemove.length === 0) return

    const missing = selectedToRemove.filter((p) => !globalToSellerId[p.id])
    if (missing.length > 0) {
      toast.error('Some selected products could not be matched to your store.')
      return
    }

    setIsBulkWorking(true)
    const toastId = toast.loading(`Removing ${selectedToRemove.length} product${selectedToRemove.length !== 1 ? 's' : ''}…`)
    let success = 0, fail = 0

    for (const product of selectedToRemove) {
      try { await removeProduct(sellerEmail, globalToSellerId[product.id]); success++ }
      catch { fail++ }
    }

    await refreshAll()
    setSelected(new Set())
    toast.dismiss(toastId)
    if (fail === 0) toast.success(`🗑️ ${success} product${success !== 1 ? 's' : ''} removed from your store.`)
    else toast(`Removed ${success}, ${fail} failed.`, { icon: '⚠️' })
    setIsBulkWorking(false)
  }, [selectedToRemove, globalToSellerId, removeProduct, sellerEmail, refreshAll])

  // ── Select All (bulk fill quota) ──────────────────────
  const handleSelectAll = useCallback(async () => {
    if (remainingSlots <= 0) {
      toast.error(`You've reached the ${packageLimit} product limit for your ${sub?.name} plan.`)
      return
    }

    setIsBulkWorking(true)
    const toastId = toast.loading(`Importing up to ${remainingSlots} products…`)

    try {
      let allProducts = [], fetchPage = 1
      const fetchLimit = 100

      while (allProducts.length < remainingSlots) {
        const fetched = await useProductStore.getState().fetchStoreroomProducts({ page: fetchPage, limit: fetchLimit })
        if (!fetched || fetched.length === 0) break
        allProducts = [...allProducts, ...fetched.filter((p) => !importedIds.includes(p.id))]
        if (fetched.length < fetchLimit) break
        fetchPage++
      }

      const toImport = allProducts.slice(0, remainingSlots)
      if (toImport.length === 0) {
        toast.dismiss(toastId)
        toast('All available products are already in your store.', { icon: '✅' })
        setIsBulkWorking(false)
        return
      }

      let success = 0, fail = 0
      for (const p of toImport) {
        try { await importProduct(sellerEmail, p.id); success++ }
        catch { fail++ }
      }

      await refreshAll()
      toast.dismiss(toastId)
      if (fail === 0) toast.success(`✅ ${success} product${success !== 1 ? 's' : ''} imported!`)
      else toast(`Imported ${success}, ${fail} failed.`, { icon: '⚠️' })
    } catch {
      toast.dismiss(toastId)
      toast.error('Bulk import encountered an error. Please try again.')
    } finally {
      setIsBulkWorking(false)
    }
  }, [importedIds, remainingSlots, packageLimit, sub, sellerEmail, importProduct, refreshAll])

  const totalSelected  = selected.size
  const hasSelection   = totalSelected > 0

  return (
    <div className="space-y-8 animate-fade-in pb-28">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" /> Admin Storeroom
          </h1>
          <p className="text-slate-400">
            Click a product card to select it, then import or remove in bulk. Or use quick actions on hover.
          </p>
        </div>

        <Button
          onClick={handleSelectAll}
          disabled={isBulkWorking || remainingSlots === 0}
          className="flex items-center gap-2 shrink-0"
          title={remainingSlots === 0 ? `Package limit reached` : `Fill quota from storeroom`}
        >
          {isBulkWorking && !hasSelection ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
          ) : (
            <><Zap className="w-4 h-4" /> Select All ({remainingSlots} left)</>
          )}
        </Button>
      </div>

      {/* ── Quota bar ────────────────────────────────── */}
      <div className="glass-card p-4 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-300 font-medium">
            <PackageCheck className="w-4 h-4 text-primary" />
            Product Quota — <span className="font-bold text-white">{sub?.name} Plan</span>
          </span>
          <span className={`font-bold ${usedPercent >= 90 ? 'text-red-400' : 'text-slate-300'}`}>
            {usedSlots} / {packageLimit} used
          </span>
        </div>
        <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${barColour}`} style={{ width: `${usedPercent}%` }} />
        </div>
        {remainingSlots === 0 ? (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Limit reached. Upgrade to import more products.
          </p>
        ) : (
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining under your <strong className="text-slate-400">{sub?.name}</strong> plan.
          </p>
        )}
      </div>

      {/* ── Search + page-select toggle ───────────────── */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-grow">
          <Input
            placeholder="Search approved products by name or category..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>

        {/* Page-select toggle */}
        <button
          onClick={togglePageSelection}
          title={allPageSelected ? 'Deselect this page' : 'Select this page'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-border hover:border-primary/50 text-slate-400 hover:text-white transition-all text-sm whitespace-nowrap"
        >
          {allPageSelected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : somePageSelected ? (
            <MinusSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {allPageSelected ? 'Deselect Page' : 'Select Page'}
        </button>
      </div>

      {/* ── Product grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {storeroomProducts.map((product) => {
          const isImported  = importedIds.includes(product.id)
          const isSelected  = selected.has(product.id)
          const isLoading   = singleLoading === product.id

          return (
            <div
              key={product.id}
              className={`relative group cursor-pointer rounded-2xl transition-all duration-200
                ${isSelected
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'ring-1 ring-transparent hover:ring-slate-600'
                }`}
              onClick={() => toggleSelect(product.id)}
            >
              {/* Selection checkbox overlay */}
              <div className="absolute top-3 left-3 z-20">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected
                    ? 'bg-primary border-primary'
                    : 'bg-black/40 border-white/40 backdrop-blur-sm'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>

              {/* Imported badge */}
              {isImported && !isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-green-500 text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}

              {/* Remove badge when imported + selected */}
              {isImported && isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-red-500 text-white rounded-full p-1.5 shadow-md flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
              )}

              <ProductCard
                product={product}
                onImport={!isImported ? (e) => { e?.stopPropagation?.(); handleSingleImport(product) } : undefined}
                onRemove={isImported ? (e) => { e?.stopPropagation?.(); handleSingleRemove(product) } : undefined}
                isImported={isImported}
                isLoading={isLoading}
              />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-30 bg-black/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
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

      {/* ── Floating bulk action bar ──────────────────── */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="glass-card border border-dark-border/80 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Count chip */}
            <div className="flex items-center gap-2 text-sm font-semibold text-white pr-3 border-r border-dark-border">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                {totalSelected}
              </div>
              Selected
            </div>

            {/* Import button — only shown if some selected are NOT yet imported */}
            {selectedToImport.length > 0 && (
              <Button
                size="sm"
                onClick={handleImportSelected}
                disabled={isBulkWorking}
                className="flex items-center gap-2"
              >
                {isBulkWorking ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Import {selectedToImport.length > 0 && `(${selectedToImport.length})`}
              </Button>
            )}

            {/* Remove button — only shown if some selected are already imported */}
            {selectedToRemove.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemoveSelected}
                disabled={isBulkWorking}
                className="flex items-center gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                {isBulkWorking ? (
                  <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Remove {selectedToRemove.length > 0 && `(${selectedToRemove.length})`}
              </Button>
            )}

            {/* Clear selection */}
            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 rounded-lg hover:bg-dark-bg text-slate-400 hover:text-white transition-all ml-1"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
