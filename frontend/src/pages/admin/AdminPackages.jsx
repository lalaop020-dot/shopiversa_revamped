import { useEffect } from 'react'
import { Award, Power, PowerOff } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import usePlatformStore from '../../store/usePlatformStore'
import toast from 'react-hot-toast'
import { PROFIT_RATES, normalizePackageName } from '../../utils/packages'


export default function AdminPackages() {
  const adminSubscriptions = usePlatformStore((state) => state.adminSubscriptions)
  const fetchAdminSubscriptions = usePlatformStore((state) => state.fetchAdminSubscriptions)
  const freezePackage = usePlatformStore((state) => state.freezePackage)
  const unfreezePackage = usePlatformStore((state) => state.unfreezePackage)

  useEffect(() => {
    fetchAdminSubscriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleFreeze = async (sellerId, email, currentStatus) => {
    try {
      if (currentStatus === 'Frozen') {
        await unfreezePackage(sellerId)
        toast.success(`Account subscription reactivated for ${email}`)
      } else {
        await freezePackage(sellerId)
        toast.error(`Account subscription frozen for ${email}`)
      }
      fetchAdminSubscriptions()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update subscription status')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Packages &amp; Subscriptions</h1>
        <p className="text-slate-400">Manage seller subscription freeze states. Package upgrades are confirmed automatically by sellers.</p>
      </div>

      {/* Active Subscriptions & Freeze Controls */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Active Subscriptions Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Seller Email</th>
                <th className="px-6 py-4 font-medium">Current Package</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Freeze Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {adminSubscriptions.map((sub) => (
                <tr key={sub.sellerId} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-sm">{sub.sellerEmail}</td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {normalizePackageName(sub.packageName)} <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full ml-1">({PROFIT_RATES[normalizePackageName(sub.packageName)] || '17%'} Profit)</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 ${
                      sub.status === 'Active' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        sub.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button
                      variant={sub.status === 'Frozen' ? 'primary' : 'danger'}
                      size="sm"
                      onClick={() => handleToggleFreeze(sub.sellerId, sub.sellerEmail, sub.status)}
                      className="flex items-center gap-1.5"
                    >
                      {sub.status === 'Frozen' ? (
                        <>
                          <Power className="w-4 h-4" /> Unfreeze Plan
                        </>
                      ) : (
                        <>
                          <PowerOff className="w-4 h-4" /> Freeze Plan
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {adminSubscriptions.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-slate-500">
                    No seller subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
