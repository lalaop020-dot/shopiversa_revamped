/**
 * Formats a number as a currency string (USD)
 * @param {number} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Formats a date string or object
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Shortens a string with ellipsis
 * @param {string} str 
 * @param {number} length 
 * @returns {string}
 */
export const truncateString = (str, length = 100) => {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

/**
 * Generates a random transaction ID
 * @returns {string}
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

/**
 * Formats a date string as a short relative time ("5m ago", "3d ago"),
 * falling back to a full date once it's more than a week old.
 * @param {string|Date} date
 * @returns {string}
 */
export const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 5) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

// Neutral "no image" picture for products that have none (an inline SVG, so it
// can't break the way a hosted placeholder or an unrelated stock photo can).
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
  '<rect width="400" height="400" fill="#1b2035"/>' +
  '<g fill="none" stroke="#475569" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="110" y="130" width="180" height="140" rx="14"/><circle cx="160" cy="180" r="14"/>' +
  '<path d="M120 260l55-50 40 35 30-25 45 40"/></g></svg>'
export const PRODUCT_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(PLACEHOLDER_SVG)}`
