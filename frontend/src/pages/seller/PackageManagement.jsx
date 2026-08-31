import { useState, useEffect, useMemo } from 'react'
import { Check, ShieldCheck, CreditCard, Lock, Radio, AlertCircle } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import useAuthStore from '../../store/useAuthStore'
import usePlatformStore, { DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function PackageManagement() {
  const { user } = useAuthStore()
  const email = user?.email || 'seller@demo.com'

  const sub = usePlatformStore((state) => state.sellerSubscriptions[email] || DEFAULT_SUBSCRIPTION)
  const addPackageRequest = usePlatformStore((state) => state.addPackageRequest)
  const allPackageRequests = usePlatformStore((state) => state.packageRequests)
  const fetchCurrentPackage = usePlatformStore((state) => state.fetchCurrentPackage)
  const fetchPackageRequests = usePlatformStore((state) => state.fetchPackageRequests)
  const pendingRequests = useMemo(() => allPackageRequests.filter(r => r.sellerEmail === email && r.status === 'Pending'), [allPackageRequests, email])

  useEffect(() => {
    fetchCurrentPackage()
    fetchPackageRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  
  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState(1) // 1: Connect, 2: Approve, 3: Success
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [isSubmittingTx, setIsSubmittingTx] = useState(false)
  const [generatedTxHash, setGeneratedTxHash] = useState('')

  const packages = [
    {
      name: 'Silver',
      price: '$0',
      period: '/mo',
      features: [
        'Up to 50 active products',
        'Basic statistics & reports',
        'Standard customer support',
        '3% transaction fee'
      ],
      current: sub.name === 'Silver'
    },
    {
      name: 'Gold',
      price: '$499',
      period: '/mo',
      features: [
        'Up to 500 active products',
        'Advanced analytics & heatmaps',
        'Priority customer support (24/7)',
        '1.5% transaction fee',
        'Exclusive promotion tools'
      ],
      current: sub.name === 'Gold',
      popular: true
    },
    {
      name: 'Platinum',
      price: '$999',
      period: '/mo',
      features: [
        'Unlimited active products',
        'Real-time deep analytics API',
        'Dedicated account manager',
        '0.5% transaction fee',
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
    setCheckoutStep(1)
    setWalletConnected(false)
    setWalletAddress('')
    setCheckoutModalOpen(true)
  }

  const handleConnectWallet = () => {
    setWalletConnected(true)
    const mockAddress = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    setWalletAddress(mockAddress)
    toast.success('Wallet connected successfully!')
    setCheckoutStep(2)
  }

  const handleSendTransaction = () => {
    setIsSubmittingTx(true)
    setTimeout(() => {
      const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      const priceVal = selectedPlan.name === 'Gold' ? 499 : 999
      addPackageRequest(email, selectedPlan.name, priceVal, walletAddress, mockHash)
      setGeneratedTxHash(mockHash)
      setIsSubmittingTx(false)
      setCheckoutStep(3)
      toast.success('Crypto transaction submitted to admin approval queue!')
    }, 2000)
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Package Subscriptions</h1>
        <p className="text-slate-400">Upgrade or downgrade your membership plan to unlock new premium capabilities.</p>
      </div>

      {sub.status === 'Frozen' && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h4 className="font-bold text-red-400">Your Subscription is FROZEN</h4>
            <p className="text-xs text-slate-400 mt-1">Your access has been restricted by the Administrator. Please submit deposit payments or contact Admin Support to reactivate your store.</p>
          </div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="p-4 bg-accent-gold/10 border border-accent-gold/25 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-accent-gold shrink-0 animate-pulse" />
          <div>
            <h4 className="font-bold text-accent-gold">Upgrade Pending Review</h4>
            <p className="text-xs text-slate-400 mt-1">
              Your upgrade to <strong>{pendingRequests[0].packageName}</strong> is pending manual verification of transaction hash 
              <span className="font-mono bg-dark-bg px-1.5 py-0.5 rounded text-[11px] ml-1">{pendingRequests[0].txHash.substring(0, 16)}...</span>.
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
                ? sub.status === 'Frozen' ? 'border-red-500 bg-red-500/5' : 'border-primary bg-primary/5'
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
                  className={`w-full ${sub.status === 'Frozen' ? 'bg-red-500' : 'bg-green-500 hover:bg-green-500 cursor-default hover:scale-100'}`}
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
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCheckoutModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card w-full max-w-lg p-8 rounded-2xl relative z-10"
          >
            <h2 className="text-2xl font-bold mb-2">Upgrade to {selectedPlan?.name}</h2>
            <p className="text-slate-400 text-xs mb-6">Payment is processed manually via crypto transfer. Connect wallet to sign the deposit proof.</p>

            {checkoutStep === 1 && (
              <div className="space-y-6">
                <div className="p-6 bg-dark-bg border border-dark-border rounded-xl text-center space-y-4">
                  <CreditCard className="w-12 h-12 text-slate-500 mx-auto" />
                  <div>
                    <h3 className="font-bold text-sm">Web3 Wallet Signature Required</h3>
                    <p className="text-slate-500 text-xs mt-1">Connect your browser wallet (MetaMask, Trust Wallet, etc.) to continue checkout.</p>
                  </div>
                  <Button className="w-full" onClick={handleConnectWallet}>Connect Wallet</Button>
                </div>
                <Button variant="outline" className="w-full" onClick={() => setCheckoutModalOpen(false)}>Cancel</Button>
              </div>
            )}

            {checkoutStep === 2 && (
              <div className="space-y-6">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Connected Wallet:</span>
                    <span className="font-mono text-white max-w-[200px] truncate">{walletAddress}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Upgrade Package:</span>
                    <span className="font-bold text-white">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs border-t border-dark-border/20 pt-2 font-bold">
                    <span className="text-slate-400">Total Price:</span>
                    <span className="text-primary">{selectedPlan?.price} USDT</span>
                  </div>
                </div>

                <div className="p-4 bg-dark-bg border border-dark-border rounded-xl">
                  <div className="text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" /> Security Note
                  </div>
                  <p className="text-[10px] text-slate-500">Signing this request generates a cryptographically signed purchase request. Once checked on-chain by our administrators, your subscription changes immediately.</p>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-grow" onClick={() => setCheckoutStep(1)}>Back</Button>
                  <Button className="flex-grow" onClick={handleSendTransaction} isLoading={isSubmittingTx}>
                    Authorize & Submit
                  </Button>
                </div>
              </div>
            )}

            {checkoutStep === 3 && (
              <div className="space-y-6 text-center py-4">
                <div className="w-14 h-14 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Upgrade Request Registered</h3>
                  <p className="text-slate-400 text-xs mt-2 px-4">
                    Your manual payment of <strong>{selectedPlan?.price}</strong> is queued. The admin will verify the hash shortly.
                  </p>
                </div>
                
                <div className="bg-dark-bg border border-dark-border p-3 rounded-lg text-left max-w-sm mx-auto font-mono text-[10px] space-y-1.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Package:</span>
                    <span className="text-white">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex flex-col">
                    <span>Transaction Hash:</span>
                    <span className="text-white break-all mt-0.5">{generatedTxHash}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => setCheckoutModalOpen(false)}>Done</Button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
