import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import usePlatformStore, { DEFAULT_BALANCE } from '../store/usePlatformStore'
import { useProductStore } from '../store/useProductStore'

export default function DashboardOverview({ role }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const email = user?.email || 'seller@demo.com'

  const balances = usePlatformStore((state) => state.balances[email] || DEFAULT_BALANCE)
  const transactions = usePlatformStore((state) => state.transactions) || []
  const packageRequests = usePlatformStore((state) => state.packageRequests) || []
  const adminDashboardStats = usePlatformStore((state) => state.adminDashboardStats)

  const storeroomProducts = useProductStore((state) => state.storeroomProducts) || []
  const sellerProducts = useProductStore((state) => state.sellerProducts) || {}
  const categories = useProductStore((state) => state.categories) || []

  useEffect(() => {
    if (role === 'admin') {
      usePlatformStore.getState().fetchAdminTransactions()
      usePlatformStore.getState().fetchAdminPackageRequests()
      usePlatformStore.getState().fetchAdminDashboardStats()
      useProductStore.getState().fetchStoreroomProducts()
    } else {
      usePlatformStore.getState().fetchBalance()
      usePlatformStore.getState().fetchTransactions()
      usePlatformStore.getState().fetchPackageRequests()
      useProductStore.getState().fetchSellerProducts(email)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, email])

  // ── Compute REAL analytics from store data ──

  // Admin-only aggregates: sourced from /admin/dashboard/stats since they need
  // real cross-seller totals that no locally-cached store slice can provide.
  const totalPlatformRevenue = adminDashboardStats?.revenue ?? 0
  const totalActiveSellers = adminDashboardStats?.totalSellers ?? 0
  const totalPlatformOrders = adminDashboardStats?.totalOrders ?? 0
  const totalPlatformProducts = adminDashboardStats?.products ?? storeroomProducts.length

  // Pending approvals — must include pending seller shop applications
  // (from /admin/dashboard/stats), not just tx/package requests, otherwise
  // this reads 0 even when a shop is genuinely awaiting approval.
  const pendingSellerApprovals = adminDashboardStats?.pendingApprovals ?? 0
  const pendingTransactions = transactions.filter(t => t.status === 'Pending').length
  const pendingPackages = packageRequests.filter(r => r.status === 'Pending').length
  const totalPendingApprovals = pendingSellerApprovals + pendingTransactions + pendingPackages

  // Seller-specific stats
  const myProducts = sellerProducts[email] || []
  const myTotalSales = myProducts.reduce((sum, p) => sum + (p.sales || 0), 0)
  const myStockAlerts = myProducts.filter(p => p.stock <= 5).length
  const myActiveProducts = myProducts.filter(p => p.status === 'Active').length

  // Seller revenue (total earnings = balance + totalWithdrawn)
  const myTotalRevenue = balances.balance + balances.totalWithdrawn

  // Build chart data from real transaction history (last 12 months)
  const chartData = useMemo(() => {
    const months = Array(12).fill(0)
    const now = new Date()

    if (role === 'admin') {
      // Admin: aggregate all approved deposits by month
      transactions.forEach(tx => {
        if (tx.type === 'Deposit' && tx.status === 'Approved') {
          const txDate = new Date(tx.date)
          const monthDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth())
          if (monthDiff >= 0 && monthDiff < 12) {
            months[11 - monthDiff] += tx.amount
          }
        }
      })
    } else {
      // Seller: use their transactions
      transactions.filter(tx => tx.sellerEmail === email).forEach(tx => {
        if (tx.status === 'Approved') {
          const txDate = new Date(tx.date)
          const monthDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth())
          if (monthDiff >= 0 && monthDiff < 12) {
            months[11 - monthDiff] += tx.amount
          }
        }
      })
    }

    // Normalize to percentage heights (0-100), with minimum bar height of 5 if any value exists
    const maxVal = Math.max(...months, 1)
    return months.map(v => v === 0 ? 0 : Math.max(5, Math.round((v / maxVal) * 100)))
  }, [transactions, role, email])

  // Chart raw values for tooltips
  const chartRawValues = useMemo(() => {
    const months = Array(12).fill(0)
    const now = new Date()
    const relevantTxs = role === 'admin'
      ? transactions.filter(tx => tx.type === 'Deposit' && tx.status === 'Approved')
      : transactions.filter(tx => tx.sellerEmail === email && tx.status === 'Approved')

    relevantTxs.forEach(tx => {
      const txDate = new Date(tx.date)
      const monthDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth())
      if (monthDiff >= 0 && monthDiff < 12) {
        months[11 - monthDiff] += tx.amount
      }
    })
    return months
  }, [transactions, role, email])

  // Month labels
  const monthLabels = useMemo(() => {
    const now = new Date()
    const labels = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(d.toLocaleString('default', { month: 'short' }))
    }
    return labels
  }, [])

  // Build live activity list from real data
  const activities = useMemo(() => {
    const list = []
    
    // Recent transactions
    transactions.slice(0, 3).forEach(tx => {
      list.push({
        text: `${tx.type} of $${tx.amount.toFixed(2)} — ${tx.status.toLowerCase()} (${tx.sellerEmail})`,
        time: tx.date,
        type: tx.type.toLowerCase(),
        statusColor: tx.status === 'Approved' ? 'bg-green-500' : tx.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
      })
    })

    // Package requests
    packageRequests.slice(0, 2).forEach(req => {
      list.push({
        text: `${req.packageName} upgrade — ${req.status.toLowerCase()} (${req.sellerEmail})`,
        time: req.date,
        type: 'package',
        statusColor: req.status === 'Approved' ? 'bg-green-500' : req.status === 'Pending' ? 'bg-yellow-500' : 'bg-red-500'
      })
    })

    // Stock alerts from products
    if (role === 'admin') {
      const lowStockProducts = storeroomProducts.filter(p => p.stock <= 5)
      lowStockProducts.slice(0, 2).forEach(p => {
        list.push({
          text: `⚠️ "${p.name}" has only ${p.stock} units left`,
          time: 'Stock Alert',
          type: 'alert',
          statusColor: 'bg-orange-500'
        })
      })
    } else {
      myProducts.filter(p => p.stock <= 5).slice(0, 2).forEach(p => {
        list.push({
          text: `⚠️ "${p.name}" has only ${p.stock} units left`,
          time: 'Stock Alert',
          type: 'alert',
          statusColor: 'bg-orange-500'
        })
      })
    }

    if (list.length === 0) {
      list.push({
        text: 'No recent activity. Start by adding products or processing transactions.',
        time: 'Now',
        type: 'info',
        statusColor: 'bg-slate-500'
      })
    }

    return list.slice(0, 6)
  }, [transactions, packageRequests, storeroomProducts, myProducts, role])

  // ── Build stat cards from REAL data ──

  const adminStats = [
    {
      label: 'Total Revenue',
      value: `$${totalPlatformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: totalPlatformRevenue > 0 ? `$${totalPlatformRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0',
      trend: totalPlatformRevenue > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: 'text-green-500',
      subtitle: 'From approved deposits',
      route: '/admin/transactions',
    },
    {
      label: 'Total Products',
      value: totalPlatformProducts.toString(),
      change: `${categories.length} categories`,
      trend: totalPlatformProducts > 0 ? 'up' : 'neutral',
      icon: Package,
      color: 'text-primary',
      subtitle: `${storeroomProducts.reduce((s, p) => s + p.stock, 0)} total stock`,
      route: '/admin/storeroom',
    },
    {
      label: 'Total Orders',
      value: totalPlatformOrders.toString(),
      change: `${totalActiveSellers} seller${totalActiveSellers !== 1 ? 's' : ''}`,
      trend: totalPlatformOrders > 0 ? 'up' : 'neutral',
      icon: ShoppingCart,
      color: 'text-accent-gold',
      subtitle: 'Combined seller sales',
    },
    {
      label: 'Pending Approvals',
      value: totalPendingApprovals.toString(),
      change: totalPendingApprovals > 0 ? 'Action Required' : 'All Clear',
      trend: totalPendingApprovals > 0 ? 'alert' : 'neutral',
      icon: AlertCircle,
      color: totalPendingApprovals > 0 ? 'text-red-500' : 'text-green-500',
      subtitle: `${pendingSellerApprovals} shops · ${pendingTransactions} tx · ${pendingPackages} pkg`,
      route: '/admin/shops',
    },
  ]

  const sellerStats = [
    {
      label: 'My Balance',
      value: `$${balances.balance.toFixed(2)}`,
      change: `$${balances.withdrawable.toFixed(2)} available`,
      trend: balances.balance > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: 'text-green-500',
      subtitle: `$${balances.totalWithdrawn.toFixed(2)} withdrawn`,
      route: '/seller/wallet',
    },
    {
      label: 'My Products',
      value: myProducts.length.toString(),
      change: `${myActiveProducts} active`,
      trend: myProducts.length > 0 ? 'up' : 'neutral',
      icon: Package,
      color: 'text-primary',
      subtitle: `${myTotalSales} total sales`,
      route: '/seller/products',
    },
    {
      label: 'Total Sales',
      value: myTotalSales.toString(),
      change: myTotalSales > 0 ? 'Generating revenue' : 'No sales yet',
      trend: myTotalSales > 0 ? 'up' : 'neutral',
      icon: ShoppingCart,
      color: 'text-accent-gold',
      subtitle: `Across ${myProducts.length} products`,
      route: '/seller/orders',
    },
    {
      label: 'Stock Alerts',
      value: myStockAlerts.toString(),
      change: myStockAlerts > 0 ? 'Low stock!' : 'All stocked',
      trend: myStockAlerts > 0 ? 'alert' : 'neutral',
      icon: AlertCircle,
      color: myStockAlerts > 0 ? 'text-red-500' : 'text-green-500',
      subtitle: myStockAlerts > 0 ? 'Products need restocking' : 'Inventory healthy',
      route: '/seller/products',
    },
  ]

  const stats = role === 'admin' ? adminStats : sellerStats

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card
            key={i}
            onClick={stat.route ? () => navigate(stat.route) : undefined}
            role={stat.route ? 'button' : undefined}
            tabIndex={stat.route ? 0 : undefined}
            onKeyDown={stat.route ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(stat.route) } } : undefined}
            className={`flex flex-col gap-4 ${stat.route ? 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:border-primary/50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl bg-dark-bg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'text-green-500 bg-green-500/10' :
                stat.trend === 'alert' ? 'text-red-500 bg-red-500/10' :
                'text-slate-400 bg-slate-500/10'
              }`}>
                {stat.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {stat.trend === 'alert' && <AlertCircle className="w-3 h-3" />}
                {stat.trend === 'neutral' && <BarChart3 className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-[10px] text-slate-500 mt-1">{stat.subtitle}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 min-h-[400px] flex flex-col justify-between">
           <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="font-bold text-lg">{role === 'admin' ? 'Platform Revenue' : 'My Revenue'}</h3>
               <p className="text-xs text-slate-500 mt-1">Monthly breakdown from {role === 'admin' ? 'all approved deposits' : 'your transactions'}</p>
             </div>
             <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-3 h-3 bg-primary rounded-full" /> Revenue
                </div>
                <span className="text-[10px] text-slate-400 bg-dark-bg px-2 py-0.5 rounded ml-2 font-medium">
                  12 MONTHS
                </span>
             </div>
           </div>
           {/* Chart Area */}
           <div className="flex-grow flex items-end gap-2 px-4 pb-4 h-48">
              {chartData.map((h, i) => (
                <div 
                  key={i} 
                  style={{ height: `${Math.max(h, 2)}%` }} 
                  className={`flex-grow rounded-t-sm transition-all duration-500 group relative cursor-pointer ${
                    h > 0 ? 'bg-primary/30 hover:bg-primary' : 'bg-dark-border/30'
                  }`}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-dark-card border border-dark-border px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-lg">
                    <div className="font-bold">${chartRawValues[i].toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-slate-500">{monthLabels[i]}</div>
                  </div>
                </div>
              ))}
           </div>
           <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-widest pt-4 border-t border-dark-border">
              {monthLabels.filter((_, i) => i % 3 === 0 || i === 11).map((label, i) => (
                <span key={i}>{label}</span>
              ))}
           </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Recent Activity</h3>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-4">
            {activities.map((activity, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 shadow-lg ${activity.statusColor}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-300 leading-snug">{activity.text}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="border-t border-dark-border pt-4 grid grid-cols-2 gap-3">
            <div className="bg-dark-bg rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Transactions</div>
              <div className="text-lg font-bold">{transactions.length}</div>
            </div>
            <div className="bg-dark-bg rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Pending</div>
              <div className={`text-lg font-bold ${totalPendingApprovals > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                {totalPendingApprovals}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

