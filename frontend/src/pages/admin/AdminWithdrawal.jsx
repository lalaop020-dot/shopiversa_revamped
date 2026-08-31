import { useState, useMemo, useEffect } from 'react'
import { Landmark, ArrowUpRight, History, CreditCard } from 'lucide-react'
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
  const [bankName, setBankName] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [iban, setIban] = useState('')
  const [amount, setAmount] = useState('')

  // Calculate platform revenue
  const totalPlatformRevenue = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Deposit' && t.status === 'Approved')
      .reduce((sum, tx) => sum + tx.amount, 0)
  }, [transactions])

  const availableBalance = Math.max(0, totalPlatformRevenue - adminTotalWithdrawn)

  const stats = [
    { label: 'Total Revenue', value: `$${totalPlatformRevenue.toFixed(2)}`, icon: Landmark, color: 'text-primary' },
    { label: 'Available to Withdraw', value: `$${availableBalance.toFixed(2)}`, icon: ArrowUpRight, color: 'text-green-500' },
    { label: 'Total Withdrawn', value: `$${adminTotalWithdrawn.toFixed(2)}`, icon: History, color: 'text-accent-gold' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    const withdrawAmt = parseFloat(amount)

    if (!withdrawAmt || withdrawAmt <= 0) {
      toast.error('Invalid withdrawal amount')
      return
    }
    if (!bankName || !accountHolder || !iban) {
      toast.error('Please fill all bank details')
      return
    }

    setIsSubmitting(true)
    try {
      await requestAdminBankWithdrawal(bankName, accountHolder, iban, withdrawAmt)
      toast.success('Withdrawal request submitted successfully!')
      setBankName('')
      setAccountHolder('')
      setIban('')
      setAmount('')
      setIsModalOpen(false)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit withdrawal request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Revenue Withdrawal</h1>
          <p className="text-slate-400">Withdraw platform revenue to your local or international bank accounts.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Request Withdrawal</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-dark-bg ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-400">{stat.label}</div>
              <div className="text-xl font-bold">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Withdrawal History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Request ID</th>
                <th className="px-6 py-4 font-medium">Bank Details</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {adminBankWithdrawals.map((req) => (
                <tr key={req.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{req.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-sm">{req.bankName}</div>
                    <div className="text-xs text-slate-400">{req.accountHolder}</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-1">{req.iban}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-red-400">
                    -${req.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-accent-gold">
                      <div className="w-2 h-2 rounded-full bg-accent-gold animate-pulse" />
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{req.date}</td>
                </tr>
              ))}
              {adminBankWithdrawals.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-500">
                    No withdrawal history found.
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
            className="glass-card w-full max-w-lg p-8 rounded-2xl relative z-10"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" /> Bank Withdrawal
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-6">
                <div className="text-sm font-bold text-primary mb-1">Available to Withdraw</div>
                <div className="text-2xl font-bold">${availableBalance.toFixed(2)}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bank Name"
                  placeholder="e.g. Meezan Bank, HBL" 
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required 
                />
                <Input 
                  label="Account Holder Name" 
                  placeholder="John Doe" 
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  required 
                />
              </div>

              <Input 
                label="IBAN / Account Number" 
                placeholder="PK00 MEEZ 0000 0000 0000 0000" 
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                required 
              />
              
              <Input 
                label="Withdrawal Amount ($)" 
                placeholder="0.00" 
                type="number" 
                step="0.01"
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
