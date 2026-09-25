import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Warehouse, CheckCircle2, PackageCheck, Info,
  X, Download, Trash2, CheckSquare, Square, MinusSquare, Zap
} from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { Pagination } from '../../components/common/Pagination'
import useAuthStore from '../../store/useAuthStore'
import { useProductStore } from '../../store/useProductStore'
import usePlatformStore, { DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { PACKAGE_LIMITS, normalizePackageName } from '../../utils/packages'

const LIMIT = 24


export default function ProductStorehouse() {
  const { user } = useAuthStore()
  const sellerEmail = user?.email || 'seller@demo.com'

  const storeroomProducts = useProductStore((s) => s.storeroomProducts)
  const storeroomMeta    = useProductStore((s) => s.storeroomMeta)
  const importedIds      = useProductStore((s) => s.sellerImportedIds[sellerEmail]) || []
  const sellerProducts   = useProductStore((s) => s.sellerProducts[sellerEmail])    || []
  const importProduct    = useProductStore((s) => s.importProductToSellerStore)
  const removeProduct    = useProductStore((s) => s.removeSellerProduct)

  // globalId → seller-local product id (for removal)
  const globalToSellerId = useMemo(() => {
    const map = {}
    sellerProducts.forEach((p) => { if (p.globalId) map[p.globalId] = p.id })
    return map
  }, [sellerProducts])

  const sub          = usePlatformStore((s) => s.sellerSubscriptions[sellerEmail] || DEFAULT_SUBSCRIPTION)
  const packageLimit = PACKAGE_LIMITS[normalizePackageName(sub?.name)] ?? 300

  const [searchTerm,      setSearchTerm]      = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page,            setPage]            = useState(1)
  const [singleLoading,   setSingleLoading]   = useState(null)
  const [selected,        setSelected]        = useState(new Set())  // storeroom product ids
  const [isBulkWorking,   setIsBulkWorking]   = useState(false)

  // ── Debounce / data fetch ──────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    const p = { page, limit: LIMIT }
    if (debouncedSearch) p.search = debouncedSearch
    useProductStore.getState().fetchStoreroomProducts(p)
  }, [page, debouncedSearch])

  useEffect(() => {
    useProductStore.getState().fetchSellerImportedIds(sellerEmail)
    useProductStore.getState().fetchSellerProducts(sellerEmail, { page: 1, limit: 5000 })
    // The product limit depends on the plan, so make sure it's the current one.
    usePlatformStore.getState().fetchCurrentPackage()
  }, [sellerEmail])

  // Clear selection on page / search change
  useEffect(() => { setSelected(new Set()) }, [page, debouncedSearch])

  // ── Refresh helper ─────────────────────────────────────
  const refreshAll = useCallback(async () => {
    await useProductStore.getState().fetchSellerImportedIds(sellerEmail)
    await useProductStore.getState().fetchSellerProducts(sellerEmail, { page: 1, limit: 5000 })
    const p = { page, limit: LIMIT }
    if (debouncedSearch) p.search = debouncedSearch
    await useProductStore.getState().fetchStoreroomProducts(p)
  }, [sellerEmail, page, debouncedSearch])

  // ── Quota ──────────────────────────────────────────────
  const usedSlots      = importedIds.length
  const remainingSlots = Math.max(0, packageLimit - usedSlots)
  const usedPercent    = Math.min(100, Math.round((usedSlots / packageLimit) * 100))
  const barColour      = usedPercent >= 90 ? 'bg-red-500' : usedPercent >= 70 ? 'bg-yellow-500' : 'bg-primary'

  // ── Classify selected ──────────────────────────────────
  const selectedToImport = storeroomProducts.filter((p) =>  selected.has(p.id) && !importedIds.includes(p.id))
  const selectedToRemove = storeroomProducts.filter((p) =>  selected.has(p.id) &&  importedIds.includes(p.id))
  const totalSelected    = selected.size
  const hasSelection     = totalSelected > 0

  // ── Page-level toggle ──────────────────────────────────
  const pageIds         = storeroomProducts.map((p) => p.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const someSelected    = pageIds.some((id) => selected.has(id))

  const togglePage = () => {
    setSelected((prev) => {
      const n = new Set(prev)
      allPageSelected ? pageIds.forEach((id) => n.delete(id)) : pageIds.forEach((id) => n.add(id))
      return n
    })
  }

  // ── Individual toggle ─────────────────────────────────
  const toggleCard = (id) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // ── Pre-select up to quota (does NOT import) ───────────
  const handlePreSelectAll = useCallback(async () => {
    if (remainingSlots <= 0) {
      toast.error(`You've reached the ${packageLimit} product limit for your ${sub?.name} plan.`)
      return
    }
    setIsBulkWorking(true)
    const toastId = toast.loading('Loading storeroom products…')
    try {
      let all = [], fp = 1
      while (all.length < remainingSlots) {
        const fetched = await useProductStore.getState().fetchStoreroomProducts({ page: fp, limit: 100 })
        if (!fetched || fetched.length === 0) break
        all = [...all, ...fetched.filter((p) => !importedIds.includes(p.id))]
        if (fetched.length < 100) break
        fp++
      }
      const toSelect = all.slice(0, remainingSlots)
      toast.dismiss(toastId)
      if (toSelect.length === 0) {
        toast('All storeroom products are already in your store.', { icon: '✅' })
      } else {
        setSelected((prev) => { const n = new Set(prev); toSelect.forEach((p) => n.add(p.id)); return n })
        toast.success(`${toSelect.length} product${toSelect.length !== 1 ? 's' : ''} selected — click "Import Selected" to add them.`)
      }
    } catch {
      toast.dismiss(toastId)
      toast.error('Failed to load products. Please try again.')
    } finally {
      setIsBulkWorking(false)
    }
  }, [importedIds, remainingSlots, packageLimit, sub])

  // ── Bulk import selected ───────────────────────────────
  const handleImportSelected = useCallback(async () => {
    if (selectedToImport.length === 0) return
    const canImport = Math.min(selectedToImport.length, remainingSlots)
    if (canImport === 0) {
      toast.error(`Package limit of ${packageLimit} reached. Upgrade to import more.`)
      return
    }
    if (canImport < selectedToImport.length)
      toast(`Only ${canImport} of ${selectedToImport.length} fit your remaining quota.`, { icon: '⚠️' })

    setIsBulkWorking(true)
    const toastId = toast.loading(`Importing ${canImport} product${canImport !== 1 ? 's' : ''}…`)
    let ok = 0, fail = 0
    for (const p of selectedToImport.slice(0, canImport)) {
      try { await importProduct(sellerEmail, p.id); ok++ } catch { fail++ }
    }
    await refreshAll()
    setSelected(new Set())
    toast.dismiss(toastId)
    fail === 0
      ? toast.success(`✅ ${ok} product${ok !== 1 ? 's' : ''} added to your store!`)
      : toast(`Added ${ok}, ${fail} failed.`, { icon: '⚠️' })
    setIsBulkWorking(false)
  }, [selectedToImport, remainingSlots, packageLimit, importProduct, sellerEmail, refreshAll])

  // ── Bulk remove selected ───────────────────────────────
  const handleRemoveSelected = useCallback(async () => {
    if (selectedToRemove.length === 0) return
    setIsBulkWorking(true)
    const toastId = toast.loading(`Removing ${selectedToRemove.length} product${selectedToRemove.length !== 1 ? 's' : ''} from your store…`)
    let ok = 0, fail = 0
    for (const p of selectedToRemove) {
      const sid = globalToSellerId[p.id]
      if (!sid) { fail++; continue }
      try { await removeProduct(sellerEmail, sid); ok++ } catch { fail++ }
    }
    await refreshAll()
    setSelected(new Set())
    toast.dismiss(toastId)
    fail === 0
      ? toast.success(`🗑️ ${ok} product${ok !== 1 ? 's' : ''} removed from your store.`)
      : toast(`Removed ${ok}, ${fail} failed.`, { icon: '⚠️' })
    setIsBulkWorking(false)
  }, [selectedToRemove, globalToSellerId, removeProduct, sellerEmail, refreshAll])

  // ── Single card import ────────────────────────────────
  const handleSingleImport = async (product) => {
    if (importedIds.length >= packageLimit) {
      toast.error(`Your ${sub?.name} plan allows max ${packageLimit} products. Upgrade to import more.`)
      return
    }
    setSingleLoading(product.id)
    try {
      await importProduct(sellerEmail, product.id)
      toast.success(`${product.name} added to your store!`)
      await refreshAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import failed.')
    } finally { setSingleLoading(null) }
  }

  // ── Single card remove ────────────────────────────────
  const handleSingleRemove = async (product) => {
    const sid = globalToSellerId[product.id]
    if (!sid) { toast.error('Product not found in your store.'); return }
    setSingleLoading(product.id)
    try {
      await removeProduct(sellerEmail, sid)
      toast.success(`${product.name} removed from your store.`)
      await refreshAll()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Remove failed.')
    } finally { setSingleLoading(null) }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-32">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" /> Admin Storeroom
          </h1>
          <p className="text-slate-400">
            Select products you want to add to your store, then click <strong className="text-white">Import Selected</strong>. Click an imported product to remove it.
          </p>
        </div>
        {/* Pre-select up to quota */}
        <Button
          onClick={handlePreSelectAll}
          disabled={isBulkWorking || remainingSlots === 0}
          className="flex items-center gap-2 shrink-0"
          title={remainingSlots === 0 ? 'Package limit reached' : `Pre-select up to ${remainingSlots} products`}
        >
          {isBulkWorking && !hasSelection
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading…</>
            : <><Zap className="w-4 h-4" /> Select Max ({remainingSlots} slots)</>
          }
        </Button>
      </div>

      {/* Quota bar */}
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
        {remainingSlots === 0
          ? <p className="text-xs text-red-400 flex items-center gap-1"><Info className="w-3 h-3" /> Limit reached. Upgrade your package to import more.</p>
          : <p className="text-xs text-slate-500 flex items-center gap-1"><Info className="w-3 h-3" /> {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining — <strong className="text-slate-400">{sub?.name} plan</strong>.</p>
        }
      </div>

      {/* Search + page toggle */}
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
        <button
          onClick={togglePage}
          title={allPageSelected ? 'Deselect this page' : 'Select all on this page'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-border hover:border-primary/50 text-slate-400 hover:text-white transition-all text-sm whitespace-nowrap"
        >
          {allPageSelected
            ? <CheckSquare className="w-4 h-4 text-primary" />
            : someSelected
              ? <MinusSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />
          }
          {allPageSelected ? 'Deselect Page' : 'Select Page'}
        </button>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {storeroomProducts.map((product) => {
          const isImported = importedIds.includes(product.id)
          const isSelected = selected.has(product.id)
          const isLoading  = singleLoading === product.id

          return (
            <div
              key={product.id}
              className={`relative group cursor-pointer rounded-2xl transition-all duration-200
                ${isSelected
                  ? isImported
                    ? 'ring-2 ring-red-500 shadow-lg shadow-red-500/20 scale-[1.02]'
                    : 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'ring-1 ring-transparent hover:ring-slate-600'
                }`}
              onClick={() => toggleCard(product.id)}
            >
              {/* Checkbox top-left */}
              <div className="absolute top-3 left-3 z-20 pointer-events-none">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected
                    ? isImported ? 'bg-red-500 border-red-500' : 'bg-primary border-primary'
                    : 'bg-black/40 border-white/40 backdrop-blur-sm'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
              </div>

              {/* Status badge top-right */}
              {isImported && !isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-green-500 text-white rounded-full p-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {isImported && isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-red-500 text-white rounded-full p-1.5 shadow-md">
                  <Trash2 className="w-4 h-4" />
                </div>
              )}

              <ProductCard
                product={product}
                onImport={!isImported ? (e) => { e?.stopPropagation?.(); handleSingleImport(product) } : undefined}
                onRemove={isImported  ? (e) => { e?.stopPropagation?.(); handleSingleRemove(product) } : undefined}
                isImported={isImported}
                isLoading={isLoading}
              />

              {isLoading && (
                <div className="absolute inset-0 z-30 bg-black/60 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <span className="w-8 h-8 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
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

      {/* Floating bulk action bar */}
      {hasSelection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in px-4 w-full max-w-xl">
          <div className="glass-card border border-dark-border/80 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl shadow-black/60 backdrop-blur-xl">

            {/* Count */}
            <div className="flex items-center gap-2 text-sm font-semibold text-white pr-3 border-r border-dark-border shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
                {totalSelected}
              </div>
              <span className="hidden sm:inline">Selected</span>
            </div>

            {/* Quota warning inline */}
            {selectedToImport.length > remainingSlots && (
              <span className="text-xs text-yellow-400 flex items-center gap-1 shrink-0">
                <Info className="w-3 h-3" /> Only {remainingSlots} slots left
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {/* Import button */}
              {selectedToImport.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleImportSelected}
                  disabled={isBulkWorking}
                  className="flex items-center gap-1.5 text-sm"
                >
                  {isBulkWorking
                    ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                  Import ({Math.min(selectedToImport.length, remainingSlots)})
                </Button>
              )}

              {/* Remove button */}
              {selectedToRemove.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveSelected}
                  disabled={isBulkWorking}
                  className="flex items-center gap-1.5 text-sm border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                  {isBulkWorking
                    ? <span className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                  Remove ({selectedToRemove.length})
                </Button>
              )}

              {/* Clear */}
              <button
                onClick={() => setSelected(new Set())}
                className="p-1.5 rounded-lg hover:bg-dark-bg text-slate-400 hover:text-white transition-all"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
