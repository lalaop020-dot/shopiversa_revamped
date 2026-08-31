import { useState } from 'react'
import { User, Lock, Mail, ShieldAlert, ShoppingBag } from 'lucide-react'
import { Card } from '../components/common/Card'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import useAuthStore from '../store/useAuthStore'
import toast from 'react-hot-toast'

export default function CustomerProfile() {
  const { user, updateUser, changePassword } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSavingProfile(true)
    try {
      await updateUser({ name, email })
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setIsChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Account</h1>
        <p className="text-slate-400 text-sm">Manage your profile, login credentials, and view account history.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <Card className="md:col-span-1 flex flex-col items-center text-center p-6 space-y-4">
          <div className="w-20 h-20 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-3xl border border-dark-border">
            {user?.name?.[0] || 'C'}
          </div>
          <div>
            <h3 className="font-bold text-lg">{user?.name || 'Customer User'}</h3>
            <p className="text-xs text-slate-500">{user?.email || 'customer@demo.com'}</p>
          </div>
          <div className="w-full border-t border-dark-border pt-4 flex justify-around text-center">
            <div>
              <div className="font-bold text-primary">5</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Orders</div>
            </div>
            <div>
              <div className="font-bold text-green-500">1</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Active</div>
            </div>
          </div>
        </Card>

        {/* Profile Edit Forms */}
        <div className="md:col-span-2 space-y-8">
          <Card className="space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Profile Settings
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input 
                  label="Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
                <Input 
                  label="Email Address" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" isLoading={isSavingProfile}>Save Changes</Button>
              </div>
            </form>
          </Card>

          <Card className="space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input 
                label="Current Password" 
                type="password" 
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input 
                  label="New Password" 
                  type="password" 
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input 
                  label="Confirm New Password" 
                  type="password" 
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" isLoading={isChangingPassword}>Update Password</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
