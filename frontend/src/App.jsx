import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Layouts
import MainLayout from './layouts/MainLayout'
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import SellerRegister from './pages/SellerRegister'
import SellerPending from './pages/SellerPending'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import ProductDetail from './pages/ProductDetail'
import ProductListing from './pages/ProductListing'
import TransactionPasswordSetup from './pages/TransactionPasswordSetup'
import DashboardOverview from './pages/DashboardOverview'
import ProductStorehouse from './pages/seller/ProductStorehouse'
import MyProducts from './pages/seller/MyProducts'
import SellerOrders from './pages/seller/Orders'
import Wallet from './pages/seller/Wallet'
import PackageManagement from './pages/seller/PackageManagement'
import ShopSettings from './pages/seller/Settings'
import SupportTickets from './pages/seller/Support'
import SellerMessages from './pages/seller/Messages'
import AddEditProduct from './pages/seller/AddEditProduct'
import SellerApprovals from './pages/admin/SellerApprovals'
import AdminOrders from './pages/admin/AdminOrders'
import CustomerProfile from './pages/CustomerProfile'
import NotificationsPage from './pages/NotificationsPage'
import Contact from './pages/Contact'
import Faq from './pages/Faq'
import AdminTransactions from './pages/admin/AdminTransactions'
import AdminPackages from './pages/admin/AdminPackages'
import AdminSupport from './pages/admin/AdminSupport'
import AdminStoreroom from './pages/admin/AdminStoreroom'
import AdminWithdrawal from './pages/admin/AdminWithdrawal'
import { ProtectedRoute, RoleRedirect } from './routes/guards'

function App() {
  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Store Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<><RoleRedirect /><Home /></>} />
            <Route path="/products" element={<ProductListing />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/category/:slug" element={<ProductListing />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/profile" element={<CustomerProfile />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
          </Route>

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/seller-register" element={<SellerRegister />} />
            <Route path="/seller-pending" element={<SellerPending />} />
            <Route path="/setup-password" element={<TransactionPasswordSetup />} />
          </Route>

          {/* Protected Seller Routes */}
          <Route 
            path="/seller" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardOverview role="seller" />} />
            <Route path="products" element={<MyProducts />} />
            <Route path="storehouse" element={<ProductStorehouse />} />
            <Route path="product/add" element={<AddEditProduct />} />
            <Route path="product/edit/:id" element={<AddEditProduct />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="messages" element={<SellerMessages />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="support" element={<SupportTickets />} />
            <Route path="settings" element={<ShopSettings />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardOverview role="admin" />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="shops" element={<SellerApprovals />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="withdrawal" element={<AdminWithdrawal />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="settings" element={<ShopSettings />} />
            <Route path="storeroom" element={<AdminStoreroom />} />
          </Route>

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default App
