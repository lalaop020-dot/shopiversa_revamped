import { Link } from 'react-router-dom'
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { CartItem } from '../features/cart/CartItem'
import { formatCurrency } from '../utils/formatters'
import useCartStore from '../store/useCartStore'

export default function Cart() {
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = 0
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-dark-card border border-dark-border rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-slate-400 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/products">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-12 animate-fade-in">
      <h1 className="text-4xl font-bold mb-10 flex items-center gap-4">
        Shopping Cart <span className="text-lg font-normal text-slate-500">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
      </h1>

      <div className="grid lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-dark-border bg-dark-bg/30 hidden md:grid grid-cols-12 text-xs font-bold uppercase tracking-widest text-slate-500">
              <div className="col-span-6">Product</div>
              <div className="col-span-3 text-center">Quantity</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            <div className="divide-y divide-dark-border px-6">
              {items.map((item) => (
                <CartItem 
                  key={item.id} 
                  item={item} 
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </Card>
          
          <div className="flex justify-between items-center pt-4">
            <Link to="/products" className="text-sm font-medium text-primary hover:underline">
              ← Continue Shopping
            </Link>
            <button onClick={clearCart} className="text-sm text-red-500 hover:underline flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Clear Cart
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-28 p-6 space-y-6">
            <h3 className="text-xl font-bold">Order Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-green-500 font-bold uppercase text-[10px] mt-1">Free</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax (8%)</span>
                <span className="text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="pt-4 border-t border-dark-border flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
            
            <Link to="/checkout" className="block w-full">
              <Button className="w-full h-12 gap-2">
                Checkout Now <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <div className="pt-6 border-t border-dark-border">
              <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">Secure Checkout Powered by Shopiversa</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
