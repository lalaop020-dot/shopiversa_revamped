// Real category names from the backend can be long/descriptive
// (e.g. "Home Appliances and Goods accessories"). This maps them to short,
// friendly labels for compact nav/pill UI — display only, the underlying
// category value used for links/filters is never altered.
const SHORT_LABELS = {
  "Men's Clothes & Outfits": "Men's Fashion",
  "Women's Clothes & Outfits": "Women's Fashion",
  'Home Appliances and Goods accessories': 'Home',
  'Pet Food and accessories': 'Pet Foods',
  'Sports Goods': 'Sports',
  'Toys & Games': 'Toys',
}

export function shortCategoryLabel(name) {
  return SHORT_LABELS[name] || name
}
