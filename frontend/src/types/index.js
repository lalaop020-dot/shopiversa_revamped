/**
 * @typedef {Object} Product
 * @property {string|number} id
 * @property {string} name
 * @property {number} price
 * @property {string} category
 * @property {number} stock
 * @property {string} [image]
 * @property {string} [description]
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'admin'|'seller'|'customer'} role
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} customerName
 * @property {number} total
 * @property {'Pending'|'Processing'|'Shipped'|'Delivered'|'Cancelled'} status
 * @property {string} date
 */
