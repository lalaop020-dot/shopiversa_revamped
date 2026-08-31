import { useEffect, useState } from 'react'
import { Check, X, ShieldAlert, CheckCircle2, History, RefreshCw } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import usePlatformStore from '../../store/usePlatformStore'
import toast from 'react-hot-toast'

export default function AdminTransactions() {
  const { fetchAdminTransactions, approveDeposit, rejectDeposit, approveWithdrawal, rejectWithdrawal } = usePlatformStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const txns = await fetchAdminTransactions()
    setTransactions(txns)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (tx) => {
    try {
      if (tx.type === 'Deposit') await approveDeposit(tx.id)
      else await approveWithdrawal(tx.id)
      toast.success(`${tx.type} approved!`)
      await load()
    } catch (err) { toast.error('Action failed') }
  }

  const handleReject = async (tx) => {
    try {
      if (tx.type === 'Deposit') await rejectDeposit(tx.id)
      else await rejectWithdrawal(tx.id)
      toast.success(`${tx.type} rejected`)
      await load()
    } catch (err) { toast.error('Action failed') }
  }

  const pending = transactions.filter(t => t.status === 'Pending')
  const completed = transactions.filter(t => t.status !== 'Pending')

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transactions Management</h1>
          <p className="text-slate-400">Review and approve manual cryptocurrency deposits and withdrawals.</p>
        </div>
        <Button variant="outline" onClick={load} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Pending */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-accent-gold">
            <ShieldAlert className="w-5 h-5" /> Pending Actions ({pending.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Tx ID</th>
                <th className="px-6 py-4 font-medium">Seller</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Hash / Address</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {pending.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No pending transactions</td></tr>
              ) : pending.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{tx.id}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{tx.sellerEmail}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.type === 'Deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{tx.type}</span>
                  </td>
                  <td className="px-6 py-4 font-bold">${Number(tx.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-xs max-w-[200px] truncate" title={tx.txHash || tx.walletAddress}>
                    {tx.type === 'Deposit' ? `TXID: ${tx.txHash || '—'}` : `To: ${tx.walletAddress || '—'}`}
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{tx.date}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" onClick={() => handleApprove(tx)} className="bg-green-600 hover:bg-green-700 h-8 px-3"><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(tx)} className="border-red-500/50 text-red-400 hover:bg-red-500/10 h-8 px-3"><X className="w-3 h-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Completed */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="font-bold flex items-center gap-2 text-green-500"><CheckCircle2 className="w-5 h-5" /> Completed ({completed.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Tx ID</th>
                <th className="px-6 py-4 font-medium">Seller</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {completed.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No completed transactions</td></tr>
              ) : completed.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{tx.id}</td>
                  <td className="px-6 py-4 text-sm">{tx.sellerEmail}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.type === 'Deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{tx.type}</span></td>
                  <td className="px-6 py-4 font-bold">${Number(tx.amount).toFixed(2)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${tx.status === 'Approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{tx.status}</span></td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
