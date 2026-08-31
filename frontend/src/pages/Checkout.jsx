import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, CreditCard, MapPin, CheckCircle2, ChevronRight, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Card } from '../components/common/Card'
import useCartStore from '../store/useCartStore'
import useOrderStore from '../store/useOrderStore'
import { formatCurrency } from '../utils/formatters'

const EMPTY_SHIPPING = { firstName: '', lastName: '', email: '', address: '', city: '', zip: '' }
const EMPTY_PAYMENT = { txHash: '', senderWallet: '' }

export default function Checkout() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const createOrder = useOrderStore((state) => state.createOrder)

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [placedOrderId, setPlacedOrderId] = useState(null)
  const [shipping, setShipping] = useState(EMPTY_SHIPPING)
  const [payment, setPayment] = useState(EMPTY_PAYMENT)

  // Don't let the checkout page render with an empty/stale cart
  useEffect(() => {
    if (items.length === 0 && step !== 4) {
      navigate('/cart', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, step])

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax

  const steps = [
    { id: 1, title: 'Shipping', icon: MapPin },
    { id: 2, title: 'Payment', icon: CreditCard },
    { id: 3, title: 'Review', icon: ShoppingBag },
  ]

  const updateShipping = (field) => (e) => setShipping((s) => ({ ...s, [field]: e.target.value }))
  const updatePayment = (field) => (e) => setPayment((p) => ({ ...p, [field]: e.target.value }))

  const nextStep = () => {
    if (step === 1) {
      const { firstName, lastName, email, address, city, zip } = shipping
      if (!firstName || !lastName || !email || !address || !city || !zip) {
        toast.error('Please fill in all shipping fields')
        return
      }
    }
    if (step === 2) {
      if (!payment.txHash || !payment.senderWallet) {
        toast.error('Please enter your transaction hash and sender wallet address')
        return
      }
    }
    setStep((s) => Math.min(s + 1, 3))
  }
  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  const handlePlaceOrder = async () => {
    setIsProcessing(true)
    try {
      const shippingInfo = {
        name: `${shipping.firstName} ${shipping.lastName}`.trim(),
        email: shipping.email,
        address: shipping.address,
        city: shipping.city,
        zip: shipping.zip,
      }
      const order = await createOrder(items, shippingInfo, 'Crypto (USDT/BTC)', {
        txHash: payment.txHash,
        walletAddress: payment.senderWallet,
      })
      clearCart()
      setPlacedOrderId(order.id)
      setStep(4)
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (step === 4) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center animate-fade-in">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8"
        >
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-4">Order Placed Successfully!</h1>
        <p className="text-slate-400 mb-10">
          Your order #{placedOrderId} has been confirmed. You will receive an email shortly.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate('/profile')}>View Orders</Button>
          <Button onClick={() => navigate('/products')}>Continue Shopping</Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return null // redirect effect above is about to navigate away
  }

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="grid lg:grid-cols-3 gap-12">
        {/* Main Checkout Flow */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stepper */}
          <div className="flex justify-between items-center relative mb-12">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-dark-border -translate-y-1/2 z-0" />
            {steps.map((s) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step >= s.id ? 'bg-primary text-white' : 'bg-dark-card text-slate-500 border border-dark-border'
                }`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs mt-2 font-medium ${step >= s.id ? 'text-primary' : 'text-slate-500'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Shipping Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="First Name" placeholder="John" value={shipping.firstName} onChange={updateShipping('firstName')} />
                  <Input label="Last Name" placeholder="Doe" value={shipping.lastName} onChange={updateShipping('lastName')} />
                  <Input label="Email" type="email" placeholder="john@example.com" className="md:col-span-2" value={shipping.email} onChange={updateShipping('email')} />
                  <Input label="Address" placeholder="123 Main St" className="md:col-span-2" value={shipping.address} onChange={updateShipping('address')} />
                  <Input label="City" placeholder="New York" value={shipping.city} onChange={updateShipping('city')} />
                  <Input label="ZIP Code" placeholder="10001" value={shipping.zip} onChange={updateShipping('zip')} />
                </div>
                <div className="flex justify-end pt-8">
                  <Button onClick={nextStep} className="px-10">Continue to Payment <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Payment Method</h2>
                <div className="grid gap-4">
                  <div className="glass-card p-4 rounded-xl border-primary flex items-center gap-4 cursor-pointer">
                    <div className="w-6 h-6 rounded-full border-4 border-primary" />
                    <div className="flex-grow">
                      <div className="font-bold">Crypto (USDT/BTC)</div>
                      <div className="text-xs text-slate-400">Pay securely directly to the designated wallet</div>
                    </div>
                    <Zap className="w-5 h-5 text-accent-gold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="md:col-span-2 p-4 bg-dark-bg/50 border border-dark-border rounded-xl mb-4">
                    <p className="text-sm text-slate-400 mb-2">Please send the exact total amount to our secure payment address:</p>
                    <code className="block w-full p-3 bg-dark-card rounded text-primary text-center font-mono break-all">
                      TL8r4M9L... (Example USDT TRC20 Address)
                    </code>
                  </div>
                  <Input label="Transaction Hash (TxID)" placeholder="Enter the transaction hash of your payment" className="md:col-span-2" value={payment.txHash} onChange={updatePayment('txHash')} />
                  <Input label="Sender Wallet Address" placeholder="Your crypto wallet address" className="md:col-span-2" value={payment.senderWallet} onChange={updatePayment('senderWallet')} />
                </div>

                <div className="flex justify-between pt-8">
                  <Button variant="ghost" onClick={prevStep}>Back</Button>
                  <Button onClick={nextStep} className="px-10">Review Order <ChevronRight className="w-4 h-4" /></Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold">Review Order</h2>
                <div className="glass-card p-6 rounded-2xl space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <img
                        src={item.image || 'https://via.placeholder.com/100'}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover bg-slate-800"
                      />
                      <div className="flex-grow">
                        <div className="font-bold">{item.name}</div>
                        <div className="text-sm text-slate-400">Qty: {item.quantity}</div>
                      </div>
                      <div className="font-bold">{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-8 py-8 border-y border-dark-border">
                  <div>
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-2">Shipping to</h4>
                    <p className="text-sm">
                      {shipping.firstName} {shipping.lastName}<br />
                      {shipping.address}<br />
                      {shipping.city}, {shipping.zip}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-2">Payment</h4>
                    <p className="text-sm">Crypto (USDT/BTC)</p>
                    <p className="text-xs text-slate-500 mt-1 break-all">TxID: {payment.txHash}</p>
                  </div>
                </div>

                <div className="flex justify-between pt-8">
                  <Button variant="ghost" onClick={prevStep} disabled={isProcessing}>Back</Button>
                  <Button onClick={handlePlaceOrder} className="px-10" isLoading={isProcessing}>Place Order</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-28 p-6 space-y-6">
            <h3 className="text-xl font-bold">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Shipping</span>
                <span className="text-green-500">Free</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Estimated Tax</span>
                <span className="text-white">{formatCurrency(tax)}</span>
              </div>
              <div className="pt-4 border-t border-dark-border flex justify-between font-bold text-xl">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary mt-1" />
              <div className="text-xs text-slate-400">
                You'll earn <span className="text-white font-bold">{Math.floor(total * 0.1)} Shopiversa Points</span> with this order!
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
