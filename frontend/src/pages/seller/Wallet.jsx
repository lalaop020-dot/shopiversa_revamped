import { useState, useEffect } from 'react'
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, History, Plus } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import useAuthStore from '../../store/useAuthStore'
import usePlatformStore, { DEFAULT_BALANCE, DEFAULT_SUBSCRIPTION } from '../../store/usePlatformStore'
import { prepareProofFile } from '../../utils/proofFile'
import DepositAddress, { addressFor } from '../../components/common/DepositAddress'
import toast from 'react-hot-toast'

const PROFIT_RATES = { Silver: '17%', Gold: '25%', Platinum: '35%' }

export default function Wallet() {
  const { user } = useAuthStore()
  const email = user?.email || ''
  // Platform deposit addresses, set by the admin and read from the server.
  const depositWallets = usePlatformStore((state) => state.depositWallets)
  const balances = usePlatformStore((state) => state.balances[email] || DEFAULT_BALANCE)
  const transactions = usePlatformStore((state) => state.transactions)
  const sub = usePlatformStore((state) => state.sellerSubscriptions[email] || DEFAULT_SUBSCRIPTION)
  const activeProfitRate = PROFIT_RATES[sub.name] || '17%'
  const { fetchBalance, addDepositRequest, addWithdrawalRequest, fetchTransactions } = usePlatformStore()

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [depositCrypto, setDepositCrypto] = useState('USDT') // USDT, ETH (TRC20), BTC
  const [withdrawCrypto, setWithdrawCrypto] = useState('USDT') // USDT, ETH (TRC20), BTC
  const [depositAmount, setDepositAmount] = useState('')
  const [depositTxid, setDepositTxid] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')
  const [withdrawProof, setWithdrawProof] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const refreshData = () => {
      fetchBalance()
      fetchTransactions()
      usePlatformStore.getState().fetchCurrentPackage()
      usePlatformStore.getState().fetchDepositWallets()
    }
    refreshData()
    const interval = setInterval(refreshData, 10000)
    window.addEventListener('focus', refreshData)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshData)
    }
  }, [fetchBalance, fetchTransactions])

  const activeAdminWallet = addressFor(depositWallets, depositCrypto)

  const stats = [
    { label: 'Total Balance', value: `$${Number(balances.balance).toFixed(2)}`, icon: WalletIcon, color: 'text-primary' },
    { label: 'Withdrawable', value: `$${Number(balances.withdrawable).toFixed(2)}`, icon: ArrowUpRight, color: 'text-green-500' },
    { label: 'Pending Deposit', value: `$${Number(balances.pendingDeposit).toFixed(2)}`, icon: History, color: 'text-accent-gold' },
    { label: 'Total Withdrawn', value: `$${Number(balances.totalWithdrawn).toFixed(2)}`, icon: ArrowDownLeft, color: 'text-red-500' },
  ]

  // Validate (and shrink, if it's a big phone photo) a chosen screenshot before keeping it.
  const pickProof = async (e, setter) => {
    const input = e.target
    const { file, error } = await prepareProofFile(input.files[0] || null)
    if (error) { toast.error(error); input.value = ''; setter(null); return }
    setter(file)
  }

  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    if (!depositAmount || parseFloat(depositAmount) <= 0) return toast.error('Invalid deposit amount')
    if (!activeAdminWallet) return toast.error('No payment address is set for this network yet. Choose another network or contact support.')
    if (!depositTxid) return toast.error('Transaction ID is required')
    if (!proofFile) return toast.error('Please upload a screenshot of your payment')
    setLoading(true)
    try {
      await addDepositRequest(email, depositAmount, depositTxid, proofFile)
      toast.success('Deposit request submitted! Awaiting admin approval.')
      setDepositAmount(''); setDepositTxid(''); setProofFile(null)
      setIsDepositModalOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Deposit failed')
    } finally { setLoading(false) }
  }

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    const amt = parseFloat(withdrawAmount)
    if (!amt || amt <= 0) return toast.error('Invalid amount')
    if (!withdrawAddress) return toast.error('Wallet address required')
    setLoading(true)
    try {
      const fullAddress = `[${withdrawCrypto}] ${withdrawAddress}`
      await addWithdrawalRequest(email, amt, fullAddress, withdrawProof)
      toast.success(`Withdrawal request (${withdrawCrypto}) submitted!`)
      setWithdrawAmount(''); setWithdrawAddress(''); setWithdrawProof(null)
      setIsWithdrawModalOpen(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Withdrawal failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">My Wallet</h1>
            <span className="bg-primary/10 border border-primary/30 text-primary text-xs font-bold px-3 py-1 rounded-full">
              {sub.name} Package ({activeProfitRate} Profit Margin)
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">Manage deposits, withdrawals, and store balance real-time.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setIsWithdrawModalOpen(true)}>Withdraw</Button>
          <Button onClick={() => setIsDepositModalOpen(true)}><Plus className="w-4 h-4 mr-1" /> Deposit</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-slate-400 text-sm">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="font-bold">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {transactions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No transactions yet</td></tr>
              ) : transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{tx.id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.type === 'Deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{tx.type}</span>
                  </td>
                  <td className="px-6 py-4 font-bold">${Number(tx.amount).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${tx.status === 'Approved' ? 'bg-green-500/10 text-green-500' : tx.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{tx.status}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg">Submit Deposit</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Select Crypto Network</label>
              <div className="grid grid-cols-3 gap-2">
                {['USDT', 'ETH (TRC20)', 'BTC'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDepositCrypto(c)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      depositCrypto === c
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-dark-bg text-slate-400 border-dark-border hover:border-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-slate-400 text-xs mt-2">Send <strong>{depositCrypto}</strong> to the platform address below, then enter your TXID:</p>
            <DepositAddress address={activeAdminWallet} network={depositCrypto} />
            <form onSubmit={handleDepositSubmit} className="space-y-3 pt-2">
              <Input label="Amount (USD)" type="number" placeholder="100" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
              <Input label="Transaction ID (TXID)" placeholder="Blockchain TXID" value={depositTxid} onChange={e => setDepositTxid(e.target.value)} />
              <div>
                <label className="block text-sm font-medium mb-1">Payment Screenshot <span className="text-red-400 text-xs font-normal">(required)</span></label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pickProof(e, setProofFile)} className="text-sm text-slate-400" />
                {proofFile && <p className="text-[10px] text-primary mt-1 truncate">{proofFile.name}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setIsDepositModalOpen(false)}>Cancel</Button>
                <Button className="flex-1" type="submit" isLoading={loading} disabled={!activeAdminWallet}>Submit Deposit</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg">Request Withdrawal</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Select Withdrawal Crypto</label>
              <div className="grid grid-cols-3 gap-2">
                {['USDT', 'ETH (TRC20)', 'BTC'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setWithdrawCrypto(c)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      withdrawCrypto === c
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-dark-bg text-slate-400 border-dark-border hover:border-slate-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleWithdrawSubmit} className="space-y-3 pt-2">
              <Input label="Amount ($)" type="number" placeholder="50" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
              <Input 
                label={`Your ${withdrawCrypto} Wallet Address`} 
                placeholder={withdrawCrypto === 'ETH (TRC20)' ? '0x...' : withdrawCrypto === 'BTC' ? '1A...' : 'T.....'} 
                value={withdrawAddress} 
                onChange={e => setWithdrawAddress(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Screenshot <span className="text-slate-500 text-xs font-normal">(optional)</span></label>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pickProof(e, setWithdrawProof)} className="text-sm text-slate-400" />
                {withdrawProof && <p className="text-[10px] text-primary mt-1 truncate">{withdrawProof.name}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" type="button" onClick={() => setIsWithdrawModalOpen(false)}>Cancel</Button>
                <Button className="flex-1" type="submit" isLoading={loading}>Submit Request</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
