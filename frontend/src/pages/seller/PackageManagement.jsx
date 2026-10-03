import { useState, useEffect, useMemo } from 'react'
import { Check, ShieldCheck, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import useAuthStore from '../../store/useAuthStore'
import usePlatformStore, { DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { PROFIT_RATES } from '../../utils/packages'

export default function PackageManagement() {
  const { user } = useAuthStore()
  const email = user?.email || 'seller@demo.com'

  const sub = usePlatformStore((state) => state.sellerSubscriptions[email] || DEFAULT_SUBSCRIPTION)
  const confirmPackageUpgrade = usePlatformStore((state) => state.confirmPackageUpgrade)
  const fetchCurrentPackage = usePlatformStore((state) => state.fetchCurrentPackage)
  const fetchPackageRequests = usePlatformStore((state) => state.fetchPackageRequests)

  const activeProfitRate = PROFIT_RATES[sub.name] || '17%'

  // Refresh plan regularly so seller sees their new package soon after confirming
  useEffect(() => {
    const refresh = () => { fetchCurrentPackage(); fetchPackageRequests() }
    refresh()
    const interval = setInterval(refresh, 10000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [fetchCurrentPackage, fetchPackageRequests])

  // Modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [txnPwd, setTxnPwd] = useState('')
  const [showTxnPwd, setShowTxnPwd] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const packages = [
    {
      name: 'Silver',
      price: '$0',
      priceVal: 0,
      period: '/ year',
      profitPercentage: '17%',
      features: [
        'Up to 300 active products',
        '17% Seller Profit Percentage',
        'Basic statistics & reports',
        'Standard customer support'
      ],
      current: sub.name === 'Silver'
    },
    {
      name: 'Gold',
      price: '$499',
      priceVal: 499,
      period: '/ year',
      profitPercentage: '20%',
      features: [
        'Up to 1000 active products',
        '20% Seller Profit Percentage',
        'Advanced analytics & heatmaps',
        'Priority customer support (24/7)'
      ],
      current: sub.name === 'Gold',
      popular: true
    },
    {
      name: 'Diamond',
      price: '$999',
      priceVal: 999,
      period: '/ year',
      profitPercentage: '25%',
      features: [
        'Up to 2000 active products',
        '25% Seller Profit Percentage',
        'Real-time deep analytics API',
        'Dedicated account manager',
        'Custom storefront design themes',
        'Beta access to new features'
      ],
      current: sub.name === 'Diamond'
    }
  ]

  const handleOpenCheckout = (pkg) => {
    if (pkg.name === 'Silver') {
      toast.success('Silver is our free tier and is already active.')
      return
    }
    if (pkg.current) {
      toast.success(`You are already subscribed to the ${pkg.name} package.`)
      return
    }
    setSelectedPlan(pkg)
    setTxnPwd('')
    setSubmitted(false)
    setCheckoutModalOpen(true)
  }

  const handleCloseModal = () => {
    setCheckoutModalOpen(false)
  }

  const handleConfirmPurchase = async (e) => {
    e.preventDefault()
    if (!txnPwd.trim()) return toast.error('Please enter your transaction password')
    setIsSubmitting(true)
    try {
      await confirmPackageUpgrade(selectedPlan.name, txnPwd.trim())
      setSubmitted(true)
      await fetchCurrentPackage()
      toast.success(`${selectedPlan.name} package is now active!`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Confirmation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Package Subscriptions</h1>
          <p className="text-slate-400">Upgrade your membership plan to unlock new product limits &amp; higher profit rates.</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-2xl px-5 py-3 flex items-center gap-4">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Active Plan</div>
            <div className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>{sub.name} Package</span>
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                {activeProfitRate} Profit Margin
              </span>
            </div>
          </div>
        </div>
      </div>

      {sub.status === 'Frozen' && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h4 className="font-bold text-red-400">Your Subscription is FROZEN</h4>
            <p className="text-xs text-slate-400 mt-1">
              Your access has been restricted by the Administrator. Please submit deposit payments or
              contact Admin Support to reactivate your store.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {packages.map((pkg, i) => (
          <Card
            key={i}
            className={`relative overflow-visible flex flex-col justify-between p-8 border-2 ${
              pkg.current
                ? sub.status === 'Frozen'
                  ? 'border-red-500 bg-red-500/5'
                  : 'border-primary bg-primary/5'
                : 'border-dark-border'
            }`}
          >
            {pkg.popular && (
              <span className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider">
                Popular Choice
              </span>
            )}

            <div>
              <div className="text-lg font-bold text-slate-400">{pkg.name}</div>
              <div className="flex items-baseline mt-4 mb-8">
                <span className="text-4xl font-extrabold text-white">{pkg.price}</span>
                <span className="text-slate-500 ml-1">{pkg.period}</span>
              </div>

              <ul className="space-y-4">
                {pkg.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-dark-border">
              {pkg.current ? (
                <Button
                  className={`w-full ${
                    sub.status === 'Frozen'
                      ? 'bg-red-500'
                      : 'bg-green-500 hover:bg-green-500 cursor-default hover:scale-100'
                  }`}
                  disabled={sub.status === 'Frozen'}
                >
                  {sub.status === 'Frozen' ? 'Frozen Tier' : 'Active Package'}
                </Button>
              ) : (
                <Button
                  variant={pkg.popular ? 'primary' : 'outline'}
                  className="w-full"
                  onClick={() => handleOpenCheckout(pkg)}
                  disabled={sub.status === 'Frozen'}
                >
                  Upgrade to {pkg.name}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Confirm Purchase Modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={submitted ? handleCloseModal : undefined}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card w-full max-w-md rounded-2xl relative z-10 overflow-hidden"
            >
              {/* Success State */}
              {submitted ? (
                <div className="p-8 space-y-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto"
                  >
                    <ShieldCheck className="w-9 h-9 text-green-500" />
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-xl text-white">Purchase Confirmed!</h3>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      Your{' '}
                      <strong className="text-white">
                        {selectedPlan?.name} ({selectedPlan?.price})
                      </strong>{' '}
                      package is now active. Enjoy your new benefits!
                    </p>
                  </div>
                  <Button className="w-full" onClick={handleCloseModal}>
                    Done
                  </Button>
                </div>
              ) : (
                /* Confirm Purchase Form */
                <form onSubmit={handleConfirmPurchase} className="p-8 space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold">
                      Upgrade to{' '}
                      <span className="text-primary">{selectedPlan?.name}</span>
                    </h2>
                  </div>

                  {/* Package Price */}
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-400">Package Price</span>
                    <span className="text-lg font-extrabold text-primary">
                      {selectedPlan?.price} USDT
                    </span>
                  </div>

                  {/* Transaction Password Section */}
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 font-medium">
                      Enter your transaction password to confirm purchase
                    </p>

                    {/* 5-slot visual password input */}
                    <div className="relative flex items-center justify-center gap-3 py-4">
                      {/* Invisible Input Overlay */}
                      <input
                        type={showTxnPwd ? 'text' : 'password'}
                        value={txnPwd}
                        onChange={(e) => setTxnPwd(e.target.value.slice(0, 5))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-text text-transparent z-10"
                        maxLength={5}
                        autoComplete="off"
                        required
                      />

                      {/* Visual Boxes */}
                      {[0, 1, 2, 3, 4].map((i) => {
                        const char = txnPwd[i]
                        return (
                          <div
                            key={i}
                            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                              char
                                ? 'border-primary bg-primary/10 text-white'
                                : 'border-dark-border bg-dark-bg/50'
                            }`}
                          >
                            {char ? (
                               showTxnPwd ? char : <span className="w-3 h-3 rounded-full bg-primary block" />
                            ) : null}
                          </div>
                        )
                      })}

                      {/* Show/Hide Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setShowTxnPwd(!showTxnPwd)
                        }}
                        className="absolute -right-8 sm:-right-4 top-1/2 -translate-y-1/2 z-20 p-2 text-slate-500 hover:text-white transition-colors"
                        title={showTxnPwd ? "Hide password" : "Show password"}
                      >
                        {showTxnPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <Button
                      variant="outline"
                      type="button"
                      className="flex-1"
                      onClick={handleCloseModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white border-green-600"
                      isLoading={isSubmitting}
                    >
                      Confirm Purchase
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
