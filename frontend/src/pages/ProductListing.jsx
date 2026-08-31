import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Search, Filter, LayoutGrid, List, ShoppingBag, X } from 'lucide-react'
import { ProductCard } from '../components/ProductCard'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { useProductStore } from '../store/useProductStore'

const MAX_PRICE = 5000

const SORT_OPTIONS = [
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
]

export default function ProductListing() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState('grid')
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE)
  const [sortBy, setSortBy] = useState('popularity')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const activeProducts = useProductStore((state) => state.marketplaceProducts)
  const fetchMarketplaceProducts = useProductStore((state) => state.fetchMarketplaceProducts)
  const publicCategories = useProductStore((state) => state.publicCategories)
  const fetchPublicCategories = useProductStore((state) => state.fetchPublicCategories)

  useEffect(() => {
    fetchMarketplaceProducts({ limit: 100 })
    fetchPublicCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Compute counts for each category
  const getCategoryCount = (catName) => {
    if (catName === 'All') return activeProducts.length
    return activeProducts.filter(p => p.category.toLowerCase() === catName.toLowerCase()).length
  }

  // Filter products by selected category slug, search term, and price range
  const filteredProducts = activeProducts.filter((product) => {
    const matchesCategory = !slug || slug === 'all' || product.category.toLowerCase() === slug.toLowerCase()
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPrice = product.price <= maxPrice
    return matchesCategory && matchesSearch && matchesPrice
  })

  // /marketplace/products already returns newest-first, so 'newest' is a no-op sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    if (sortBy === 'popularity') return (b.sales || 0) - (a.sales || 0)
    return 0
  })

  const categoryList = ['All', ...publicCategories.map(c => c.name)]

  const filterContent = (
    <>
      <div>
        <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Categories</h3>
        <ul className="space-y-2">
          {categoryList.map(c => {
            const isCatActive = (!slug && c === 'All') || (slug && slug.toLowerCase() === c.toLowerCase())
            return (
              <li
                key={c}
                onClick={() => { navigate(c === 'All' ? '/products' : `/category/${c.toLowerCase()}`); setIsFilterOpen(false) }}
                className="flex items-center justify-between group cursor-pointer"
              >
                <span className={`text-sm transition-colors ${isCatActive ? 'text-primary font-bold' : 'text-slate-400 group-hover:text-white'}`}>{c}</span>
                <span className="text-[10px] bg-dark-card px-2 py-0.5 rounded-full text-slate-500">{getCategoryCount(c)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div>
        <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-slate-500">Price Range</h3>
        <div className="space-y-4">
          <input
            type="range"
            className="w-full accent-primary"
            min="0"
            max={MAX_PRICE}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>$0</span>
            <span>{maxPrice >= MAX_PRICE ? `$${MAX_PRICE.toLocaleString()}+` : `$${maxPrice.toLocaleString()}`}</span>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-8 animate-fade-in py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 capitalize flex items-center gap-2">
            <ShoppingBag className="w-8 h-8 text-primary" /> {slug ? slug : 'Marketplace'}
          </h1>
          <p className="text-slate-400">Showing {sortedProducts.length} approved system products</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-slate-300"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <div className="flex bg-dark-card border border-dark-border rounded-lg p-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-md ${view === 'grid' ? 'bg-primary text-white' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md ${view === 'list' ? 'bg-primary text-white' : 'text-slate-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-dark-card border border-dark-border rounded-lg text-sm px-3 py-2.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>Sort by: {opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar Filters — desktop, always visible */}
        <aside className="hidden lg:block space-y-8">
          {filterContent}
        </aside>

        {/* Sidebar Filters — mobile off-canvas drawer */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsFilterOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-dark-bg border-r border-dark-border p-6 space-y-8 overflow-y-auto animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Filters</h3>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-dark-card rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {filterContent}
              <Button className="w-full" onClick={() => setIsFilterOpen(false)}>Show {sortedProducts.length} Results</Button>
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative">
            <Input
              placeholder="Search in this category..."
              className="pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-2.5 w-5 h-5 text-slate-500" />
          </div>

          <div className={`grid gap-6 ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                showCartAction={true}
              />
            ))}
          </div>

          {sortedProducts.length === 0 && (
            <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl text-slate-500">
              No approved products available in this section.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
