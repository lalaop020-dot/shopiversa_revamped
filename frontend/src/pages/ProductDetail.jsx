import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, ShieldCheck, Truck, Plus, Minus, AlertCircle, Store, MessageSquare, Mail } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { ChatWindow } from '../components/ChatWindow'
import { useProductStore } from './../store/useProductStore'
import useCartStore from '../store/useCartStore'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [isChatOpen, setIsChatOpen] = useState(false)

  const marketplaceProducts = useProductStore((state) => state.marketplaceProducts)
  const fetchMarketplaceProducts = useProductStore((state) => state.fetchMarketplaceProducts)
  const product = marketplaceProducts.find(p => String(p.id) === id)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  useEffect(() => {
    fetchMarketplaceProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addItem = useCartStore((state) => state.addItem)

  const handleChatWithSeller = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to chat with the seller')
      navigate('/login')
      return
    }
    if (role !== 'customer') {
      toast.error('Only customer accounts can message a seller')
      return
    }
    setIsChatOpen(true)
  }

  const handleAddToCart = () => {
    if (!product) return
    addItem(product, quantity)
    toast.success(`Added ${quantity}x ${product.name} to cart!`)
  }

  const handleBuyNow = () => {
    if (!product) return
    addItem(product, quantity)
    navigate('/checkout')
  }

  if (!product) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-slate-500 mx-auto" />
        <h2 className="text-2xl font-bold">Product Not Found</h2>
        <p className="text-slate-400">The product you are looking for is not currently available in the marketplace.</p>
        <Link to="/products">
          <Button variant="outline" className="mt-4">Back to Marketplace</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="py-8 space-y-12">
      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-dark-card border border-dark-border rounded-3xl overflow-hidden">
            <img 
              src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'} 
              alt={product.name} 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-2">
              <Link to={`/category/${product.category.toLowerCase()}`} className="hover:underline">{product.category}</Link>
            </div>
            <h1 className="text-4xl font-extrabold mb-4">{product.name}</h1>
            <div className="flex items-center gap-4">
              <span className="text-green-500 font-medium">
                {product.stock > 0 ? 'Available in Marketplace' : 'Currently Out of Stock'}
              </span>
            </div>
          </div>

          <div className="text-4xl font-bold text-white">${product.price.toFixed(2)}</div>

          <p className="text-slate-400 leading-relaxed text-lg">
            {product.description || 'No description provided for this product.'}
          </p>

          <div className="space-y-6 pt-6 border-t border-t-dark-border">
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-dark-card border border-dark-border rounded-lg">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-3 hover:text-primary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  className="p-3 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button size="lg" className="flex-grow gap-2" onClick={handleAddToCart}>
                <ShoppingCart className="w-5 h-5" /> Add to Cart
              </Button>
              <button className="p-4 bg-dark-card border border-dark-border rounded-xl hover:text-red-500 transition-all">
                <Heart className="w-6 h-6" />
              </button>
            </div>

            <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleBuyNow}>
              Buy Now
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-dark-bg border border-dark-border rounded-xl">
                <Truck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-bold">Fast Delivery</div>
                  <div className="text-xs text-slate-500">2-4 business days</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-dark-bg border border-dark-border rounded-xl">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-bold">1 Year Warranty</div>
                  <div className="text-xs text-slate-500">Certified by Shopiversa</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs / More Info */}
      <section className="pt-12 border-t border-dark-border">
        <div className="flex gap-12 border-b border-dark-border mb-8">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-4 font-bold transition-colors ${
              activeTab === 'description' ? 'border-b-2 border-primary' : 'text-slate-500 hover:text-white'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`pb-4 font-bold transition-colors ${
              activeTab === 'seller' ? 'border-b-2 border-primary' : 'text-slate-500 hover:text-white'
            }`}
          >
            Seller
          </button>
        </div>

        {activeTab === 'description' && (
          <div className="text-slate-400 space-y-6 max-w-3xl">
            <p>{product.description || `Aerospace-grade durability and state-of-the-art configuration make this product a premier choice for customers seeking excellence.`}</p>
            <ul className="space-y-3 list-disc pl-5">
              <li>Category: {product.category}</li>
              <li>Base Quantity Limit: {product.stock} units</li>
              <li>Fulfillment: Verified Shopiversa Logistic Partners</li>
            </ul>
          </div>
        )}

        {activeTab === 'seller' && (
          <Card className="max-w-2xl">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                <Store className="text-primary w-7 h-7" />
              </div>
              <div className="flex-grow space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-lg">{product.shopName || 'Unknown Shop'}</div>
                  <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase">
                    <ShieldCheck className="w-3 h-3" /> Verified Seller
                  </span>
                </div>
                {product.shopDesc && <p className="text-sm text-slate-400">{product.shopDesc}</p>}
                {product.sellerEmail && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
                    <Mail className="w-3.5 h-3.5" /> {product.sellerEmail}
                  </div>
                )}
              </div>
            </div>
            {product.sellerEmail && (
              <Button variant="outline" className="w-full mt-6 gap-2" onClick={handleChatWithSeller}>
                <MessageSquare className="w-4 h-4" />
                {isAuthenticated ? 'Chat with Seller' : 'Log In to Chat with Seller'}
              </Button>
            )}
          </Card>
        )}
      </section>

      <AnimatePresence>
        {isChatOpen && product.sellerEmail && (
          <ChatWindow
            recipientEmail={product.sellerEmail}
            recipientName={product.shopName || product.sellerEmail}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
