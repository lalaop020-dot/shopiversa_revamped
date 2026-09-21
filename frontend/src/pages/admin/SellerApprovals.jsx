import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Store, RefreshCw, Eye, Search,
  ShieldCheck, FileText, X, User, Mail, Calendar, Maximize2, ShieldAlert
} from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import api from '../../api/axios'
import ImageLightbox from '../../components/common/ImageLightbox'
import toast from 'react-hot-toast'

// Seller's profile photo (uploaded at registration) or their initial.
function ShopAvatar({ shop, className }) {
  const initial = (shop.shopName || shop.name || 'S')[0]
  return shop.profileImage ? (
    <img src={shop.profileImage} alt="" className={`${className} object-cover`} loading="lazy" />
  ) : (
    <div className={`${className} flex items-center justify-center font-bold`}>{initial}</div>
  )
}

export default function SellerApprovals() {
  const [pendingShops, setPendingShops] = useState([])
  const [approvedShops, setApprovedShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedShop, setSelectedShop] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  // KYC documents of the shop being inspected — fetched on demand from the server
  // (signed, private links), never kept in the browser.
  const [kyc, setKyc] = useState(null)
  const [kycLoading, setKycLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data: pendingData } = await api.get('/admin/sellers/pending')
      setPendingShops(pendingData?.data?.shops || [])
    } catch {
      setPendingShops([])
      toast.error('Could not load pending applications')
    }

    try {
      const { data: allData } = await api.get('/admin/sellers?limit=200')
      const allSellers = allData?.data?.sellers || []
      // The platform's own store is not a seller that goes through KYC.
      setApprovedShops(allSellers.filter(s => s.shopStatus === 'approved' && !s.isHouse))
    } catch {
      setApprovedShops([])
      toast.error('Could not load approved shops')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Open a shop for review and fetch its documents.
  const inspect = async (shop) => {
    setSelectedShop(shop)
    setKyc(null)
    setKycLoading(true)
    try {
      const { data } = await api.get(`/admin/sellers/${shop.id}/kyc`)
      setKyc(data?.data?.kyc || null)
    } catch {
      setKyc(null)
      toast.error('Could not load KYC documents')
    } finally {
      setKycLoading(false)
    }
  }

  const closeInspect = () => { setSelectedShop(null); setKyc(null) }
  const approve = async (id) => {
    try {
      await api.put(`/admin/sellers/${id}/approve`)
      toast.success('Shop approved successfully!')
      if (selectedShop?.id === id) closeInspect()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve shop')
    }
  }

  const reject = async (id) => {
    try {
      await api.put(`/admin/sellers/${id}/reject`)
      toast.success('Shop application rejected')
      if (selectedShop?.id === id) closeInspect()
      load()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject shop')
    }
  }

  const filteredApproved = approvedShops.filter(shop =>
    (shop.shopName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shop.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Shop Approvals & Verification</h1>
          <p className="text-slate-400">Review pending seller applications and inspect verified seller shops with complete KYC documents.</p>
        </div>
        <Button variant="outline" onClick={load} isLoading={loading} className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* SECTION 1: PENDING SHOP APPLICATIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold">Pending Applications</h2>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {pendingShops.length} Pending
            </span>
          </div>
        </div>

        {pendingShops.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 bg-dark-bg/40 border border-dark-border">
            <Store className="w-10 h-10 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-300">No pending shop applications.</p>
            <p className="text-xs text-slate-500 mt-1">New seller registrations waiting for approval will appear here.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingShops.map((shop) => (
              <Card key={shop.id} className="p-6 space-y-4 border-amber-500/30 hover:border-amber-500/60 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <ShopAvatar shop={shop} className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-lg shrink-0" />
                    <div>
                      <h3 className="font-bold text-base text-white">{shop.shopName || 'Unnamed Shop'}</h3>
                      <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <User className="w-3 h-3 text-slate-500" /> {shop.name || 'Seller Owner'}
                      </p>
                      <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" /> {shop.email}
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md">
                    Pending
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dark-border text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Applied: {new Date(shop.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => inspect(shop)}
                    className="text-primary hover:underline font-bold flex items-center gap-1 min-h-[44px]"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect KYC
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button size="sm" onClick={() => approve(shop.id)} className="flex-1 bg-green-600 hover:bg-green-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(shop.id)} className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold">
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED SHOPS LIST (TABULAR FORM WITH KYC DETAILS) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-bold">Approved Seller Shops</h2>
            <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {filteredApproved.length} Active
            </span>
          </div>

          <div className="relative min-w-[280px]">
            <Input
              placeholder="Search approved shops by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          </div>
        </div>

        <Card className="p-0 overflow-hidden border-dark-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-dark-bg text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Shop & Owner</th>
                  <th className="px-6 py-4 font-bold">Seller Email</th>
                  <th className="px-6 py-4 font-bold">Shop Status</th>
                  <th className="px-6 py-4 font-bold">KYC Status</th>
                  <th className="px-6 py-4 font-bold">Joined Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border text-sm">
                {filteredApproved.map((shop) => {
                  return (
                    <tr key={shop.id} className="hover:bg-dark-bg/50 transition-colors">
                      {/* Shop & Owner */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ShopAvatar shop={shop} className="w-10 h-10 rounded-xl bg-primary/20 text-primary shrink-0" />
                          <div>
                            <div className="font-bold text-white text-base">{shop.shopName || 'Seller Store'}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <User className="w-3 h-3 text-slate-500" /> {shop.name || 'Store Owner'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Seller Email */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs text-primary">{shop.email}</div>
                      </td>

                      {/* Shop Status */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      </td>

                      {/* KYC Status */}
                      <td className="px-6 py-4">
                        {shop.kycSubmitted ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> KYC on file
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-slate-500/20 text-slate-400 border border-slate-500/30 inline-flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> No KYC
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {new Date(shop.createdAt || Date.now()).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 hover:bg-primary/20 hover:text-primary font-bold"
                          onClick={() => inspect(shop)}
                        >
                          <Eye className="w-4 h-4" /> View Details & KYC
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {filteredApproved.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      <Store className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-500" />
                      <p className="font-semibold">No approved shops found.</p>
                      <p className="text-xs text-slate-500 mt-1">Approved shops will appear here once applications are processed.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* MODAL 1: DETAILED SHOP & KYC INSPECTION MODAL */}
      <AnimatePresence>
        {selectedShop && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={closeInspect}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-3xl p-6 sm:p-8 rounded-2xl relative z-10 overflow-y-auto max-h-[92vh] border border-dark-border space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                  <ShopAvatar shop={selectedShop} className="w-12 h-12 rounded-xl bg-primary/20 text-primary text-xl shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedShop.shopName || 'Seller Store'}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedShop.shopStatus === 'pending'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-green-500/20 text-green-400 border border-green-500/30'
                      }`}>
                        {selectedShop.shopStatus || 'Approved'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">Shop Verification & KYC Compliance Audit</p>
                  </div>
                </div>
                <button
                  onClick={closeInspect}
                  aria-label="Close"
                  className="p-2 text-slate-400 hover:text-white hover:bg-dark-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overview Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Shop Owner</span>
                  <p className="font-bold text-white text-base">{selectedShop.name || 'N/A'}</p>
                  <p className="text-xs text-primary font-mono truncate">{selectedShop.email}</p>
                </div>
                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">KYC Status</span>
                  {kycLoading ? (
                    <p className="text-sm text-slate-400">Loading…</p>
                  ) : selectedShop.kycSubmitted ? (
                    <>
                      <p className="font-bold text-blue-400 text-base flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Documents on file
                      </p>
                      <p className="text-xs text-slate-500">
                        {kyc?.submittedAt ? `Submitted ${new Date(kyc.submittedAt).toLocaleDateString()}` : 'Review the documents below'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-slate-300 text-base flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> Not submitted
                      </p>
                      <p className="text-xs text-slate-500">No KYC documents on file</p>
                    </>
                  )}
                </div>                <div className="bg-dark-bg p-4 rounded-xl border border-dark-border space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Joined Date</span>
                  <p className="font-bold text-white text-base">
                    {new Date(selectedShop.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500">Registration Date</p>
                </div>
              </div>

              {/* KYC Documents Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> Submitted KYC Documents
                  </h3>
                  <span className="text-xs text-slate-400 bg-dark-bg px-3 py-1 rounded-full border border-dark-border">
                    Official Government Issued ID
                  </span>
                </div>

                {kycLoading ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Loading documents…</div>
                ) : !kyc ? (
                  <div className="rounded-xl border border-dashed border-dark-border bg-dark-card p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
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
                            onClick={() => setPreviewImage({ title: `${selectedShop.shopName} - ${label}`, url })}
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
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-xs block">Seller Profile Photo</span>
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ title: `${selectedShop.shopName} - Profile Photo`, url: kyc.profile })}
                          className="relative group block w-24 h-24 rounded-xl overflow-hidden border border-dark-border bg-black"
                        >
                          <img src={kyc.profile} alt="Profile" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                        </button>
                      </div>
                    )}
                  </div>
                )}              </div>

              {/* Action Buttons in Modal */}
              <div className="flex justify-between items-center pt-4 border-t border-dark-border">
                <Button variant="outline" onClick={closeInspect}>
                  Close Audit
                </Button>
                {selectedShop.shopStatus === 'pending' && (
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => reject(selectedShop.id)} className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold">
                      <XCircle className="w-4 h-4 mr-1.5" /> Reject Application
                    </Button>
                    <Button onClick={() => approve(selectedShop.id)} className="bg-green-600 hover:bg-green-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Shop
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-size viewer (fullscreen on phones, "open in new tab" available) */}
      {previewImage && (
        <ImageLightbox url={previewImage.url} title={previewImage.title} onClose={() => setPreviewImage(null)} />
      )}    </div>
  )
}

