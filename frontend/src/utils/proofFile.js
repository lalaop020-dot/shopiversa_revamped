// Mirrors the backend limits (marketplace/app/core/cloudinary_service.py) so a
// bad screenshot is caught before the upload, not after.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PROOF_MB = 5

// Returns an error message, or null if the file is fine.
export function validateProofFile(file) {
  if (!file) return null
  if (!ALLOWED.includes(file.type)) return 'Screenshot must be a JPG, PNG or WEBP image'
  if (file.size > MAX_PROOF_MB * 1024 * 1024) return `Screenshot is too large (max ${MAX_PROOF_MB} MB)`
  return null
}
