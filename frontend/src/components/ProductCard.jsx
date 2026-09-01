import { ShoppingCart, Plus, Eye, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './common/Button'
import { Card } from './common/Card'
import useCartStore from '../store/useCartStore'
import toast from 'react-hot-toast'

export function ProductCard({ product, onImport, isImported, showCartAction = false }) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product, 1)
    toast.success(`${product.name} added to cart!`)
  }

  return (
    <Card className="group p-0" animate={false}>
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-800">
          <img 
            src={product.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <Button size="sm" variant="outline" className="bg-white/10 backdrop-blur-md">
              <Eye className="w-4 h-4" />
            </Button>
            {!isImported && onImport && (
              <Button size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onImport(product) }}>
                <Plus className="w-4 h-4" /> Import
              </Button>
            )}
            {showCartAction && (
              <Button size="sm" onClick={handleAddToCart} className="bg-primary/90 backdrop-blur-md">
                <ShoppingCart className="w-4 h-4" /> Add
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-primary font-bold uppercase mb-1">{product.category}</div>
          <h3 className="font-bold truncate mb-1">{product.name}</h3>
          {product.shopName && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-2">
              <Store className="w-3 h-3 shrink-0" /> {product.shopName}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-white">${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</span>
            <span className="text-xs text-slate-500">Stock: {product.stock}</span>
          </div>
          {isImported && (
            <div className="mt-3 py-1 px-3 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full text-center uppercase">
              In Your Shop
            </div>
          )}
        </div>
      </Link>
    </Card>
  )
}
