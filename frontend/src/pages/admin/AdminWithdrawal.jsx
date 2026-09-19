import { useState, useMemo, useEffect } from 'react'
import { Wallet, ArrowUpRight, History, Coins, CheckCircle2 } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import usePlatformStore from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function AdminWithdrawal() {
  const transactions = usePlatformStore((state) => state.transactions)
  const adminBankWithdrawals = usePlatformStore((state) => state.adminBankWithdrawals) || []
  const adminTotalWithdrawn = usePlatformStore((state) => state.adminTotalWithdrawn) || 0
  const requestAdminBankWithdrawal = usePlatformStore((state) => state.requestAdminBankWithdrawal)
  const fetchAdminTransactions = usePlatformStore((state) => state.fetchAdminTransactions)
  const fetchAdminBankWithdrawals = usePlatformStore((state) => state.fetchAdminBankWithdrawals)

  useEffect(() => {
    fetchAdminTransactions()
    fetchAdminBankWithdrawals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState('USDT') // 'USDT' | 'ETH (TRC20)' | 'BNB'
  const [filterCrypto, setFilterCrypto] = useState('All') // 'All' | 'USDT' | 'ETH (TRC20)' | 'BNB'
  const [walletAddress, setWalletAddress] = useState('')
  const [amount, setAmount] = useState('')

  // Calculate platform revenue
  const totalPlatformRevenue = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Deposit' && t.status === 'Approved')
      .reduce((sum, tx) => sum + tx.amount, 0)
  }, [transactions])

  const availableBalance = Math.max(0, totalPlatformRevenue - adminTotalWithdrawn)

  const stats = [
    { label: 'Total Revenue', value: `$${totalPlatformRevenue.toFixed(2)}`, icon: Wallet, color: 'text-primary' },
    { label: 'Available to Withdraw', value: `$${availableBalance.toFixed(2)}`, icon: ArrowUpRight, color: 'text-green-500' },
    { label: 'Total Withdrawn', value: `$${adminTotalWithdrawn.toFixed(2)}`, icon: History, color: 'text-accent-gold' },
  ]

  const cryptoOptions = [
    { id: 'USDT', name: 'USDT', network: 'TRC20', color: 'from-green-500/20 to-emerald-500/5', borderColor: 'border-green-500/30', badgeColor: 'bg-green-500/10 text-green-500 border-green-500/20' },
    { id: 'ETH (TRC20)', name: 'ETH', network: 'TRC20', color: 'from-purple-500/20 to-indigo-500/5', borderColor: 'border-purple-500/30', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { id: 'BNB', name: 'BNB', network: 'BEP20', color: 'from-amber-500/20 to-yellow-500/5', borderColor: 'border-amber-500/30', badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  ]

  const openWithdrawalFor = (cryptoId) => {
    setSelectedCrypto(cryptoId)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const withdrawAmt = parseFloat(amount)

    if (!withdrawAmt || withdrawAmt <= 0) {
      toast.error('Invalid withdrawal amount')
      return
    }
    if (withdrawAmt > availableBalance) {
      toast.error('Withdrawal amount exceeds available balance')
      return
    }
    if (!walletAddress || walletAddress.trim().length < 5) {
      toast.error(`Please provide a valid ${selectedCrypto} wallet address`)
      return
    }

    setIsSubmitting(true)
    try {
      await requestAdminBankWithdrawal(selectedCrypto, walletAddress.trim(), withdrawAmt)
      toast.success(`${selectedCrypto} withdrawal request submitted successfully!`)
      setWalletAddress('')
      setAmount('')
      setIsModalOpen(false)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit withdrawal request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredWithdrawals = useMemo(() => {
    if (filterCrypto === 'All') return adminBankWithdrawals
    return adminBankWithdrawals.filter((w) => {
      const cType = w.cryptoType || w.bankName || 'USDT'
      return cType.toLowerCase() === filterCrypto.toLowerCase()
    })
  }, [adminBankWithdrawals, filterCrypto])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Revenue Withdrawal</h1>
          <p className="text-slate-400 text-sm">Withdraw platform revenue directly to your USDT, ETH (TRC20), or BNB crypto wallets.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Coins className="w-4 h-4" /> Request Crypto Withdrawal
        </Button>
      </div>

      {/* Top Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-dark-bg ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-400">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Crypto Selection Dashes */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Supported Crypto Networks</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cryptoOptions.map((crypto) => {
            const count = adminBankWithdrawals.filter((w) => {
              const cType = w.cryptoType || w.bankName || 'USDT'
              return cType.toLowerCase() === crypto.id.toLowerCase()
            }).length

            return (
              <Card 
                key={crypto.id} 
                className={`p-5 bg-gradient-to-br ${crypto.color} border ${crypto.borderColor} flex justify-between items-center hover:scale-[1.01] transition-transform`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg text-white">{crypto.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${crypto.badgeColor}`}>
                      {crypto.network}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{count} past withdrawal{count !== 1 ? 's' : ''}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => openWithdrawalFor(crypto.id)}
                  className="text-xs"
                >
                  Withdraw
                </Button>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Withdrawal History & Filters */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Withdrawal History
          </h3>
          
          {/* Dashboards / Filter options for withdrawal */}
          <div className="flex items-center gap-1.5 bg-dark-bg p-1 rounded-xl border border-dark-border self-start sm:self-auto">
            {['All', 'USDT', 'ETH (TRC20)', 'BNB'].map((option) => (
              <button
                key={option}
                onClick={() => setFilterCrypto(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCrypto === option
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Crypto Network</th>
                <th className="px-6 py-4 font-medium">Wallet Address</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredWithdrawals.map((req) => {
                const cType = req.cryptoType || req.bankName || 'USDT'
                const isEth = cType.includes('ETH')
                const isBnb = cType.includes('BNB')
                const badgeStyle = isEth 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  : isBnb
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-green-500/10 text-green-500 border-green-500/20'

                const walletAddr = req.walletAddress || req.iban || 'Address not recorded'

                return (
                  <tr key={req.id} className="hover:bg-dark-bg/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-slate-300">{req.id}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
                        {cType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300 max-w-xs truncate" title={walletAddr}>
                      {walletAddr}
                    </td>
                    <td className="px-6 py-4 font-bold text-red-400">
                      -${req.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                        <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{req.date}</td>
                  </tr>
                )
              })}
              {filteredWithdrawals.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">
                    No withdrawal history found for {filterCrypto}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Withdrawal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card w-full max-w-lg p-8 rounded-2xl relative z-10 space-y-6"
          >
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" /> Crypto Revenue Withdrawal
            </h2>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="text-xs font-semibold uppercase text-primary tracking-wider mb-1">Available to Withdraw</div>
              <div className="text-3xl font-bold text-white">${availableBalance.toFixed(2)}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Separate Crypto Selection Option */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Crypto Wallet Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {cryptoOptions.map((crypto) => (
                    <button
                      key={crypto.id}
                      type="button"
                      onClick={() => setSelectedCrypto(crypto.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                        selectedCrypto === crypto.id
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                          : 'bg-dark-bg text-slate-400 border-dark-border hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-sm">{crypto.name}</span>
                      <span className="text-[10px] opacity-80">({crypto.network})</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input 
                label={`Your ${selectedCrypto} Wallet Address`} 
                placeholder={selectedCrypto === 'ETH (TRC20)' ? '0x...' : selectedCrypto === 'BNB' ? 'bnb1...' : 'T.....'} 
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                required 
              />
              
              <Input 
                label="Withdrawal Amount ($)" 
                placeholder="0.00" 
                type="number" 
                step="0.01"
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required 
              />

              <div className="flex gap-4 pt-4 border-t border-dark-border">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-grow" isLoading={isSubmitting}>Submit Request</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
