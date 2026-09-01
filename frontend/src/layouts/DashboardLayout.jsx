import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Wallet, 
  MessageSquare, 
  Settings, 
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Award,
  Store,
  Bell,
  Landmark
} from 'lucide-react'
import { Button } from '../components/common/Button'
import useAuthStore from '../store/useAuthStore'
import useNotificationStore from '../store/useNotificationStore'
import useChatStore from '../store/useChatStore'
import { ChatWindow } from '../components/ChatWindow'
import { NotificationCenter } from '../components/NotificationCenter'

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [supportContact, setSupportContact] = useState(null)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const fetchConversations = useChatStore((state) => state.fetchConversations)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const openSupportChat = async () => {
    const convs = await fetchConversations()
    const admin = convs.find((c) => c.role === 'admin') || convs[0] || null
    setSupportContact(admin)
    setIsChatOpen(true)
  }

  // Close the mobile drawer whenever the route changes (e.g. after clicking a nav link)
  useEffect(() => {
    setIsMobileSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sellerMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `/seller/dashboard` },
    { icon: Package, label: 'My Products', path: `/seller/products` },
    { icon: Store, label: 'Storehouse', path: `/seller/storehouse` },
    { icon: ShoppingCart, label: 'Orders', path: `/seller/orders` },
    { icon: Wallet, label: 'Wallet', path: `/seller/wallet` },
    { icon: Award, label: 'Packages', path: `/seller/packages` },
    { icon: MessageSquare, label: 'Support', path: `/seller/support` },
    { icon: Settings, label: 'Settings', path: `/seller/settings` },
  ]

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `/admin/dashboard` },
    { icon: ShoppingCart, label: 'Orders', path: `/admin/orders` },
    { icon: Package, label: 'Storeroom Control', path: `/admin/storeroom` },
    { icon: Store, label: 'Shop Approvals', path: `/admin/shops` },
    { icon: Wallet, label: 'Transactions', path: `/admin/transactions` },
    { icon: Landmark, label: 'Bank Withdrawal', path: '/admin/withdrawal' },
    { icon: Award, label: 'Packages', path: `/admin/packages` },
    { icon: MessageSquare, label: 'Support', path: `/admin/support` },
    { icon: Settings, label: 'Settings', path: `/admin/settings` },
  ]

  const menuItems = role === 'admin' ? adminMenuItems : sellerMenuItems

  return (
    <div className="flex min-h-screen bg-dark-bg">
      {/* Mobile backdrop — dismisses the off-canvas sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — off-canvas drawer below lg, fixed collapsible rail at lg+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark-card border-r border-dark-border transition-all duration-300
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 flex items-center justify-between">
            {(isSidebarOpen || isMobileSidebarOpen) && (
              <span className="text-xl font-bold text-primary">{role === 'admin' ? 'ADMIN' : 'SELLER'}</span>
            )}
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:block p-2 hover:bg-dark-bg rounded-lg transition-all"
            >
              {isSidebarOpen ? <ChevronLeft /> : <Menu />}
            </button>
            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-dark-bg rounded-lg transition-all"
            >
              <X />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-slate-400 hover:bg-dark-bg hover:text-white'
                  }`}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  {(isSidebarOpen || isMobileSidebarOpen) && <span className="font-medium">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-dark-border">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 p-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-6 h-6 flex-shrink-0" />
              {(isSidebarOpen || isMobileSidebarOpen) && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-grow min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <header className="sticky top-0 z-30 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-dark-card rounded-lg transition-all shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold capitalize truncate">{location.pathname.split('/').pop() || 'Dashboard'}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 hover:bg-dark-card rounded-full transition-all text-slate-400 hover:text-white ${isNotifOpen ? 'bg-dark-card text-white' : ''}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-dark-bg" />
                )}
              </button>
              <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold">{user?.name || 'Demo User'}</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest">{role}</div>
            </div>
            <div className="w-10 h-10 bg-primary/20 text-primary rounded-full border border-dark-border flex items-center justify-center font-bold shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Floating Chat Toggle */}
      {role !== 'admin' && !isChatOpen && (
        <button
          onClick={openSupportChat}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 group"
        >
          <MessageSquare className="w-6 h-6" />

          <div className="absolute right-16 bg-dark-card border border-dark-border px-4 py-2 rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need help? Chat with us
          </div>
        </button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isChatOpen && supportContact && (
          <ChatWindow
            recipientEmail={supportContact.email}
            recipientName={supportContact.name || 'Support'}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
