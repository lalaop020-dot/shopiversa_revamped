import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Check, Search, Plus, Minus, Store, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import useOrderStore from '../../store/useOrderStore'
import { Card } from '../common/Card'
import { Input } from '../common/Input'
import { Button } from '../common/Button'

export default function AdminPlaceOrderModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1) // 1: Select Shop, 2: Add Products, 3: Customer Details, 4: Review & Place

  // Data states
  const [sellers, setSellers] = useState([])
  const [selectedSeller, setSelectedSeller] = useState(null)
  // The selected shop's package + profit rate (0.20 = 20%), as decided by the server.
  const [sellerPlan, setSellerPlan] = useState({ package: null, profitRate: null })
  const [products, setProducts] = useState([])
  const [loadingSellers, setLoadingSellers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters & search
  const [searchShop, setSearchShop] = useState('')
  const [searchProduct, setSearchProduct] = useState('')

  // Selected cart items: [{ productId, name, price, storeroomPrice, quantity, image, category, sellerEmail, sellerId }]
  const [cartItems, setCartItems] = useState([])

  // Customer shipping details
  const [customerName, setCustomerName] = useState('John Doe')
  const [customerEmail, setCustomerEmail] = useState('john.doe@example.com')
  const [address, setAddress] = useState('123 Main Street')
  const [city, setCity] = useState('New York')
  const [zip, setZip] = useState('10001')
  const [paymentMethod, setPaymentMethod] = useState('Credit Card')

  // Load sellers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSellers()
    } else {
      resetModal()
    }
  }, [isOpen])

  const resetModal = () => {
    setStep(1)
    setSelectedSeller(null)
    setProducts([])
    setCartItems([])
    setSearchShop('')
    setSearchProduct('')
  }

  const fetchSellers = async () => {
    setLoadingSellers(true)
    try {
      const { data } = await api.get('/admin/sellers?limit=100')
      const allSellers = data?.data?.sellers || []
      const approved = allSellers.filter(s => !s.shopStatus || s.shopStatus === 'approved')
      setSellers(approved.length ? approved : allSellers)
    } catch {
      setSellers([])
    } finally {
      setLoadingSellers(false)
    }
  }

  const handleSelectSeller = async (seller) => {
    setSelectedSeller(seller)
    setLoadingProducts(true)
    setStep(2)
    try {
      // Only this shop's own listings — never the whole storeroom.
      const { data } = await api.get(`/admin/sellers/${seller.id}/products`)
      setProducts(data?.data?.products || [])
      setSellerPlan({ package: data?.data?.package || null, profitRate: data?.data?.profitRate ?? null })
    } catch {
      setProducts([])
      setSellerPlan({ package: null, profitRate: null })
      toast.error('Could not load this shop\'s products')
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleQuantityChange = (product, delta) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.productId === product.id)
      if (!existing) {
        if (delta <= 0) return prev
        // Cost basis comes from the server; never guess it from the sale price.
        const storeroomPrice = product.storeroomPrice ?? product.price
        return [...prev, {
          productId: product.id,
          name: product.name,
          price: product.price,
          storeroomPrice,
          quantity: 1,
          image: product.image,
          category: product.category,
          sellerEmail: selectedSeller?.email || product.sellerEmail,
          sellerId: selectedSeller?.id || product.sellerId,
          sellerName: selectedSeller?.shopName || selectedSeller?.name || product.shopName || product.sellerName || 'Seller'
        }]
      }

      const newQty = existing.quantity + delta
      if (newQty <= 0) {
        return prev.filter(item => item.productId !== product.id)
      }
      return prev.map(item => item.productId === product.id ? { ...item, quantity: newQty } : item)
    })
  }

  // Calculations for Step 4 (matching user screenshot)
  const totalItemsCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems])
  const totalPrice = useMemo(() => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartItems])
  const storeroomPriceTotal = useMemo(() => cartItems.reduce((sum, item) => sum + (item.storeroomPrice * item.quantity), 0), [cartItems])
  // Profit is a markup on the storeroom price set by the seller's package
  // (Silver 17% / Gold 20% / Diamond 25%): e.g. storeroom $100 on Gold -> $20.00
  // profit, $120.00 total. The amounts are the prices the server will charge.
  const sellerProfit = useMemo(() => Math.round((totalPrice - storeroomPriceTotal) * 100) / 100, [totalPrice, storeroomPriceTotal])
  const profitPercentage = sellerPlan.profitRate != null
    ? Math.round(sellerPlan.profitRate * 1000) / 10
    : (storeroomPriceTotal > 0 ? Math.round((sellerProfit / storeroomPriceTotal) * 1000) / 10 : 0)

  const handlePlaceOrder = async () => {
    if (!cartItems.length) return toast.error('Please select at least one product')
    if (!customerName || !customerEmail || !address) return toast.error('Please complete customer shipping details')

    setSubmitting(true)
    try {
      const shippingInfo = {
        name: customerName,
        email: customerEmail,
        address,
        city,
        zip
      }
      const order = await useOrderStore.getState().createOrder(
        cartItems.map(item => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          category: item.category,
          sellerEmail: item.sellerEmail,
          sellerId: item.sellerId,
          sellerName: item.sellerName || selectedSeller?.shopName || selectedSeller?.name
        })),
        shippingInfo,
        paymentMethod
      )

      toast.success(`Order #${order?.id || 'new'} placed successfully for ${selectedSeller?.shopName || 'seller'}!`)
      if (onSuccess) onSuccess(order)
      onClose()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card w-full max-w-3xl p-6 sm:p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[92vh] border border-dark-border"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Place New Order</h2>
            <p className="text-slate-400 text-sm">Create an order from seller shop products</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-bg text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicator (1: Select Shop, 2: Add Products, 3: Customer Details, 4: Review & Place) */}
        <div className="flex items-center justify-between my-6 px-2 overflow-x-auto">
          {[
            { num: 1, label: 'Select Shop' },
            { num: 2, label: 'Add Products' },
            { num: 3, label: 'Customer Details' },
            { num: 4, label: 'Review & Place' },
          ].map((s, idx) => {
            const isDone = step > s.num
            const isCurrent = step === s.num
            return (
              <div key={s.num} className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-2 ${isCurrent ? 'text-primary font-bold' : isDone ? 'text-green-500 font-medium' : 'text-slate-500'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                    isDone 
                      ? 'bg-green-500/20 text-green-500 border-green-500/40' 
                      : isCurrent 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30' 
                      : 'bg-dark-bg text-slate-500 border-dark-border'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-sm">{s.label}</span>
                </div>
                {idx < 3 && (
                  <div className={`w-8 sm:w-12 h-[2px] mx-2 ${step > idx + 1 ? 'bg-green-500' : 'bg-dark-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* STEP 1: SELECT SHOP */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Input
                placeholder="Search shop by name or seller email..."
                value={searchShop}
                onChange={e => setSearchShop(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
              {sellers
                .filter(s => (s.shopName || s.name || s.email || '').toLowerCase().includes(searchShop.toLowerCase()))
                .map(seller => (
                  <div
                    key={seller.id || seller.email}
                    onClick={() => handleSelectSeller(seller)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedSeller?.id === seller.id
                        ? 'bg-primary/10 border-primary shadow-lg'
                        : 'bg-dark-bg border-dark-border hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                        {(seller.shopName || seller.name || 'S')[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{seller.shopName || seller.name || 'Seller Shop'}</div>
                        <div className="text-xs text-slate-400">{seller.email}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              {sellers.length === 0 && !loadingSellers && (
                <div className="col-span-2 text-center py-10 text-slate-500">
                  No seller shops found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: ADD PRODUCTS */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between bg-dark-bg p-3 rounded-xl border border-dark-border">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{selectedSeller?.shopName || selectedSeller?.name || 'Selected Shop'}</span>
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline">Change Shop</button>
            </div>

            <div className="relative">
              <Input
                placeholder="Search products in shop..."
                value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            </div>

            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {products
                .filter(p => p.name.toLowerCase().includes(searchProduct.toLowerCase()))
                .map(product => {
                  const inCart = cartItems.find(i => i.productId === product.id)
                  const qty = inCart?.quantity || 0
                  return (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-dark-bg border border-dark-border">
                      <div className="flex items-center gap-3">
                        {product.image && <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />}
                        <div>
                          <div className="font-bold text-sm">{product.name}</div>
                          <div className="text-xs text-slate-400">${product.price.toFixed(2)} · Stock: {product.stock}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg p-1">
                            <button onClick={() => handleQuantityChange(product, -1)} className="p-1 hover:text-red-400">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold w-5 text-center">{qty}</span>
                            <button onClick={() => handleQuantityChange(product, 1)} className="p-1 hover:text-green-400">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleQuantityChange(product, 1)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              {products.length === 0 && !loadingProducts && (
                <div className="text-center py-10 text-slate-400">
                  <Store className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-sm">This seller shop has no listed products available.</p>
                  <p className="text-xs text-slate-500 mt-1">Please select a different seller shop or import products for this seller first.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-dark-border">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => {
                if (!cartItems.length) return toast.error('Add at least 1 item to proceed')
                setStep(3)
              }}>
                Next: Customer Details ({cartItems.length} selected)
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: CUSTOMER DETAILS */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Customer Shipping Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Customer Full Name" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
              <Input label="Customer Email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
              <Input label="Street Address" value={address} onChange={e => setAddress(e.target.value)} required />
              <Input label="City" value={city} onChange={e => setCity(e.target.value)} required />
              <Input label="Zip / Postal Code" value={zip} onChange={e => setZip(e.target.value)} required />
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Payment Method</label>
                <select 
                  value={paymentMethod} 
                  onChange={e => setPaymentMethod(e.target.value)} 
                  className="w-full bg-dark-bg border border-dark-border rounded-lg p-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="Credit Card">Credit Card</option>
                  <option value="USDT TRC20">USDT TRC20</option>
                  <option value="ETH TRC20">ETH TRC20</option>
                  <option value="BTC">BTC</option>
                  <option value="Prepaid Payout">Prepaid Payout</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-dark-border">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Next: Review & Place</Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & PLACE (EXACT MATCH FOR USER ATTACHED SCREENSHOT) */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-dark-bg/60 border border-dark-border rounded-2xl p-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {totalItemsCount} ITEM{totalItemsCount !== 1 ? 'S' : ''}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 text-sm border-b border-dark-border/40 last:border-0">
                    <span className="text-slate-200 font-medium">
                      {item.name} <span className="text-slate-400 font-normal">×{item.quantity}</span>
                    </span>
                    <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dark-border/80 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Storeroom price</span>
                  <span className="font-bold text-slate-200">${storeroomPriceTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Seller profit ({sellerPlan.package ? `${sellerPlan.package} · ` : ''}{profitPercentage}%)</span>
                  <span className="font-bold text-green-500">+${sellerProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-dark-border/40">
                  <span className="text-white text-lg font-bold">Total price</span>
                  <span className="text-primary text-2xl font-bold">${totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" onClick={() => setStep(3)} className="px-8">Back</Button>
              <Button onClick={handlePlaceOrder} isLoading={submitting} className="px-10 bg-primary hover:bg-primary-dark font-bold text-base">
                Place Order
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
