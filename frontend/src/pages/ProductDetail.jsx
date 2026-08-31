import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Heart, ShieldCheck, Truck, Plus, Minus, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { useProductStore } from './../store/useProductStore'
import useCartStore from '../store/useCartStore'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)

  const marketplaceProducts = useProductStore((state) => state.marketplaceProducts)
  const fetchMarketplaceProducts = useProductStore((state) => state.fetchMarketplaceProducts)
  const product = marketplaceProducts.find(p => String(p.id) === id)

  useEffect(() => {
    fetchMarketplaceProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addItem = useCartStore((state) => state.addItem)

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
          <button className="pb-4 border-b-2 border-primary font-bold">Description</button>
          <button className="pb-4 text-slate-500 hover:text-white transition-colors">Specifications</button>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-6 text-slate-400">
            <p>{product.description || `Aerospace-grade durability and state-of-the-art configuration make this product a premier choice for customers seeking excellence.`}</p>
            <ul className="space-y-3 list-disc pl-5">
              <li>Category: {product.category}</li>
              <li>Base Quantity Limit: {product.stock} units</li>
              <li>Fulfillment: Verified Shopiversa Logistic Partners</li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="text-xl font-bold">Seller Information</h4>
            <Card className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <ShieldCheck className="text-primary w-6 h-6" />
              </div>
              <div>
                <div className="font-bold">{product.sellerEmail || 'Unknown Seller'}</div>
                <div className="text-xs text-slate-400">Verified Shopiversa Seller</div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
