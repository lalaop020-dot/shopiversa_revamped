import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter, Search, ShoppingBag, X, MapPin, CreditCard,
  ShieldCheck, Lock, ArrowRight, KeyRound, CheckCircle2,
  AlertTriangle, EyeOff,
} from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import useOrderStore, { getOrderCustomerEmail } from '../../store/useOrderStore'
import { orderPricingBreakdown } from '../../utils/packages'
import { ORDER_FLOW, statusMeta, nextStatusOptions } from '../../utils/orderStatus'
import toast from 'react-hot-toast'

const ALL_STATUSES = [...ORDER_FLOW, 'Cancelled']

/* ─────────────────────────────────────────────────────────────────────
   Inline Transaction Password Prompt (renders inside the order modal)
───────────────────────────────────────────────────────────────────── */
function TxnPasswordPrompt({ onVerified, isVerifying, setIsVerifying, onCancel }) {
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const verifyTransactionPassword = useOrderStore(s => s.verifyTransactionPassword)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!pwd.trim()) return toast.error('Enter your transaction password')
    setIsVerifying(true)
    try {
      await verifyTransactionPassword(pwd)
      onVerified(pwd)
      toast.success('Transaction password verified ✓')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Incorrect transaction password. Please try again.')
      setPwd('')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mt-2"
    >
      <p className="text-white text-[15px]">Enter your transaction password to confirm purchase</p>

      <form onSubmit={handleVerify} className="space-y-6">
        {/* 5-slot visual password input */}
        <div className="relative flex items-center gap-3">
          {/* Invisible Input Overlay */}
          <input
            type={show ? 'text' : 'password'}
            value={pwd}
            onChange={(e) => setPwd(e.target.value.slice(0, 5))}
            className="absolute inset-0 w-[calc(100%-3rem)] h-full opacity-0 cursor-text text-transparent z-10"
            maxLength={5}
            autoComplete="off"
            required
          />

          {/* Visual Boxes */}
          {[0, 1, 2, 3, 4].map((i) => {
            const char = pwd[i]
            return (
              <div
                key={i}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  char
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-slate-700/50 bg-[#161a29]'
                }`}
              >
                {char ? (
                   show ? char : <span className="w-3.5 h-3.5 rounded-full bg-primary block" />
                ) : null}
              </div>
            )
          })}

          {/* Show/Hide Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setShow(!show)
            }}
            className="ml-2 z-20 p-2 text-slate-400 hover:text-white transition-colors"
            title={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 py-2.5 border-dark-border text-white hover:bg-dark-bg"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 py-2.5 bg-[#17b954] hover:bg-[#14a34a] border-0 text-white font-medium"
            isLoading={isVerifying}
            disabled={!pwd.trim()}
          >
            Confirm Order
          </Button>
        </div>
      </form>
    </motion.div>
  )
}

/* Eye icon pulled separately to avoid name clash with lucide Eye */
function Eye({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────
   Main page component
───────────────────────────────────────────────────────────────────── */
export default function SellerOrders() {
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)

  // transaction-password session state (reset each time modal opens)
  const [txnVerified, setTxnVerified]     = useState(false)
  const [isVerifying, setIsVerifying]     = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const rawOrders         = useOrderStore(s => s.orders)
  const fetchSellerOrders = useOrderStore(s => s.fetchSellerOrders)
  const updateOrderStatus = useOrderStore(s => s.updateOrderStatus)

  useEffect(() => {
    fetchSellerOrders()
    const iv = setInterval(fetchSellerOrders, 10_000)
    window.addEventListener('focus', fetchSellerOrders)
    return () => { clearInterval(iv); window.removeEventListener('focus', fetchSellerOrders) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* open modal and reset verification */
  const openOrder = useCallback((order) => {
    setSelectedOrder(order)
    setTxnVerified(false)
  }, [])

  const closeModal = () => {
    setSelectedOrder(null)
    setTxnVerified(false)
  }

  /* update status — only reachable after txn password verified */
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (!txnVerified) return toast.error('Verify your transaction password first.')
    setUpdatingStatus(true)
    try {
      const updated = await updateOrderStatus(orderId, newStatus)
      setSelectedOrder(prev => ({
        ...prev,
        ...updated,
        customerEmail: prev?.customerEmail,
        shippingAddress: { ...prev?.shippingAddress, ...updated?.shippingAddress },
        items: prev?.items?.map((item, i) => ({
          ...item, ...(updated?.items?.[i] || {}),
        })) || updated?.items,
      }))
      toast.success(`Order marked as ${statusMeta(newStatus).label}`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update order status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  /* display rows */
  const orders = rawOrders.map(o => ({
    id: o.id,
    customer: o.shippingAddress?.name || 'Unknown',
    customerEmail: getOrderCustomerEmail(o),
    items: o.items ? o.items.reduce((s, i) => s + i.quantity, 0) : 0,
    total: o.total,
    date: new Date(o.createdAt).toLocaleDateString(),
    status: o.status,
  }))

  const filteredOrders = orders
    .filter(o =>
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter(o => statusFilter === 'All' || o.status === statusFilter)

  return (
    <div className="space-y-8 animate-fade-in">

      {/* page header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
        <p className="text-slate-400">Track and fulfil customer orders. Transaction password is required to process actions.</p>
      </div>

      {/* ── Transaction Password info banner ── */}
      <div className="flex items-start gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-primary text-sm">Transaction Password Protection Active</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Every order action (confirming, shipping, delivering) requires your{' '}
            <strong className="text-white">transaction password</strong>. Open any order, enter your
            password in the <em>Transaction Password</em> section to unlock actions. Change it anytime
            under <span className="text-primary">Settings → Security</span>.
          </p>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search by Order ID or Customer…"
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-dark-card border border-dark-border rounded-lg pl-10 pr-8 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="All">All Statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{statusMeta(s).label}</option>
            ))}
          </select>
          <Filter className="absolute left-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* ── Orders table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Order ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Items</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Txn Auth</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredOrders.map(order => {
                const { label, color, icon: Icon } = statusMeta(order.status)
                return (
                  <tr key={order.id} className="hover:bg-dark-bg/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold">{order.id}</td>
                    <td className="px-6 py-4 text-slate-300">
                      <div className="font-semibold">{order.customer}</div>
                      <div className="text-xs text-primary font-mono mt-0.5">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{order.items}</td>
                    <td className="px-6 py-4 font-bold">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{order.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${color}`}>
                        <Icon className="w-4 h-4" />{label}
                      </span>
                    </td>
                    {/* Txn Auth column */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">
                        <Lock className="w-3 h-3" /> Required
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => openOrder(rawOrders.find(o => o.id === order.id))}
                      >
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <div className="text-slate-400 font-medium">No orders yet</div>
                    <div className="text-xs text-slate-500 mt-1">Orders will appear here when customers make purchases.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Order Detail Modal ── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              key={selectedOrder.id}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22 }}
              className="glass-card w-full max-w-2xl p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[92vh] space-y-6"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold font-mono">{selectedOrder.id}</h3>
                  <p className="text-slate-400 text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-dark-bg rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Current status */}
              {(() => {
                const { label, color, icon: Icon } = statusMeta(selectedOrder.status)
                return (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1.5 ${color}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </span>
                )
              })()}


              {/* Shipping & Payment */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-dark-bg rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <MapPin className="w-3.5 h-3.5" /> Shipping To
                  </div>
                  <div className="font-semibold">{selectedOrder.shippingAddress?.name}</div>
                  <div className="text-sm text-primary font-mono font-medium mt-0.5">{getOrderCustomerEmail(selectedOrder)}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.city} {selectedOrder.shippingAddress?.zip}
                  </div>
                </div>
                <div className="bg-dark-bg rounded-xl p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                    <CreditCard className="w-3.5 h-3.5" /> Payment
                  </div>
                  <div className="font-semibold">{selectedOrder.paymentMethod}</div>
                  {selectedOrder.txHash && (
                    <div className="text-xs text-slate-500 font-mono mt-1 truncate">Tx: {selectedOrder.txHash}</div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-400 uppercase">Items (yours)</h4>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-dark-bg rounded-xl p-3">
                    {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.category}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold">${item.price.toFixed(2)} × {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              {(() => {
                const bd = orderPricingBreakdown(selectedOrder)
                return (
                  <div className="border-t border-dark-border pt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Storeroom price</span>
                      <span className="font-bold text-slate-200">${bd.storeroomPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Seller profit ({bd.profitPctLabel})</span>
                      <span className="font-bold text-green-500">+${bd.sellerProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-dark-border mt-2">
                      <span className="text-white text-lg font-bold">Total price</span>
                      <span className="text-primary text-2xl font-bold">${bd.totalPrice.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Reflects only your items in this order — other sellers' items (if any) aren't included.
                    </p>
                  </div>
                )
              })()}

              {/* ═══════════════════════════════════════════════════════════
                  ORDER ACTIONS & TRANSACTION PASSWORD (MOVED TO BOTTOM)
              ═════════════════════════════════════════════════════════════*/}
              {(() => {
                const options = nextStatusOptions(selectedOrder.status)
                if (!options.length) return null // no actions available
                
                return (
                  <div className="mt-6 pt-6 border-t border-dark-border">
                    <div>
                      {!txnVerified ? (
                        <TxnPasswordPrompt
                          onVerified={() => setTxnVerified(true)}
                          isVerifying={isVerifying}
                          setIsVerifying={setIsVerifying}
                          onCancel={closeModal}
                        />
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl mb-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              <span className="text-sm font-bold text-emerald-300">Identity Verified — Actions Unlocked</span>
                            </div>
                            <button
                              onClick={() => setTxnVerified(false)}
                              className="text-xs text-slate-400 hover:text-white border border-dark-border rounded-lg px-2.5 py-1 transition-colors"
                            >
                              Re-lock
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                            {options.map(opt => (
                              <Button
                                key={opt}
                                disabled={updatingStatus}
                                isLoading={updatingStatus}
                                onClick={() => handleUpdateStatus(selectedOrder.id, opt)}
                                className={
                                  opt === 'Confirmed' ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' :
                                  opt === 'Cancelled' ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : ''
                                }
                                variant={opt === 'Confirmed' ? 'primary' : opt === 'Cancelled' ? 'outline' : 'secondary'}
                              >
                                {opt === 'Confirmed' ? '✓ Place / Confirm Order' : `Mark ${statusMeta(opt).label}`}
                              </Button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )
              })()}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
