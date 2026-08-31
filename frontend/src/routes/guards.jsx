import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

// Protected Route Guard
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
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
