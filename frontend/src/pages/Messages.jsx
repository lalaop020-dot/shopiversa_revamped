import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import { ChatInbox } from '../components/ChatInbox'

export default function Messages() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <ChatInbox
      title="Messages"
      subtitle="Conversations with sellers about their products, and with our support team."
    />
  )
}
