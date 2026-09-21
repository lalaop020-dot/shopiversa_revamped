import { useState, useEffect, useMemo } from 'react'
import { Check, ShieldCheck, AlertCircle, Copy, Upload, CheckCircle2 } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import useAuthStore from '../../store/useAuthStore'
import usePlatformStore, { DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function PackageManagement() {
  const { user } = useAuthStore()
  const email = user?.email || 'seller@demo.com'
  const adminWallets = useAuthStore((state) => state.adminWallets) || {
    usdt: 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b',
    eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
  }

  const sub = usePlatformStore((state) => state.sellerSubscriptions[email] || DEFAULT_SUBSCRIPTION)
  const addPackageRequest = usePlatformStore((state) => state.addPackageRequest)
  const allPackageRequests = usePlatformStore((state) => state.packageRequests)
  const fetchCurrentPackage = usePlatformStore((state) => state.fetchCurrentPackage)
  const fetchPackageRequests = usePlatformStore((state) => state.fetchPackageRequests)
  const pendingRequests = useMemo(
    () => allPackageRequests.filter((r) => r.sellerEmail === email && r.status === 'Pending'),
    [allPackageRequests, email]
  )

  useEffect(() => {
    fetchCurrentPackage()
    fetchPackageRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)

  // Deposit-style form state
  const [selectedCrypto, setSelectedCrypto] = useState('USDT')
  const [txid, setTxid] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const cryptoOptions = ['USDT', 'ETH (TRC20)', 'BTC']

  const activeAdminWallet =
    selectedCrypto === 'ETH (TRC20)'
      ? adminWallets.eth || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
      : selectedCrypto === 'BTC'
      ? adminWallets.btc || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      : adminWallets.usdt || 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b'

  const PROFIT_RATES = { Silver: '17%', Gold: '25%', Platinum: '35%' }
  const activeProfitRate = PROFIT_RATES[sub.name] || '17%'

  const packages = [
    {
      name: 'Silver',
      price: '$0',
      priceVal: 0,
      period: '/mo',
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
      period: '/mo',
      profitPercentage: '25%',
      features: [
        'Up to 1000 active products',
        '25% Seller Profit Percentage',
        'Advanced analytics & heatmaps',
        'Priority customer support (24/7)'
      ],
      current: sub.name === 'Gold',
      popular: true
    },
    {
      name: 'Platinum',
      price: '$999',
      priceVal: 999,
      period: '/mo',
      profitPercentage: '35%',
      features: [
        'Up to 2000 active products',
        '35% Seller Profit Percentage',
        'Real-time deep analytics API',
        'Dedicated account manager',
        'Custom storefront design themes',
        'Beta access to new features'
      ],
      current: sub.name === 'Platinum'
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
    if (pendingRequests.length > 0) {
      toast.error('You already have a pending upgrade request. Please wait for admin approval.')
      return
    }
    setSelectedPlan(pkg)
    setSelectedCrypto('USDT')
    setTxid('')
    setProofFile(null)
    setProofPreview(null)
    setCopied(false)
    setSubmitted(false)
    setCheckoutModalOpen(true)
  }

  const handleCloseModal = () => {
    setCheckoutModalOpen(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeAdminWallet)
    setCopied(true)
    toast.success(`${selectedCrypto} address copied!`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleProofChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setProofPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!txid.trim()) return toast.error('Transaction ID (TXID) is required')
    setIsSubmitting(true)
    try {
      await addPackageRequest(
        email,
        selectedPlan.name,
        selectedPlan.priceVal,
        activeAdminWallet,
        txid.trim()
      )
      setSubmitted(true)
      toast.success('Package upgrade request submitted! Awaiting admin approval.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Package Subscriptions</h1>
          <p className="text-slate-400">Upgrade your membership plan to unlock new product limits & higher profit rates.</p>
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

      {pendingRequests.length > 0 && (
        <div className="p-4 bg-accent-gold/10 border border-accent-gold/25 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-accent-gold shrink-0 animate-pulse" />
          <div>
            <h4 className="font-bold text-accent-gold">Upgrade Pending Review</h4>
            <p className="text-xs text-slate-400 mt-1">
              Your upgrade to <strong>{pendingRequests[0].packageName}</strong> is pending manual
              verification of transaction hash{' '}
              <span className="font-mono bg-dark-bg px-1.5 py-0.5 rounded text-[11px] ml-1">
                {pendingRequests[0].txHash?.substring(0, 16)}...
              </span>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {packages.map((pkg, i) => (
          <Card
            key={i}
            className={`relative flex flex-col justify-between p-8 border-2 ${
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

      {/* Checkout Modal */}
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
              className="glass-card w-full max-w-lg rounded-2xl relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* ── Success State ── */}
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
                    <h3 className="font-bold text-xl text-white">Request Submitted!</h3>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      Your{' '}
                      <strong className="text-white">
                        {selectedPlan?.name} ({selectedPlan?.price})
                      </strong>{' '}
                      upgrade request has been queued. The admin will verify your transaction and
                      activate your plan shortly.
                    </p>
                  </div>
                  <div className="bg-dark-bg border border-dark-border rounded-xl p-4 text-left space-y-2 font-mono text-xs text-slate-400">
                    <div className="flex justify-between items-center">
                      <span>Package:</span>
                      <span className="text-white font-bold">{selectedPlan?.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Network:</span>
                      <span className="text-white">{selectedCrypto}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Transaction ID:</span>
                      <span className="text-white break-all">{txid}</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCloseModal}>
                    Done
                  </Button>
                </div>
              ) : (
                /* ── Payment Form ── */
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                  {/* Header */}
                  <div>
                    <h2 className="text-2xl font-bold">
                      Upgrade to{' '}
                      <span className="text-primary">{selectedPlan?.name}</span>
                    </h2>
                    <p className="text-slate-400 text-xs mt-1">
                      Send{' '}
                      <strong className="text-white">{selectedPlan?.price} USDT equivalent</strong>{' '}
                      to the platform address below, then enter your transaction ID to submit your
                      upgrade request.
                    </p>
                  </div>

                  {/* Crypto selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      Select Crypto Network
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {cryptoOptions.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedCrypto(c)}
                          className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                            selectedCrypto === c
                              ? 'bg-primary text-white border-primary shadow-md shadow-primary/25'
                              : 'bg-dark-bg text-slate-400 border-dark-border hover:border-slate-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admin wallet address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      Send {selectedCrypto} To This Address
                    </label>
                    <div className="flex items-center gap-2 bg-dark-bg rounded-xl p-3 font-mono text-xs break-all border border-dark-border group">
                      <span className="flex-1 text-slate-200 leading-relaxed">
                        {activeAdminWallet}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                        title="Copy address"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      ⚠️ Only send {selectedCrypto} on the correct network. Wrong network transfers
                      cannot be recovered.
                    </p>
                  </div>

                  {/* Amount display */}
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-400">Package Price</span>
                    <span className="text-lg font-extrabold text-primary">
                      {selectedPlan?.price} USDT
                    </span>
                  </div>

                  {/* TXID input */}
                  <Input
                    label="Transaction ID (TXID)"
                    placeholder="Paste your blockchain transaction ID here"
                    value={txid}
                    onChange={(e) => setTxid(e.target.value)}
                    required
                  />

                  {/* Screenshot proof */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                      Payment Screenshot{' '}
                      <span className="normal-case font-normal text-slate-500">(optional)</span>
                    </label>
                    <label
                      htmlFor="pkg-proof"
                      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                        proofFile
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-dark-border hover:border-slate-500 bg-dark-bg'
                      }`}
                    >
                      {proofPreview ? (
                        <img
                          src={proofPreview}
                          alt="Proof preview"
                          className="max-h-28 rounded-lg object-contain"
                        />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-500" />
                          <span className="text-xs text-slate-500">
                            Click to upload a screenshot
                          </span>
                        </>
                      )}
                      {proofFile && (
                        <span className="text-[10px] text-primary font-medium truncate max-w-full">
                          {proofFile.name}
                        </span>
                      )}
                    </label>
                    <input
                      id="pkg-proof"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProofChange}
                    />
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
                    <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                      Submit Upgrade Request
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
