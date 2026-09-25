// Seller packages: single source of truth for the UI. Mirrors the backend
// (marketplace/app/core/pricing.py and PACKAGE_LIMITS in products.py); the
// server decides real prices, these are for labels and estimates only.
export const PACKAGE_NAMES = ['Silver', 'Gold', 'Diamond']
export const PROFIT_RATE_VALUES = { Silver: 0.17, Gold: 0.20, Diamond: 0.25 }
export const PROFIT_RATES = { Silver: '17%', Gold: '20%', Diamond: '25%' }
export const PACKAGE_LIMITS = { Silver: 300, Gold: 1000, Diamond: 2000 }
export const DEFAULT_PACKAGE = 'Silver'

// Old cached data may still say "Platinum" (renamed Diamond).
export const normalizePackageName = (name) => (name === 'Platinum' ? 'Diamond' : name)

const round2 = (n) => Math.round(n * 100) / 100

// Storeroom price / seller profit / total for an order as shown to admin and
// seller. Each item's price already includes the seller's package markup, so
// storeroom = price / (1 + rate) and profit is the difference. `rate` comes from
// the server per item (item.profitRate); `fallbackRate` covers older responses.
// Customer tax (8%) is separate from profit and reported on its own.
export function orderPricingBreakdown(order, fallbackRate = PROFIT_RATE_VALUES[DEFAULT_PACKAGE]) {
  const items = order?.items || []
  let storeroomPrice = 0
  let itemsTotal = 0
  const rates = new Set()
  for (const item of items) {
    const rate = item.profitRate ?? fallbackRate
    const line = (item.price || 0) * (item.quantity || 0)
    itemsTotal += line
    storeroomPrice += round2(line / (1 + rate))
    rates.add(rate)
  }
  storeroomPrice = round2(storeroomPrice)
  itemsTotal = round2(itemsTotal)
  const tax = round2(order?.tax || 0)
  const rate = rates.size === 1 ? [...rates][0] : null   // null = several sellers with different plans
  return {
    storeroomPrice,
    sellerProfit: round2(itemsTotal - storeroomPrice),
    tax,
    totalPrice: round2(order?.total ?? itemsTotal + tax),
    profitPctLabel: rate == null ? 'mixed' : `${round2(rate * 100)}%`,
  }
}
