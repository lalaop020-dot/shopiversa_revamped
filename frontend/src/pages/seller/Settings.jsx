import { useState } from 'react'
import { Store, User, Lock, Wallet, ShieldCheck, CreditCard, CheckCircle2, AlertCircle, ImageIcon } from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import useAuthStore from '../../store/useAuthStore'
import toast from 'react-hot-toast'

export default function ShopSettings() {
  const role = useAuthStore((state) => state.role)
  const user = useAuthStore((state) => state.user)
  const updateUser = useAuthStore((state) => state.updateUser)
  const changePassword = useAuthStore((state) => state.changePassword)
  const setTransactionPassword = useAuthStore((state) => state.setTransactionPassword)
  const kycData = useAuthStore((state) => state.kycData)

  // Admin credentials state
  const updateAdminCredentials = useAuthStore((state) => state.updateAdminCredentials)

  // Admin wallets state
  const adminWallets = useAuthStore((state) => state.adminWallets) || { 
    usdt: 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b', 
    eth: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 
    btc: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' 
  }
  const updateAdminWallets = useAuthStore((state) => state.updateAdminWallets)

  const [adminMailInput, setAdminMailInput] = useState(user?.email || '')
  const [adminNewPassInput, setAdminNewPassInput] = useState('')
  const [adminConfirmPassInput, setAdminConfirmPassInput] = useState('')

  const [adminUsdtInput, setAdminUsdtInput] = useState(adminWallets.usdt || 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b')
  const [adminEthInput, setAdminEthInput] = useState(adminWallets.eth || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  const [adminBtcInput, setAdminBtcInput] = useState(adminWallets.btc || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')

  // Seller profile states
  const [shopName, setShopName] = useState(user?.shopName || 'Shopiversa Official Store')
  const [shopEmail, setShopEmail] = useState(user?.shopEmail || 'shop@example.com')
  const [shopDesc, setShopDesc] = useState(user?.shopDesc || 'Welcome to the official Shopiversa store. We provide high-quality digital assets and electronics.')
  const [usdtAddress, setUsdtAddress] = useState(user?.usdtAddress || 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b')
  const [ethAddress, setEthAddress] = useState(user?.ethAddress || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  const [btcAddress, setBtcAddress] = useState(user?.btcAddress || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
  
  const [activeTab, setActiveTab] = useState('shop')

  // Seller security tab state
  const [currentLoginPassword, setCurrentLoginPassword] = useState('')
  const [newLoginPassword, setNewLoginPassword] = useState('')
  const [confirmLoginPassword, setConfirmLoginPassword] = useState('')
  const [isUpdatingLoginPassword, setIsUpdatingLoginPassword] = useState(false)
  const [newTxnPassword, setNewTxnPassword] = useState('')
  const [confirmTxnPassword, setConfirmTxnPassword] = useState('')
  const [isUpdatingTxnPassword, setIsUpdatingTxnPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const tabs = [
    { id: 'shop', label: 'Shop Profile', icon: Store },
    { id: 'kyc', label: 'KYC Documents', icon: ShieldCheck },
    { id: 'wallet', label: 'Withdrawal Info', icon: Wallet },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (role === 'admin') {
        if (adminNewPassInput && adminNewPassInput !== adminConfirmPassInput) {
          toast.error('New passwords do not match')
          return
        }
        await updateAdminCredentials(adminMailInput, adminNewPassInput)
        await updateAdminWallets(adminUsdtInput, adminEthInput, adminBtcInput)
        setAdminNewPassInput('')
        setAdminConfirmPassInput('')
        toast.success('Admin settings updated successfully!')
      } else {
        await updateUser({ shopName, shopEmail, shopDesc, usdtAddress, ethAddress, btcAddress })
        toast.success('Settings saved successfully!')
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateLoginPassword = async () => {
    if (!currentLoginPassword || !newLoginPassword || !confirmLoginPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newLoginPassword !== confirmLoginPassword) {
      toast.error('New passwords do not match')
      return
    }
    setIsUpdatingLoginPassword(true)
    try {
      await changePassword(currentLoginPassword, newLoginPassword)
      toast.success('Login password updated successfully!')
      setCurrentLoginPassword('')
      setNewLoginPassword('')
      setConfirmLoginPassword('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update password')
    } finally {
      setIsUpdatingLoginPassword(false)
    }
  }

  const handleUpdateTransactionPassword = async () => {
    if (newTxnPassword.length < 6) {
      toast.error('Transaction password must be at least 6 digits')
      return
    }
    if (newTxnPassword !== confirmTxnPassword) {
      toast.error('Passwords do not match')
      return
    }
    setIsUpdatingTxnPassword(true)
    try {
      await setTransactionPassword(newTxnPassword, confirmTxnPassword)
      toast.success('Transaction password updated successfully!')
      setNewTxnPassword('')
      setConfirmTxnPassword('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update transaction password')
    } finally {
      setIsUpdatingTxnPassword(false)
    }
  }

  if (role === 'admin') {
    return (
      <div className="space-y-8 animate-fade-in max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Settings</h1>
          <p className="text-slate-400">Configure default admin credentials, security preferences, and deposit crypto wallets.</p>
        </div>

        <Card className="space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Credentials Manager
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Input
              label="Admin Login Email"
              value={adminMailInput}
              onChange={(e) => setAdminMailInput(e.target.value)}
            />
            <div className="md:col-span-2 grid md:grid-cols-2 gap-6 pt-4 border-t border-dark-border">
              <Input 
                label="New Password" 
                type="password" 
                placeholder="Leave blank to keep current"
                value={adminNewPassInput}
                onChange={(e) => setAdminNewPassInput(e.target.value)}
              />
              <Input 
                label="Confirm New Password" 
                type="password" 
                placeholder="Confirm new password"
                value={adminConfirmPassInput}
                onChange={(e) => setAdminConfirmPassInput(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> Global Crypto Deposit Wallets Configuration
          </h3>
          <p className="text-sm text-slate-400">
            These crypto wallet addresses will be displayed to sellers when they make a deposit into the platform.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Input 
              label="USDT Address (TRC20)" 
              value={adminUsdtInput} 
              onChange={(e) => setAdminUsdtInput(e.target.value)} 
            />
            <Input 
              label="ETH Address (TRC20)" 
              value={adminEthInput} 
              onChange={(e) => setAdminEthInput(e.target.value)} 
            />
            <Input 
              label="BTC Address" 
              value={adminBtcInput} 
              onChange={(e) => setAdminBtcInput(e.target.value)} 
            />
          </div>

          <div className="flex justify-end pt-6 border-t border-dark-border">
             <Button onClick={handleSave} className="px-10" isLoading={isSaving}>Save Settings</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">Shop Settings</h1>
        <p className="text-slate-400">Manage your store information, KYC documents, and security preferences.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Navigation */}
        <aside className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-slate-400 hover:bg-dark-card hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{tab.label}</span>
              {tab.id === 'kyc' && kycData && (
                <span className="ml-auto w-2 h-2 rounded-full bg-green-500 shrink-0" title="KYC submitted" />
              )}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="lg:col-span-3">
          <Card className="space-y-8">
            {/* ── Shop Profile ── */}
            {activeTab === 'shop' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6 pb-6 border-b border-dark-border">
                  <div className="relative shrink-0">
                    {kycData?.profilePic ? (
                      <img
                        src={kycData.profilePic}
                        alt="Profile"
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-primary/40"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-dark-bg border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-primary transition-all">
                        <User className="w-8 h-8 mb-1" />
                        <span className="text-[10px]">Logo</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Shop Logo</h4>
                    <p className="text-xs text-slate-500 mb-3">Recommended size: 512x512px. Max 2MB.</p>
                    <div className="flex gap-2">
                       <Button size="sm">Upload</Button>
                       <Button size="sm" variant="outline">Remove</Button>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Input 
                    label="Shop Name" 
                    value={shopName} 
                    onChange={(e) => setShopName(e.target.value)} 
                  />
                  <Input 
                    label="Shop Email" 
                    value={shopEmail} 
                    onChange={(e) => setShopEmail(e.target.value)} 
                  />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Shop Description</label>
                    <textarea 
                      className="input-field min-h-[120px] py-3"
                      value={shopDesc}
                      onChange={(e) => setShopDesc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── KYC Documents ── */}
            {activeTab === 'kyc' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-primary">KYC Verification Documents</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      These are the identity documents you submitted during registration. They are stored locally on this device for your reference.
                    </p>
                  </div>
                </div>

                {kycData ? (
                  <>
                    {/* Submission info */}
                    <div className="grid sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-1">
                        <p className="text-slate-500 uppercase tracking-wider font-semibold">Full Name</p>
                        <p className="text-white font-medium">{user?.name || '—'}</p>
                      </div>
                      <div className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-1">
                        <p className="text-slate-500 uppercase tracking-wider font-semibold">Email</p>
                        <p className="text-white font-medium truncate">{user?.email || '—'}</p>
                      </div>
                      <div className="bg-dark-bg border border-dark-border rounded-xl p-4 space-y-1">
                        <p className="text-slate-500 uppercase tracking-wider font-semibold">Submitted At</p>
                        <p className="text-white font-medium">
                          {kycData.submittedAt
                            ? new Date(kycData.submittedAt).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* KYC Status Badge */}
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-green-400">KYC Documents Submitted</p>
                        <p className="text-xs text-slate-400 mt-0.5">Your documents are under review by our admin team. You will be notified once verified.</p>
                      </div>
                    </div>

                    {/* Profile Picture */}
                    {kycData.profilePic && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Profile Photo
                        </h5>
                        <div className="relative inline-block">
                          <img
                            src={kycData.profilePic}
                            alt="Profile"
                            className="w-28 h-28 rounded-2xl object-cover border-2 border-primary/40"
                          />
                          <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 border-2 border-dark-card">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document images */}
                    <div className="space-y-3">
                      <h5 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Official Document (ID Card / Driving License)
                      </h5>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/* Front view */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Front View</p>
                          {kycData.docFrontImage ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-dark-bg group">
                              <img
                                src={kycData.docFrontImage}
                                alt="Document Front"
                                className="w-full object-cover max-h-52"
                              />
                              {/* Corner brackets */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-sm" />
                              </div>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium shadow-md">
                                <CheckCircle2 className="w-3 h-3" /> Front view uploaded
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-dark-border bg-dark-bg text-slate-600">
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Back view */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Back View</p>
                          {kycData.docBackImage ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-primary/30 bg-dark-bg group">
                              <img
                                src={kycData.docBackImage}
                                alt="Document Back"
                                className="w-full object-cover max-h-52"
                              />
                              {/* Corner brackets */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-sm" />
                              </div>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-green-500/90 backdrop-blur-sm text-white text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium shadow-md">
                                <CheckCircle2 className="w-3 h-3" /> Back view uploaded
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed border-dark-border bg-dark-bg text-slate-600">
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-xs">No image</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 italic">
                      * KYC images are stored locally in your browser. They are not visible to other parties until reviewed by our admins.
                    </p>
                  </>
                ) : (
                  /* No KYC data found */
                  <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-dark-bg border border-dark-border flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-300">No KYC Data Found</h4>
                      <p className="text-slate-500 text-sm mt-1 max-w-xs">
                        KYC documents are only stored locally during seller registration. They were not found on this device.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Wallet / Withdrawal Info ── */}
            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Wallet className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Withdrawal Configuration</h4>
                      <p className="text-xs text-slate-400 mt-1">Configure your crypto wallet addresses for payouts.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input 
                    label="USDT Wallet Address (TRC20)" 
                    value={usdtAddress} 
                    onChange={(e) => setUsdtAddress(e.target.value)} 
                  />
                  <Input 
                    label="ETH Wallet Address (TRC20)" 
                    value={ethAddress} 
                    onChange={(e) => setEthAddress(e.target.value)} 
                  />
                  <Input 
                    label="BTC Wallet Address" 
                    value={btcAddress} 
                    onChange={(e) => setBtcAddress(e.target.value)} 
                  />
                  <div className="pt-4 flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded border-dark-border bg-dark-bg accent-primary" defaultChecked />
                    <span className="text-sm text-slate-400">Save as default withdrawal method</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Security ── */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <h4 className="font-bold mb-4">Update Login Password</h4>
                    <Input
                      label="Current Password" type="password" className="mb-4"
                      value={currentLoginPassword}
                      onChange={(e) => setCurrentLoginPassword(e.target.value)}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="New Password" type="password"
                        value={newLoginPassword}
                        onChange={(e) => setNewLoginPassword(e.target.value)}
                      />
                      <Input
                        label="Confirm New Password" type="password"
                        value={confirmLoginPassword}
                        onChange={(e) => setConfirmLoginPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleUpdateLoginPassword} isLoading={isUpdatingLoginPassword}>Update Login Password</Button>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 border-t border-dark-border">
                    <h4 className="font-bold mb-1 text-primary">Transaction Password</h4>
                    <p className="text-xs text-slate-500 mb-4">Required for all withdrawals and sensitive account changes.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="New Transaction Password (6-8 digits)" type="password" placeholder="••••••"
                        value={newTxnPassword}
                        onChange={(e) => setNewTxnPassword(e.target.value)}
                      />
                      <Input
                        label="Confirm Transaction Password" type="password" placeholder="••••••"
                        value={confirmTxnPassword}
                        onChange={(e) => setConfirmTxnPassword(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleUpdateTransactionPassword} isLoading={isUpdatingTxnPassword}>Update Transaction Password</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== 'security' && activeTab !== 'kyc' && (
              <div className="flex justify-end pt-6 border-t border-dark-border">
                 <Button onClick={handleSave} className="px-10" isLoading={isSaving}>Save Settings</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
