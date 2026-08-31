import { useState } from 'react'
import { Plus, MessageCircle, Clock, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import toast from 'react-hot-toast'

export default function SupportTickets() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tickets, setTickets] = useState([
    { id: 'TKT-1001', subject: 'Wallet withdrawal pending', status: 'Open', priority: 'High', date: '2 mins ago' },
    { id: 'TKT-1002', subject: 'Inquiry about Gold package', status: 'Closed', priority: 'Medium', date: '2 days ago' },
    { id: 'TKT-1003', subject: 'API connection issues', status: 'In Progress', priority: 'Critical', date: '1 hour ago' },
  ])

  // Form states
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [category, setCategory] = useState('Wallet/Payments')
  const [searchTerm, setSearchTerm] = useState('')

  const handleCreateTicket = (e) => {
    e.preventDefault()
    if (!subject.trim() || !details.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    const newTicket = {
      id: `TKT-${Math.floor(1004 + Math.random() * 9000)}`,
      subject,
      status: 'Open',
      priority,
      date: 'Just now'
    }

    setTickets([newTicket, ...tickets])
    toast.success('Ticket created successfully!')
    setSubject('')
    setDetails('')
    setPriority('Medium')
    setIsModalOpen(false)
  }

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length
  const closedTicketsCount = tickets.filter(t => t.status === 'Closed').length

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
          <p className="text-slate-400">Get assistance with your store and account.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4" /> Create Ticket
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4 border-l-4 border-primary">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{tickets.length}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Total Tickets</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-green-500">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{closedTicketsCount}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Resolved</div>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-accent-gold">
          <div className="p-3 bg-accent-gold/10 text-accent-gold rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{openTicketsCount}</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest">Pending</div>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-dark-border flex items-center justify-between">
          <h3 className="font-bold">Recent Tickets</h3>
          <div className="relative w-64">
            <Input 
              placeholder="Search tickets..." 
              className="pl-10 h-9 text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-dark-bg text-slate-400 text-xs uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-medium">Ticket ID</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Priority</th>
                <th className="px-6 py-4 font-medium">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filteredTickets.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors cursor-pointer group">
                  <td className="px-6 py-4 font-mono text-sm group-hover:text-primary">{t.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{t.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'Open' ? 'bg-blue-500/10 text-blue-500' :
                      t.status === 'Closed' ? 'bg-slate-500/10 text-slate-500' :
                      'bg-accent-gold/10 text-accent-gold'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        t.priority === 'Critical' ? 'bg-red-500 shadow-lg shadow-red-500/50' :
                        t.priority === 'High' ? 'bg-orange-500' : 'bg-slate-500'
                      }`} />
                      {t.priority}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{t.date}</td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-500">
                    No tickets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <Card className="w-full max-w-lg relative z-10 p-8">
            <h2 className="text-2xl font-bold mb-6">Create Support Ticket</h2>
            <form className="space-y-4" onSubmit={handleCreateTicket}>
              <Input 
                label="Subject" 
                placeholder="Brief description of the issue" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required 
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Issue Details</label>
                <textarea 
                  className="input-field min-h-[120px] py-3" 
                  placeholder="Explain the problem in detail..." 
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Priority</label>
                  <select 
                    className="input-field" 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-300">Category</label>
                  <select 
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Wallet/Payments</option>
                    <option>Product Import</option>
                    <option>Account Security</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button variant="outline" className="flex-grow" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-grow">Submit Ticket</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
