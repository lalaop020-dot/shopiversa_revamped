import { Outlet, Link } from 'react-router-dom'
import { Truck, ShieldCheck, Zap } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-primary text-white text-xs sm:text-sm py-2 px-4 overflow-hidden">
        <div className="container mx-auto flex items-center justify-center gap-2 sm:gap-6 flex-wrap text-center font-medium">
          <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Free shipping on orders over $50</span>
          <span className="hidden sm:inline opacity-50">&middot;</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Secure checkout</span>
          <span className="hidden sm:inline opacity-50">&middot;</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Fast delivery</span>
        </div>
      </div>
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-dark-card border-t border-dark-border py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold mb-4">SHOPIVERSA</h3>
            <p className="text-slate-400">The world's leading premium multi-vendor marketplace.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/products" className="hover:text-primary transition-colors">Products</Link></li>
              <li><Link to="/products" className="hover:text-primary transition-colors">Categories</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Customer Care</h4>
            <ul className="space-y-2 text-slate-400">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQs</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t border-dark-border text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Shopiversa. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
