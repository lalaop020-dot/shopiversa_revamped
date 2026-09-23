import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Download, Search, AlertTriangle, FileJson, CheckCircle, FileSpreadsheet, Upload } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Pagination } from '../../components/common/Pagination'
import { useProductStore } from '../../store/useProductStore'
import { formatCurrency, PRODUCT_PLACEHOLDER } from '../../utils/formatters'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const LIMIT = 20

export default function AdminStoreroom() {
  const storeroomProducts = useProductStore((state) => state.storeroomProducts)
  const storeroomMeta = useProductStore((state) => state.storeroomMeta)
  const addStoreroomProduct = useProductStore((state) => state.addStoreroomProduct)
  const editStoreroomProduct = useProductStore((state) => state.editStoreroomProduct)
  const removeStoreroomProduct = useProductStore((state) => state.removeStoreroomProduct)

  const bulkUploadProducts = useProductStore((state) => state.bulkUploadProducts)
  const bulkUploadFile = useProductStore((state) => state.bulkUploadFile)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

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
    return useProductStore.getState().fetchStoreroomProducts(params)
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch])

  // Modals state
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)

  // Manual Form State
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [stock, setStock] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')

  // Bulk input state
  const [bulkJson, setBulkJson] = useState('')

  const handleOpenAdd = () => {
    setEditingProduct(null)
    setName('')
    setPrice('')
    setCategory('')
    setStock('')
    setImageUrl('')
    setDescription('')
    setProductModalOpen(true)
  }

  const handleOpenEdit = (p) => {
    setEditingProduct(p)
    setName(p.name)
    setPrice(p.price)
    setCategory(p.category)
    setStock(p.stock)
    setImageUrl(p.image || '')
    setDescription(p.description || '')
    setProductModalOpen(true)
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!name || !price || !category || !stock) {
      toast.error('Please fill in required fields')
      return
    }
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      toast.error('Please provide a valid image URL (must start with http:// or https://)')
      return
    }

    const payload = {
      name,
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      image: imageUrl,
      description
    }

    if (editingProduct) {
      await editStoreroomProduct(editingProduct.id, payload)
      toast.success('Product updated in global storeroom!')
    } else {
      await addStoreroomProduct(payload)
      toast.success('New product registered in global storeroom!')
      // A new product lands on page 1 (newest-first sort) — jump there so it's visible.
      if (page === 1) load(1); else setPage(1)
    }

    setProductModalOpen(false)
  }

  const handleDelete = async (id, prodName) => {
    if (!window.confirm(`WARNING: Deleting "${prodName}" will delete it from all active seller storefronts. Continue?`)) return
    await removeStoreroomProduct(id)
    toast.success(`Removed "${prodName}" and cleared from seller inventories.`)
    // If that was the last item on this page, step back a page; otherwise refresh it.
    if (storeroomProducts.length === 1 && page > 1) setPage(page - 1); else load(page)
  }

  const closeFileModal = () => {
    if (importing) return
    setFileModalOpen(false)
    setImportFile(null)
    setImportResult(null)
  }

  const handleFileSubmit = async (e) => {
    e.preventDefault()
    if (!importFile || importing) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await bulkUploadFile(importFile)
      setImportResult(result)
      if (result.imported > 0) {
        setSearchTerm('')
        setDebouncedSearch('')
        if (page === 1) load(1); else setPage(1)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Upload failed. Check your connection and retry.')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const csv = ['Product Name,Price,Description,Category,Image 1,Image 2,is_available,Stock',
      '"Sample Product",19.99,"Short description",General,https://example.com/image.jpg,,TRUE,25',
      ''].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'products_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    let result
    try {
      result = await bulkUploadProducts(bulkJson)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Bulk upload failed. Please check the payload and retry.')
      return
    }

    if (result.parseError) {
      toast.error(`Invalid JSON: ${result.parseError}`)
      return
    }

    if (result.failed > 0) {
      const firstReasons = result.errors.slice(0, 3).map(e => `Row ${e.row + 1}: ${e.reason}`).join(' | ')
      toast.error(`Imported ${result.imported}, ${result.failed} row(s) failed — ${firstReasons}${result.errors.length > 3 ? ' …' : ''}`, { duration: 8000 })
    } else {
      toast.success(`${result.imported} product(s) uploaded successfully!`)
    }

    if (result.imported > 0) {
      setBulkJson('')
      setBulkModalOpen(false)
      setSearchTerm('')
      setDebouncedSearch('')
      // Newly imported products land on page 1 (newest-first sort).
      if (page === 1) load(1); else setPage(1)
    }
  }

  const sampleJson = JSON.stringify([
    {
      "name": "Bose QuietComfort Ultra",
      "price": 429,
      "category": "Audio",
      "stock": 60,
      "image": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500",
      "description": "Noise cancelling wireless earbuds."
    }
  ], null, 2)

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Storeroom Inventory Control</h1>
          <p className="text-slate-400">Add, edit, remove, bulk upload, or crawl products available for sellers to import.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setFileModalOpen(true)}>
            <FileSpreadsheet className="w-4 h-4" /> Excel / CSV Upload
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setBulkModalOpen(true)}>
            <Download className="w-4 h-4" /> Bulk JSON Upload
          </Button>
          <Button className="flex items-center gap-2" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" /> Add Product Manually
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-grow">
          <Input 
            placeholder="Search global storeroom..." 
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
                <th className="px-6 py-4 font-medium">Product ID</th>
                <th className="px-6 py-4 font-medium">Product Details</th>
                <th className="px-6 py-4 font-medium">Base Price</th>
                <th className="px-6 py-4 font-medium">Initial Stock</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {storeroomProducts.map((product) => (
                <tr key={product.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{product.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.image || PRODUCT_PLACEHOLDER} 
                        alt={product.name} 
                        className="w-10 h-10 bg-slate-850 rounded-lg object-cover shrink-0" 
                      />
                      <div>
                        <div className="font-bold text-sm text-white">{product.name}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-200">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4 text-slate-400">{product.stock} units</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpenEdit(product)}
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
              {storeroomProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-500">
                    No products currently available in the storeroom.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={storeroomMeta.page}
        pages={storeroomMeta.pages}
        total={storeroomMeta.total}
        limit={storeroomMeta.limit}
        onPageChange={setPage}
      />

      {/* Manual Product Add/Edit Modal */}
      {productModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProductModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Edit Storeroom Product' : 'Add Storeroom Product'}</h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <Input 
                label="Product Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Category"
                  placeholder="e.g. Electronics, Audio" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  required 
                />
                <Input 
                  label="Base Price ($)" 
                  type="number"
                  step="0.01" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  required 
                />
              </div>
              <Input 
                label="Initial Stock Quantity" 
                type="number" 
                value={stock} 
                onChange={(e) => setStock(e.target.value)} 
                required 
              />
              <Input
                label="Image URL"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Product Description</label>
                <textarea 
                  className="input-field min-h-[100px] py-3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-dark-border">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setProductModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-grow">Save Product</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Excel / CSV Upload Modal */}
      {fileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeFileModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-6 sm:p-8 rounded-2xl relative z-10 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold mb-2">Excel / CSV Import</h2>
            <p className="text-xs text-slate-400 mb-4">
              Upload a .xlsx or .csv file (up to 5,000 products, 10 MB). Columns: Product Name, Price, Description,
              Category, Image 1 (extra image columns are ignored), is_available, Stock. Products already in the storeroom are skipped.
            </p>

            <form onSubmit={handleFileSubmit} className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-primary transition-colors text-center">
                <Upload className="w-6 h-6 text-primary" />
                <span className="text-sm break-all">{importFile ? importFile.name : 'Choose an .xlsx or .csv file'}</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  disabled={importing}
                  onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null) }}
                />
              </label>

              <button type="button" onClick={downloadTemplate} className="text-xs text-primary underline">
                Download CSV template
              </button>

              {importing && (
                <p className="text-xs text-slate-400">Importing… large files can take a minute. Please keep this window open.</p>
              )}

              {importResult && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-2">
                  <p className="text-sm font-semibold">
                    {importResult.imported} imported
                    {importResult.skipped > 0 && ` · ${importResult.skipped} already existed (skipped)`}
                    {importResult.failed > 0 && ` · ${importResult.failed} invalid`}
                  </p>
                  {importResult.aborted && <p className="text-red-400">{importResult.aborted} {importResult.notImported} product(s) were not imported.</p>}
                  {importResult.errors?.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto space-y-1 text-slate-400">
                      {importResult.errors.map((er, i) => (
                        <li key={i}>Row {er.row}{er.name ? ` (${er.name})` : ''}: {er.reason}</li>
                      ))}
                      {importResult.errorsTruncated && <li>…and more invalid rows.</li>}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" className="flex-grow" type="button" onClick={closeFileModal} disabled={importing}>
                  {importResult ? 'Close' : 'Cancel'}
                </Button>
                <Button type="submit" className="flex-grow" isLoading={importing} disabled={!importFile || importing}>Import File</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Bulk JSON Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBulkModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-8 rounded-2xl relative z-10"
          >
            <h2 className="text-2xl font-bold mb-2">Bulk JSON Import</h2>
            <p className="text-xs text-slate-400 mb-4">Upload an array of products in standard JSON formatting to populate the storeroom instantly.</p>
            
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-primary" /> Target JSON Payload
                </label>
                <textarea 
                  className="input-field min-h-[180px] py-3 font-mono text-xs leading-relaxed"
                  placeholder={sampleJson}
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>Ensure properties like "name", "price", "stock", and "category" exist. Missing fields will use default fallbacks.</span>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setBulkModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-grow">Import Payload</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
