import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertOctagon } from 'lucide-react'
import { Button } from '../../components/common/Button'
import toast from 'react-hot-toast'

export default function AddEditProduct() {
  const navigate = useNavigate()

  useEffect(() => {
    toast.error('Direct product registration is disabled for sellers. Please use the approved Storeroom.')
    const timeout = setTimeout(() => {
      navigate('/seller/storehouse')
    }, 2500)
    return () => clearTimeout(timeout)
  }, [navigate])

  return (
    <div className="max-w-2xl mx-auto py-20 text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto text-red-500">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold">Access Restricted</h1>
      <p className="text-slate-400 max-w-md mx-auto">
        You are not authorized to import products from outside the system's approved storeroom. You can only choose products configured by administrators.
      </p>
      <div className="pt-4">
        <Button onClick={() => navigate('/seller/storehouse')}>
          Go to Approved Storeroom
        </Button>
      </div>
    </div>
  )
}
