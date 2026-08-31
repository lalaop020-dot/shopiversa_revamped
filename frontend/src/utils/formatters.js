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
