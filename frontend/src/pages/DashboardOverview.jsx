import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react'
import useAuthStore from '../store/useAuthStore'
import usePlatformStore, { DEFAULT_BALANCE, DEFAULT_SUBSCRIPTION } from '../store/usePlatformStore'
import { useProductStore } from '../store/useProductStore'
import useOrderStore from '../store/useOrderStore'
import { PROFIT_RATES, normalizePackageName } from '../utils/packages'


export default function DashboardOverview({ role }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const email = user?.email || 'seller@demo.com'

  const balances = usePlatformStore((state) => state.balances[email] || DEFAULT_BALANCE)
  const transactions = usePlatformStore((state) => state.transactions) || []
  const packageRequests = usePlatformStore((state) => state.packageRequests) || []
  const adminDashboardStats = usePlatformStore((state) => state.adminDashboardStats)
  const sellerStatsData = usePlatformStore((state) => state.sellerStats)
  const orders = useOrderStore((state) => state.orders) || []
  const sub = usePlatformStore((state) => state.sellerSubscriptions[email] || DEFAULT_SUBSCRIPTION)

  const storeroomProducts = useProductStore((state) => state.storeroomProducts) || []
  const sellerProducts = useProductStore((state) => state.sellerProducts) || {}
  const sellerProductsMeta = useProductStore((state) => state.sellerProductsMeta[email])
  const sellerImportedIds = useProductStore((state) => state.sellerImportedIds[email]) || []
  const categories = useProductStore((state) => state.categories) || []

  const activeProfitRate = PROFIT_RATES[normalizePackageName(sub.name)] || '17%'

  useEffect(() => {
    const refreshData = () => {
      if (role === 'admin') {
        usePlatformStore.getState().fetchAdminTransactions()
        usePlatformStore.getState().fetchAdminPackageRequests()
        usePlatformStore.getState().fetchAdminDashboardStats()
        useProductStore.getState().fetchStoreroomProducts()
        useOrderStore.getState().fetchAdminOrders()
      } else {
        usePlatformStore.getState().fetchBalance()
        usePlatformStore.getState().fetchTransactions()
        usePlatformStore.getState().fetchPackageRequests()
        usePlatformStore.getState().fetchCurrentPackage()
        usePlatformStore.getState().fetchSellerDashboardStats()
        useProductStore.getState().fetchSellerProducts(email)
        useProductStore.getState().fetchSellerImportedIds(email)
        useOrderStore.getState().fetchSellerOrders()
      }
    }

    refreshData()
    const interval = setInterval(refreshData, 10000)
    window.addEventListener('focus', refreshData)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', refreshData)
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
  const totalPlatformStock = adminDashboardStats?.totalStock ?? 0
  const totalCategories = adminDashboardStats?.categories ?? categories.length

  // Pending approvals — must include pending seller shop applications
  // (from /admin/dashboard/stats), not just tx/package requests, otherwise
  // this reads 0 even when a shop is genuinely awaiting approval.
  const pendingSellerApprovals = adminDashboardStats?.pendingApprovals ?? 0
  const pendingTransactions = transactions.filter(t => t.status === 'Pending').length
  const pendingPackages = packageRequests.filter(r => r.status === 'Pending').length
  const totalPendingApprovals = pendingSellerApprovals + pendingTransactions + pendingPackages

  // Seller-specific stats: whole-store totals from the server. (Summing the
  // products loaded in the browser only covered the first page.)
  const myProducts = sellerProducts[email] || []
  const myTotalProductCount = sellerStatsData?.totalProducts ?? sellerProductsMeta?.total ?? (sellerImportedIds.length > 0 ? sellerImportedIds.length : myProducts.length)
  const myTotalSales = sellerStatsData?.totalSales ?? myProducts.reduce((sum, p) => sum + (p.sales || 0), 0)
  const myStockAlerts = sellerStatsData?.lowStock ?? myProducts.filter(p => p.stock <= 5).length
  const myActiveProducts = sellerStatsData?.activeProducts ?? myTotalProductCount
  // Monthly revenue for the last 12 months.
  //  - Admin:  approved deposits (platform revenue, same basis as the Total Revenue card)
  //  - Seller: their actual sales (order totals, cancelled orders excluded).
  //    This used to add up approved deposits AND withdrawals, which isn't revenue.
  const chartRawValues = useMemo(() => {
    const months = Array(12).fill(0)
    const now = new Date()
    const entries = role === 'admin'
      ? transactions
          .filter(tx => tx.type === 'Deposit' && tx.status === 'Approved')
          .map(tx => ({ date: tx.date, amount: tx.amount }))
      : orders
          .filter(o => o.status !== 'Cancelled')
          .map(o => ({ date: o.createdAt, amount: o.total }))

    entries.forEach(({ date, amount }) => {
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return
      const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
      if (monthDiff >= 0 && monthDiff < 12) months[11 - monthDiff] += Number(amount) || 0
    })
    return months
  }, [transactions, orders, role])

  // Bar heights as a percentage of the largest month (min 5% when there is any value)
  const chartData = useMemo(() => {
    const maxVal = Math.max(...chartRawValues, 1)
    return chartRawValues.map(v => v === 0 ? 0 : Math.max(5, Math.round((v / maxVal) * 100)))
  }, [chartRawValues])

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
      change: `${totalCategories} categories`,
      trend: totalPlatformProducts > 0 ? 'up' : 'neutral',
      icon: Package,
      color: 'text-primary',
      subtitle: `${totalPlatformStock.toLocaleString()} total stock`,
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
      subtitle: `$${(sellerStatsData?.totalEarned ?? 0).toFixed(2)} earned · $${balances.totalWithdrawn.toFixed(2)} withdrawn`,
      route: '/seller/wallet',
    },
    {
      label: 'My Products',
      value: myTotalProductCount.toString(),
      change: `${myActiveProducts} active`,
      trend: myTotalProductCount > 0 ? 'up' : 'neutral',
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
      subtitle: `Across ${myTotalProductCount} products`,
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
      {role === 'seller' && (
        <div className="p-4 bg-primary/10 border border-primary/25 rounded-2xl flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span>Active Package:</span>
              <span className="text-primary bg-primary/20 px-2.5 py-0.5 rounded-full text-sm font-extrabold">{sub.name}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Your store currently earns a <strong className="text-green-400 font-bold">{activeProfitRate} Profit Margin</strong> based on your {sub.name} plan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/seller/packages')}>
            View / Upgrade Plan
          </Button>
        </div>
      )}

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
               <p className="text-xs text-slate-500 mt-1">Monthly breakdown from {role === 'admin' ? 'all approved deposits' : 'your orders'}</p>
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

