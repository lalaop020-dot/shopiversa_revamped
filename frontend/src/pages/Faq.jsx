import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '../components/common/Card'
import { Button } from '../components/common/Button'

const FAQ_SECTIONS = [
  {
    title: 'Buying',
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse the marketplace, add items to your cart, and head to checkout. You\'ll enter a shipping address and complete payment to confirm your order.',
      },
      {
        q: 'What payment methods are supported?',
        a: 'Shopiversa currently accepts cryptocurrency payments (USDT / BTC). You\'ll submit the transaction hash and wallet address used at checkout for verification.',
      },
      {
        q: 'How do I track my order status?',
        a: 'Order status moves through Processing, Confirmed, Packed, Departed, and Received as the seller fulfills it. You can check your order history from your profile.',
      },
      {
        q: 'Can I cancel an order after placing it?',
        a: 'Contact the seller as soon as possible via chat or through our Contact Us page — orders can only be cancelled before they\'ve departed for shipping.',
      },
    ],
  },
  {
    title: 'Selling',
    items: [
      {
        q: 'How do I become a seller?',
        a: 'Sign up through "Apply as Seller" on the registration page with your shop name and details. Your application is then reviewed by our admin team.',
      },
      {
        q: 'Why can\'t I log in right after registering my shop?',
        a: 'New shops start in "pending" status and require admin approval before you can log in and start selling. You\'ll see a status page after signing up, and can log in as soon as it\'s approved.',
      },
      {
        q: 'How do I add products to my store?',
        a: 'Once approved, go to your Seller Dashboard → Storehouse to import products from our pre-approved catalog, then manage pricing and stock from My Products.',
      },
      {
        q: 'How and when do I get paid?',
        a: 'Earnings from sales accumulate in your Seller Wallet. You can request a withdrawal to your USDT/BTC wallet address once funds are available.',
      },
    ],
  },
  {
    title: 'Account & Security',
    items: [
      {
        q: 'I forgot my password — how do I reset it?',
        a: 'Reach out via our Contact Us page with the email tied to your account, and our support team will help you regain access.',
      },
      {
        q: 'What is a transaction password?',
        a: 'It\'s a second password specific to wallet actions (like withdrawals) for extra account security, separate from your login password.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'We never store card details — all payments are handled via cryptocurrency wallet transactions that you control end-to-end.',
      },
    ],
  },
]

function AccordionItem({ q, a, isOpen, onToggle }) {
  return (
    <div className="border-b border-dark-border last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-medium text-sm sm:text-base">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-slate-400 text-sm pb-4 pr-8">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Faq() {
  const [openKey, setOpenKey] = useState(`${FAQ_SECTIONS[0].title}-0`)

  return (
    <div className="space-y-10 animate-fade-in py-6">
      <div className="text-center max-w-xl mx-auto">
        <HelpCircle className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-slate-400">Answers to common questions about buying, selling, and managing your account on Shopiversa.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-bold text-primary mb-3 uppercase tracking-wide text-sm">{section.title}</h2>
            <Card className="p-2 sm:p-4">
              {section.items.map((item, i) => {
                const key = `${section.title}-${i}`
                return (
                  <AccordionItem
                    key={key}
                    q={item.q}
                    a={item.a}
                    isOpen={openKey === key}
                    onToggle={() => setOpenKey(openKey === key ? null : key)}
                  />
                )
              })}
            </Card>
          </div>
        ))}
      </div>

      <Card className="max-w-3xl mx-auto text-center space-y-3 bg-primary/5 border-primary/20">
        <h3 className="font-bold text-lg">Still have questions?</h3>
        <p className="text-slate-400 text-sm">Can't find what you're looking for? Our team is happy to help.</p>
        <Link to="/contact">
          <Button>Contact Us</Button>
        </Link>
      </Card>
    </div>
  )
}
