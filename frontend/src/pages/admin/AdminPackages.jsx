import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award, Power, PowerOff, Eye, X, ShieldCheck, FileText,
  User, Maximize2, ShieldAlert, RefreshCw
} from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import usePlatformStore from '../../store/usePlatformStore'
import api from '../../api/axios'
import ImageLightbox from '../../components/common/ImageLightbox'
import toast from 'react-hot-toast'
import { PROFIT_RATES, normalizePackageName } from '../../utils/packages'


export default function AdminPackages() {
  const adminSubscriptions = usePlatformStore((state) => state.adminSubscriptions)
  const fetchAdminSubscriptions = usePlatformStore((state) => state.fetchAdminSubscriptions)
  const freezePackage = usePlatformStore((state) => state.freezePackage)
  const unfreezePackage = usePlatformStore((state) => state.unfreezePackage)

  // KYC modal state
  const [selectedSub, setSelectedSub] = useState(null)
  const [kyc, setKyc] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    fetchAdminSubscriptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleFreeze = async (sellerId, email, currentStatus) => {
    try {
      if (currentStatus === 'Frozen') {
        await unfreezePackage(sellerId)
        toast.success(`Subscription reactivated for ${email}`)
      } else {
        await freezePackage(sellerId)
        toast.error(`Subscription frozen for ${email}`)
      }
      fetchAdminSubscriptions()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update subscription status')
    }
  }

  const openKyc = async (sub) => {
    setSelectedSub(sub)
    setKyc(null)
    setKycLoading(true)
    try {
      const { data } = await api.get(`/admin/sellers/${sub.sellerId}/kyc`)
      setKyc(data?.data?.kyc || null)
    } catch {
      setKyc(null)
      toast.error('Could not load KYC documents')
    } finally {
      setKycLoading(false)
    }
  }

  const closeKyc = () => { setSelectedSub(null); setKyc(null) }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Packages &amp; Subscriptions</h1>
          <p className="text-slate-400">Manage seller subscription freeze states and inspect KYC documents.</p>
        </div>
        <Button variant="outline" onClick={fetchAdminSubscriptions} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Subscriptions Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Active Subscriptions Management
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Seller ID</th>
                <th className="px-6 py-4 font-medium">Shop Name</th>
                <th className="px-6 py-4 font-medium">Current Package</th>
                <th className="px-6 py-4 font-medium">KYC Details</th>
                <th className="px-6 py-4 font-medium">Active Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Freeze Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {adminSubscriptions.map((sub) => (
                <tr key={sub.sellerId} className="hover:bg-dark-bg/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{sub.sellerId}</td>
                  <td className="px-6 py-4 font-semibold text-sm">
                    {sub.shopName || sub.sellerEmail}
                    <div className="text-[10px] text-slate-500 font-normal">{sub.sellerEmail}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-primary">
                    {normalizePackageName(sub.packageName)}
                    <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full ml-1">
                      ({PROFIT_RATES[normalizePackageName(sub.packageName)] || '17%'} Profit)
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openKyc(sub)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      View KYC
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 font-semibold text-sm ${
                      sub.status === 'Active' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        sub.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant={sub.status === 'Frozen' ? 'primary' : 'danger'}
                      size="sm"
                      onClick={() => handleToggleFreeze(sub.sellerId, sub.sellerEmail, sub.status)}
                      className="flex items-center gap-1.5 ml-auto"
                    >
                      {sub.status === 'Frozen' ? (
                        <><Power className="w-4 h-4" /> Unfreeze Plan</>
                      ) : (
                        <><PowerOff className="w-4 h-4" /> Freeze Plan</>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {adminSubscriptions.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-500">
                    No seller subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* KYC Modal */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={closeKyc}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-3xl p-6 sm:p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[92vh] border border-dark-border space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-dark-border">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedSub.shopName || selectedSub.sellerEmail}
                  </h2>
                  {selectedSub.sellerName && (
                    <p className="text-slate-300 text-xs font-medium mt-0.5">Owner: {selectedSub.sellerName}</p>
                  )}
                  <p className="text-slate-400 text-sm mt-0.5">{selectedSub.sellerEmail}</p>
                </div>
                <button
                  onClick={closeKyc}
                  aria-label="Close"
                  className="p-2 text-slate-400 hover:text-white hover:bg-dark-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Seller ID</span>
                  <p className="font-mono text-white text-sm">{selectedSub.sellerId}</p>
                </div>
                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Active Package</span>
                  <p className="font-bold text-primary">
                    {normalizePackageName(selectedSub.packageName)}
                    <span className="text-xs text-green-400 ml-1">
                      ({PROFIT_RATES[normalizePackageName(selectedSub.packageName)] || '17%'} Profit)
                    </span>
                  </p>
                </div>
                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Subscription Status</span>
                  <p className={`font-bold flex items-center gap-1.5 ${selectedSub.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${selectedSub.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {selectedSub.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Since: {selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* KYC Documents Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> KYC Documents
                  </h3>
                  <span className="text-xs text-slate-400 bg-dark-bg px-3 py-1 rounded-full border border-dark-border">
                    Official Government Issued ID
                  </span>
                </div>

                {kycLoading ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Loading documents…</div>
                ) : !kyc ? (
                  <div className="rounded-xl border border-dashed border-dark-border bg-dark-card p-8 text-center">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">No KYC documents on file</p>
                    <p className="text-xs text-slate-500 mt-1">This seller registered before documents were stored on the server.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Document Front View', url: kyc.front },
                      { label: 'Document Back View', url: kyc.back },
                    ].map(({ label, url }) => (
                      <div key={label} className="bg-dark-bg/80 border border-dark-border rounded-xl p-4 space-y-3">
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-xs block">{label}</span>
                        {url ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage({ title: `${selectedSub.shopName} — ${label}`, url })}
                            className="relative group block w-full aspect-video rounded-lg overflow-hidden border border-dark-border bg-black"
                          >
                            <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1.5 flex items-center justify-center gap-1.5 text-white font-semibold text-xs">
                              <Maximize2 className="w-3.5 h-3.5" /> Tap to view full size
                            </div>
                          </button>
                        ) : (
                          <div className="aspect-video rounded-lg border border-dashed border-dark-border bg-dark-card flex items-center justify-center text-xs text-slate-500">
                            Image unavailable
                          </div>
                        )}
                      </div>
                    ))}

                    {kyc.profile && (
                      <div className="col-span-1 md:col-span-2 bg-dark-bg/80 border border-dark-border rounded-xl p-4 space-y-3">
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-xs block flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-primary" /> Seller Profile Photo
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ title: `${selectedSub.shopName} — Profile Photo`, url: kyc.profile })}
                          className="relative group block w-24 h-24 rounded-xl overflow-hidden border border-dark-border bg-black"
                        >
                          <img src={kyc.profile} alt="Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                <Button variant="outline" onClick={closeKyc}>Close</Button>
                <Button
                  variant={selectedSub.status === 'Frozen' ? 'primary' : 'danger'}
                  onClick={() => { handleToggleFreeze(selectedSub.sellerId, selectedSub.sellerEmail, selectedSub.status); closeKyc() }}
                  className="flex items-center gap-1.5"
                >
                  {selectedSub.status === 'Frozen' ? (
                    <><Power className="w-4 h-4" /> Unfreeze Plan</>
                  ) : (
                    <><PowerOff className="w-4 h-4" /> Freeze Plan</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-size image lightbox */}
      {previewImage && (
        <ImageLightbox url={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  )
}
