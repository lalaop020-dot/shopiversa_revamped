import { useState, useEffect } from 'react'
import { ShoppingCart, User, Search, Menu, X, Bell, Home, ShoppingBag, Store } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../common/Button'
import { NotificationCenter } from '../NotificationCenter'
import useAuthStore from '../../store/useAuthStore'
import useCartStore from '../../store/useCartStore'
import useNotificationStore from '../../store/useNotificationStore'

export function Navbar() {
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const { isAuthenticated, role, user, logout } = useAuthStore()
  const cartItemCount = useCartStore((state) => state.getItemCount())
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications)
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) fetchNotifications()
  }, [isAuthenticated, fetchNotifications])

  const handleLogout = () => {
    logout()
    setIsDropdownOpen(false)
    setIsMobileMenuOpen(false)
    navigate('/login', { replace: true })
  }

  const handleSearch = () => {
    const q = searchInput.trim()
    setIsMobileMenuOpen(false)
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
  }

  return (
    <nav className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden md:block">
            SHOPI<span className="text-primary">VERSA</span>
          </span>
        </Link>

        {/* Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-8 relative">
          <input
            type="text"
            placeholder="Search products, brands and categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            className="w-full bg-dark-card border border-dark-border rounded-full py-2 px-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Button className="absolute right-1 top-1 h-8 rounded-full" size="sm" onClick={handleSearch}>Search</Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link to="/cart" className="relative p-2 hover:bg-dark-card rounded-full transition-all">
            <ShoppingCart className="w-6 h-6" />
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </Link>
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`p-2 hover:bg-dark-card rounded-full transition-all ${isNotifOpen ? 'bg-dark-card' : ''}`}
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-dark-bg" />
                )}
              </button>
              <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>
          )}

          {isAuthenticated ? (
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 hover:bg-dark-card p-2 rounded-lg transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
                <span className="hidden md:block font-medium max-w-[100px] truncate">{user?.name || 'User'}</span>
              </button>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-xl shadow-2xl p-2 z-50 animate-fade-in">
                    {role === 'customer' ? (
                      <Link 
                        to="/profile" 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 hover:bg-dark-bg rounded-lg text-sm transition-all"
                      >
                        My Profile
                      </Link>
                    ) : (
                      <Link 
                        to={`/${role}/dashboard`} 
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-4 py-2 hover:bg-dark-bg rounded-lg text-sm transition-all"
                      >
                        Dashboard
                      </Link>
                    )}
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-all mt-1"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-2 hover:bg-dark-card p-2 rounded-lg transition-all">
              <User className="w-6 h-6" />
              <span className="hidden md:block font-medium">Account</span>
            </Link>
          )}

          <Link to="/seller-register" className="hidden xl:block">
            <Button variant="outline" size="sm">Become a Seller</Button>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-dark-card rounded-full transition-all"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — search + nav links that are hidden off-canvas above lg */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-dark-border bg-dark-bg px-4 py-4 space-y-4 animate-fade-in">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products, brands and categories..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              className="w-full bg-dark-card border border-dark-border rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-card transition-all"
            >
              <Home className="w-5 h-5 text-slate-400" /> Home
            </Link>
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-card transition-all"
            >
              <ShoppingBag className="w-5 h-5 text-slate-400" /> Marketplace
            </Link>
            {!isAuthenticated && (
              <Link
                to="/seller-register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-card transition-all"
              >
                <Store className="w-5 h-5 text-slate-400" /> Become a Seller
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
