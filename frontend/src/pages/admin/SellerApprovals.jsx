import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Store, RefreshCw } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import api from '../../api/axios'
import toast from 'react-hot-toast'

export default function SellerApprovals() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/sellers/pending')
      setShops(data.data.shops)
    } catch (e) { toast.error('Failed to load') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id) => {
    try {
      await api.put(`/admin/sellers/${id}/approve`)
      toast.success('Shop approved!')
      load()
    } catch { toast.error('Failed') }
  }

  const reject = async (id) => {
    try {
      await api.put(`/admin/sellers/${id}/reject`)
      toast.success('Shop rejected')
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Seller Approvals</h1>
          <p className="text-slate-400 mt-1">Review and approve new seller shop applications.</p>
        </div>
        <Button variant="outline" onClick={load} isLoading={loading}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {shops.length === 0 ? (
        <Card className="p-12 text-center text-slate-400">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No pending shop applications.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shops.map((shop) => (
            <Card key={shop.id} className="p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{shop.shopName || 'Unnamed Shop'}</p>
                  <p className="text-slate-400 text-sm">{shop.email}</p>
                  <p className="text-slate-500 text-xs">Applied: {new Date(shop.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button size="sm" onClick={() => approve(shop.id)} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => reject(shop.id)} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
