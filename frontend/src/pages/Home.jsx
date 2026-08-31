import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ShieldCheck, Search, ChevronLeft, ChevronRight,
  ShoppingCart, TrendingUp, Package, Layers, Eye,
  Smartphone, Dumbbell, Sparkles, Shirt, Home as HomeIcon, PawPrint,
  ShoppingBag, Laptop, Headphones, Gamepad, Puzzle
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { ProductCard } from '../components/ProductCard'
import { useProductStore } from '../store/useProductStore'
import api from '../api/axios'

const PAGE_SIZE = 12

export default function Home() {
  const navigate = useNavigate()
  const activeProducts = useProductStore((state) => state.marketplaceProducts)
  const marketplaceMeta = useProductStore((state) => state.marketplaceMeta)
  const fetchMarketplaceProducts = useProductStore((state) => state.fetchMarketplaceProducts)
  const publicCategories = useProductStore((state) => state.publicCategories)
  const fetchPublicCategories = useProductStore((state) => state.fetchPublicCategories)

  // Live product showcase state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchPublicCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchMarketplaceProducts({ page, limit: PAGE_SIZE })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Featured products (top 5 by stock availability, from the currently loaded page)
  const featuredProducts = [...activeProducts]
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)

  // Auto-cycle carousel
  useEffect(() => {
    if (featuredProducts.length === 0) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredProducts.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [featuredProducts.length])

  // Live search — queries the real backend (not just whatever page happens to
  // be loaded), debounced so we don't fire a request per keystroke.
  const [searchResults, setSearchResults] = useState([])
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/marketplace/products', { params: { search: q, limit: 5 } })
        if (!cancelled) setSearchResults(data.data.products)
      } catch (e) {
        if (!cancelled) setSearchResults([])
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [searchQuery])

  // Compute real stats from the backend (not just the currently loaded page)
  const totalProducts = marketplaceMeta.total
  const totalCategories = publicCategories.length

  const currentProduct = featuredProducts[currentIndex]

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative py-12 lg:py-24 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6 text-primary">
              Shopvirsa
            </h1>
            <p className="text-xl text-slate-400 mb-8 max-w-lg">
              Experience the future of online marketplaces. Premium products, verified sellers, and lightning-fast delivery.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="px-10">Shop Now <ArrowRight className="w-5 h-5" /></Button>
              </Link>
              <Link to="/products">
                <Button size="lg" variant="outline">Explore Categories</Button>
              </Link>
            </div>
            
            <div className="mt-12 flex items-center gap-8 border-t border-dark-border pt-8">
              <div>
                <div className="text-2xl font-bold">{totalProducts}</div>
                <div className="text-sm text-slate-500">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalCategories}</div>
                <div className="text-sm text-slate-500">Categories</div>
              </div>
            </div>
          </motion.div>

          {/* === LIVE PRODUCT SHOWCASE === */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-primary/10 via-dark-card to-secondary/10 rounded-3xl overflow-hidden shadow-2xl border border-dark-border flex flex-col">
              {/* Showcase Header with Search */}
              <div className="p-5 pb-3 border-b border-dark-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Featured Products</span>
                  </div>
                  <span className="text-[10px] text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    LIVE
                  </span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Quick search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                    className="w-full bg-dark-bg/80 border border-dark-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {isSearchFocused && searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute z-50 top-full mt-2 w-full bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden"
                      >
                        {searchResults.map((product) => (
                          <Link
                            to={`/product/${product.id}`}
                            key={product.id}
                            className="flex items-center gap-3 p-3 hover:bg-primary/10 transition-colors cursor-pointer border-b border-dark-border/30 last:border-0"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">{product.name}</div>
                              <div className="text-xs text-slate-500">{product.category}</div>
                            </div>
                            <div className="text-sm font-bold text-primary">${product.price}</div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Product Carousel */}
              {currentProduct && (
                <div className="p-5 flex-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentProduct.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col sm:flex-row gap-5"
                    >
                      {/* Product Image */}
                      <div className="relative w-full sm:w-40 h-40 rounded-2xl overflow-hidden bg-slate-800 shrink-0 group">
                        <img
                          src={currentProduct.image}
                          alt={currentProduct.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          #{currentIndex + 1} Trending
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">{currentProduct.category}</div>
                          <h3 className="text-lg font-bold text-white mb-1 truncate">{currentProduct.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3">{currentProduct.description || 'Premium quality product available now.'}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-white">${currentProduct.price}</div>
                            <div className="text-[10px] text-slate-500">{currentProduct.stock > 0 ? `${currentProduct.stock} in stock` : 'Out of stock'}</div>
                          </div>
                          <Link to={`/product/${currentProduct.id}`}>
                            <Button size="sm" className="gap-1.5">
                              <Eye className="w-3.5 h-3.5" /> View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Carousel Nav Dots */}
                  <div className="flex items-center justify-center gap-2 mt-5">
                    <button
                      onClick={() => setCurrentIndex((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length)}
                      className="p-1 text-slate-500 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {featuredProducts.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i === currentIndex ? 'bg-primary w-6' : 'bg-slate-600 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                    <button
                      onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredProducts.length)}
                      className="p-1 text-slate-500 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 border-t border-dark-border/50">
                <div className="p-3 text-center border-r border-dark-border/50">
                  <Package className="w-4 h-4 mx-auto text-primary mb-1" />
                  <div className="text-xs font-bold">{totalProducts}</div>
                  <div className="text-[10px] text-slate-500">Products</div>
                </div>
                <div className="p-3 text-center border-r border-dark-border/50">
                  <Layers className="w-4 h-4 mx-auto text-secondary mb-1" />
                  <div className="text-xs font-bold">{totalCategories}</div>
                  <div className="text-[10px] text-slate-500">Categories</div>
                </div>
                <div className="p-3 text-center">
                  <ShieldCheck className="w-4 h-4 mx-auto text-green-500 mb-1" />
                  <div className="text-xs font-bold">Verified</div>
                  <div className="text-[10px] text-slate-500">Secure</div>
                </div>
              </div>
            </div>

            {/* Floating Live Orders Badge */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3.5 }}
              className="absolute -bottom-5 -left-5 glass-card p-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-dark-border/50"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <ShoppingCart className="text-primary w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{totalProducts}+ Products</div>
                <div className="text-[10px] text-slate-400">Available Now</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories */}
      <section>
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">Featured Categories</h2>
          <Link to="/products">
            <Button variant="ghost">View All</Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-6">
          {publicCategories.map((cat) => {
            const catIcon = getCategoryIcon(cat.name)
            return (
              <Link to={`/category/${cat.name.toLowerCase()}`} key={cat.name}>
                <Card className="text-center group cursor-pointer hover:border-primary transition-all p-5 h-full flex flex-col justify-center items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-all">
                    {catIcon}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>
                  <span className="text-[10px] text-slate-500 bg-dark-bg px-2 py-0.5 rounded-full">{cat.count} {cat.count === 1 ? 'item' : 'items'}</span>
                </Card>
              </Link>
            )
          })}
          {publicCategories.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-500">
              No categories available yet.
            </div>
          )}
        </div>
      </section>

      {/* Browse Products — real backend data, paginated */}
      <section>
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold">Shop the Marketplace</h2>
          <Link to="/products">
            <Button variant="ghost">View All</Button>
          </Link>
        </div>

        {activeProducts.length === 0 ? (
          <div className="text-center py-20 bg-dark-card border border-dark-border rounded-xl text-slate-500">
            No products available in the marketplace yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeProducts.map((product) => (
                <ProductCard key={product.id} product={product} showCartAction={true} />
              ))}
            </div>

            {marketplaceMeta.pages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <span className="text-sm text-slate-400">
                  Page {marketplaceMeta.page} of {marketplaceMeta.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= marketplaceMeta.pages}
                  onClick={() => setPage((p) => Math.min(marketplaceMeta.pages, p + 1))}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function getCategoryIcon(category) {
  const icons = {
    'Electronics': <Smartphone className="w-6 h-6 text-blue-400" />,
    'Sports Goods': <Dumbbell className="w-6 h-6 text-orange-400" />,
    'Cosmetics': <Sparkles className="w-6 h-6 text-pink-400" />,
    "Men's Clothes & Outfits": <Shirt className="w-6 h-6 text-indigo-400" />,
    "Women's Clothes & Outfits": <ShoppingBag className="w-6 h-6 text-rose-400" />,
    'Home Appliances and Goods accessories': <HomeIcon className="w-6 h-6 text-emerald-400" />,
    'Pet Food and accessories': <PawPrint className="w-6 h-6 text-amber-400" />,
    'Toys & Games': <Puzzle className="w-6 h-6 text-yellow-400" />,
    // Fallbacks
    'Computers': <Laptop className="w-6 h-6 text-blue-400" />,
    'Audio': <Headphones className="w-6 h-6 text-purple-400" />,
    'Gaming': <Gamepad className="w-6 h-6 text-green-400" />,
    'Home': <HomeIcon className="w-6 h-6 text-emerald-400" />,
    'Sports': <Dumbbell className="w-6 h-6 text-orange-400" />,
    'Beauty': <Sparkles className="w-6 h-6 text-pink-400" />,
  }
  return icons[category] || <ShoppingBag className="w-6 h-6 text-primary" />
}
