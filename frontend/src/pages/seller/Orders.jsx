import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Filter, Search, Eye, ShoppingBag, X, MapPin, CreditCard } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import useOrderStore, { getOrderCustomerEmail } from '../../store/useOrderStore'
import usePlatformStore from '../../store/usePlatformStore'
import { ORDER_FLOW, statusMeta } from '../../utils/orderStatus'
import toast from 'react-hot-toast'

const ALL_STATUSES = [...ORDER_FLOW, 'Cancelled']
const PROFIT_RATES = { Silver: '17%', Gold: '25%', Platinum: '35%' }

const getSellerProfitPct = (order) => {
  if (!order) return '17%'
  if (order.subtotal > 0 && order.tax > 0) {
    const calcPct = Math.round((order.tax / order.subtotal) * 100)
    if (calcPct === 17 || calcPct === 25 || calcPct === 35) return `${calcPct}%`
  }
  const sellerSubscriptions = usePlatformStore.getState()?.sellerSubscriptions || {}
  const currentUserEmail = () => {
    try {
      return JSON.parse(localStorage.getItem('auth-storage-v3') || '{}')?.state?.user?.email || 'me'
    } catch { return 'me' }
  }
  const email = currentUserEmail()
  const sub = sellerSubscriptions[email] || sellerSubscriptions['me']
  const pkgName = sub?.name || sub?.packageName
  return PROFIT_RATES[pkgName] || '17%'
}

const getOrderPricingBreakdown = (order) => {
  if (!order) return { profitPctLabel: '17%', storeroomPrice: 0, sellerProfit: 0, totalPrice: 0 }
  const profitPctLabel = getSellerProfitPct(order)
  const profitRate = parseFloat(profitPctLabel) / 100
  const total = order.total || 0
  let storeroomPrice = 0
  let sellerProfit = 0

  if (order.subtotal > 0 && order.tax > 0 && order.subtotal !== order.total) {
    storeroomPrice = order.subtotal
    sellerProfit = order.tax
  } else {
    storeroomPrice = Math.round((total / (1 + profitRate)) * 100) / 100
    sellerProfit = Math.round((total - storeroomPrice) * 100) / 100
  }

  return { profitPctLabel, storeroomPrice, sellerProfit, totalPrice: total }
}

export default function SellerOrders() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const rawOrders = useOrderStore(state => state.orders)
  const fetchSellerOrders = useOrderStore(state => state.fetchSellerOrders)

  useEffect(() => {
    fetchSellerOrders()
    const interval = setInterval(fetchSellerOrders, 10000)
    window.addEventListener('focus', fetchSellerOrders)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', fetchSellerOrders)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const orders = rawOrders.map(o => ({
    id: o.id,
    customer: o.shippingAddress?.name || 'Unknown',
    customerEmail: getOrderCustomerEmail(o),
    items: o.items ? o.items.reduce((sum, i) => sum + i.quantity, 0) : 0,
    total: o.total,
    date: new Date(o.createdAt).toLocaleDateString(),
    status: o.status,
    rawOrder: o
  }))

  const filteredOrders = orders
    .filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(order => statusFilter === 'All' || order.status === statusFilter)

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
        <p className="text-slate-400">Track and fulfill customer orders.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search by Order ID or Customer..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredOrders.map((order) => {
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
                        <Icon className="w-4 h-4" />
                        {label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSelectedOrder(rawOrders.find(o => o.id === order.id))}
                      >
                        <Eye className="w-4 h-4" /> View
                      </Button>
                    </td>
                  </tr>
                )
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-16">
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

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-2xl p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold font-mono">{selectedOrder.id}</h3>
                <p className="text-slate-400 text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-dark-bg rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const { label, color, icon: Icon } = statusMeta(selectedOrder.status)
              return (
                <div className="flex items-center gap-3 mb-6">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${color}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </span>
                </div>
              )
            })()}

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
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
                {selectedOrder.txHash && <div className="text-xs text-slate-500 font-mono mt-1 truncate">Tx: {selectedOrder.txHash}</div>}
              </div>
            </div>

            <div className="space-y-3 mb-6">
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

            {(() => {
              const breakdown = getOrderPricingBreakdown(selectedOrder)
              return (
                <div className="border-t border-dark-border pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Storeroom price</span>
                    <span className="font-bold text-slate-200">${breakdown.storeroomPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Seller profit ({breakdown.profitPctLabel})</span>
                    <span className="font-bold text-green-500">+${breakdown.sellerProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-dark-border mt-2">
                    <span className="text-white text-lg font-bold">Total price</span>
                    <span className="text-primary text-2xl font-bold">${breakdown.totalPrice.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reflects only your items in this order — other sellers' items (if any) aren't included.
                  </p>
                </div>
              )
            })()}
          </motion.div>
        </div>
      )}
    </div>
  )
}
