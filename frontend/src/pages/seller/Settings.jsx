import { useState } from 'react'
import { Store, User, Lock, Wallet, ShieldCheck } from 'lucide-react'
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

  // Admin credentials state
  const updateAdminCredentials = useAuthStore((state) => state.updateAdminCredentials)

  // Admin wallets state
  const adminWallets = useAuthStore((state) => state.adminWallets) || { usdt: '', btc: '' }
  const updateAdminWallets = useAuthStore((state) => state.updateAdminWallets)

  const [adminMailInput, setAdminMailInput] = useState(user?.email || '')
  const [adminNewPassInput, setAdminNewPassInput] = useState('')
  const [adminConfirmPassInput, setAdminConfirmPassInput] = useState('')

  const [adminUsdtInput, setAdminUsdtInput] = useState(adminWallets.usdt)
  const [adminBtcInput, setAdminBtcInput] = useState(adminWallets.btc)

  // Seller profile states
  const [shopName, setShopName] = useState(user?.shopName || 'Shopiversa Official Store')
  const [shopEmail, setShopEmail] = useState(user?.shopEmail || 'shop@example.com')
  const [shopDesc, setShopDesc] = useState(user?.shopDesc || 'Welcome to the official Shopiversa store. We provide high-quality digital assets and electronics.')
  const [usdtAddress, setUsdtAddress] = useState(user?.usdtAddress || 'TY6b8f9G2h7L1m5N3k8R0q4Wp1Xz9VcV7b')
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
    { id: 'wallet', label: 'Withdrawal Info', icon: Wallet },
    { id: 'security', label: 'Security', icon: ShieldCheck },
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
        await updateAdminWallets(adminUsdtInput, adminBtcInput)
        setAdminNewPassInput('')
        setAdminConfirmPassInput('')
        toast.success('Admin settings updated successfully!')
      } else {
        await updateUser({ shopName, shopEmail, shopDesc, usdtAddress, btcAddress })
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
          <p className="text-slate-400">Configure default admin credentials, security preferences, and deposit wallets.</p>
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
            <Wallet className="w-5 h-5 text-primary" /> Global Deposit Wallets Configuration
          </h3>
          <p className="text-sm text-slate-400">
            These addresses will be displayed to sellers when they attempt to make a manual crypto deposit into the platform.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Input 
              label="Platform USDT Address (TRC20)" 
              value={adminUsdtInput} 
              onChange={(e) => setAdminUsdtInput(e.target.value)} 
            />
            <Input 
              label="Platform BTC Address" 
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
        <p className="text-slate-400">Manage your store information and security preferences.</p>
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
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="lg:col-span-3">
          <Card className="space-y-8">
            {activeTab === 'shop' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-6 pb-6 border-b border-dark-border">
                  <div className="w-24 h-24 bg-dark-bg border-2 border-dashed border-dark-border rounded-2xl flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:border-primary transition-all">
                    <User className="w-8 h-8 mb-1" />
                    <span className="text-[10px]">Logo</span>
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
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-slate-300">Shop Description</label>
                    <textarea 
                      className="input-field min-h-[120px] py-3"
                      value={shopDesc}
                      onChange={(e) => setShopDesc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Wallet className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-bold text-sm text-primary">Withdrawal Configuration</h4>
                      <p className="text-xs text-slate-400 mt-1">Configure your primary wallet for automated and manual withdrawals.</p>
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
                    label="Bitcoin Wallet Address" 
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

            {activeTab !== 'security' && (
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
