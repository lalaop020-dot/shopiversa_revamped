import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Eye, ShoppingBag, RefreshCw, X, MapPin, CreditCard, ArrowRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import useOrderStore from '../../store/useOrderStore'
import { ORDER_FLOW, statusMeta, nextStatusOptions } from '../../utils/orderStatus'

const FILTERS = ['All', ...ORDER_FLOW, 'Cancelled']

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const orders = useOrderStore(state => state.adminOrders)
  const fetchAdminOrders = useOrderStore(state => state.fetchAdminOrders)

  const load = async () => {
    setLoading(true)
    await fetchAdminOrders(filter === 'All' ? undefined : filter)
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId)
    try {
      const updated = await useOrderStore.getState().updateOrderStatus(orderId, newStatus)
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          ...updated,
          customerEmail: prev?.customerEmail,
          items: prev?.items?.map((item, i) => ({
            ...item,
            ...(updated.items?.[i] || {}),
            sellerName: item.sellerName,
            sellerEmail: item.sellerEmail,
          })) || updated.items
        }))
      }
      toast.success(`Order #${orderId} marked as ${statusMeta(newStatus).label}`)
      await load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update order status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.shippingAddress?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.customerEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sellersOf = (order) => {
    const names = [...new Set(order.items.map(i => i.sellerName || i.sellerEmail).filter(Boolean))]
    return names.length ? names.join(', ') : 'Unknown'
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Orders Management</h1>
          <p className="text-slate-400">All customer orders across every seller on the platform.</p>
        </div>
        <Button variant="outline" onClick={load} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Input
            placeholder="Search by Order ID, customer name or email..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === f ? 'bg-primary text-white' : 'bg-dark-card text-slate-400 hover:text-white'
              }`}
            >
              {f === 'All' ? 'All' : statusMeta(f).label}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Order ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Seller(s)</th>
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
                const nextOpt = nextStatusOptions(order.status)[0]
                return (
                  <tr key={order.id} className="hover:bg-dark-bg/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold">{order.id}</td>
                    <td className="px-6 py-4 text-slate-300">
                      <div>{order.shippingAddress?.name || 'Unknown'}</div>
                      {order.customerEmail && <div className="text-xs text-slate-500">{order.customerEmail}</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm max-w-[200px] truncate" title={sellersOf(order)}>{sellersOf(order)}</td>
                    <td className="px-6 py-4 text-slate-400">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="px-6 py-4 font-bold">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 w-fit ${color}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'Processing' && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            isLoading={updatingOrderId === order.id}
                            onClick={() => handleStatusChange(order.id, 'Confirmed')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Place / Confirm Order
                          </Button>
                        )}
                        {order.status !== 'Processing' && nextOpt && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            isLoading={updatingOrderId === order.id}
                            onClick={() => handleStatusChange(order.id, nextOpt)}
                          >
                            Mark {statusMeta(nextOpt).label}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedOrder(order)}>
                          <Eye className="w-4 h-4" /> View
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <div className="text-slate-400 font-medium">No orders found</div>
                    <div className="text-xs text-slate-500 mt-1">Orders will appear here once customers start purchasing.</div>
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
              const options = nextStatusOptions(selectedOrder.status)
              return (
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-dark-bg/60 p-4 rounded-xl border border-dark-border">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 ${color}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </span>
                  {options.length > 0 && (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <div className="flex flex-wrap gap-2 items-center">
                        {options.map(opt => (
                          <Button
                            key={opt}
                            size="sm"
                            variant={opt === 'Confirmed' ? 'primary' : opt === 'Cancelled' ? 'outline' : 'secondary'}
                            className={
                              opt === 'Confirmed'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4'
                                : opt === 'Cancelled'
                                ? 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                : ''
                            }
                            isLoading={updatingOrderId === selectedOrder.id}
                            onClick={() => handleStatusChange(selectedOrder.id, opt)}
                          >
                            {opt === 'Confirmed' ? '✓ Place / Confirm Order' : `Mark ${statusMeta(opt).label}`}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                  {options.length === 0 && (
                    <span className="text-xs text-slate-500">This order has reached its final state.</span>
                  )}
                </div>
              )
            })()}

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-bg rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Shipping To
                </div>
                <div className="font-semibold">{selectedOrder.shippingAddress?.name}</div>
                {selectedOrder.customerEmail && <div className="text-sm text-slate-400">{selectedOrder.customerEmail}</div>}
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
              <h4 className="font-bold text-sm text-slate-400 uppercase">Items</h4>
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-dark-bg rounded-xl p-3">
                  {item.image && <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-xs text-slate-500">Sold by {item.sellerName || item.sellerEmail || 'Unknown'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">${item.price.toFixed(2)} × {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dark-border pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${selectedOrder.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Tax</span><span>${selectedOrder.tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Shipping</span><span>${selectedOrder.shipping.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-dark-border mt-2">
                <span>Total</span><span>${selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
