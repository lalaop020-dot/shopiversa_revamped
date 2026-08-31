import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

// Protected Route Guard
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  // A seller whose shop isn't (or is no longer) approved — e.g. suspended
  // after approval — can't use seller-only pages even with a valid session.
  if (role === 'seller' && user?.shopStatus && user.shopStatus !== 'approved') {
    return <Navigate to="/seller-pending" state={{ shopStatus: user.shopStatus, shopName: user.shopName }} replace />
  }

  return children
}

// Role-based Redirect component for the root path
export const RoleRedirect = () => {
  const { isAuthenticated, role } = useAuthStore()
  
  if (!isAuthenticated) return null
  
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
  if (role === 'seller') return <Navigate to="/seller/dashboard" replace />
  
  return null
}
