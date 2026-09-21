// Client-side handling for screenshots / KYC photos, mirroring the backend
// limits (marketplace/app/core/cloudinary_service.py).
//
// Phone cameras produce 4-8 MB photos, so instead of rejecting them we shrink
// large images in the browser first (max 1800px, JPEG). That keeps text readable,
// makes uploads fast on mobile data, and stays well under request-size limits.
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PROOF_MB = 5
const SKIP_COMPRESS_BELOW = 1024 * 1024 // already small enough
const MAX_DIMENSION = 1800
const JPEG_QUALITY = 0.85

async function compressImage(file) {
  if (file.size <= SKIP_COMPRESS_BELOW) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // JPEG has no transparency
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // browser can't decode it: send as-is and let the server judge
  }
}

// Checks the type, shrinks big images, then checks the final size.
// Resolves to { file } on success or { error } with a message to show the user.
export async function prepareProofFile(file) {
  if (!file) return { file: null }
  if (!ALLOWED.includes(file.type)) return { error: 'Image must be a JPG, PNG or WEBP file' }
  const prepared = await compressImage(file)
  if (prepared.size > MAX_PROOF_MB * 1024 * 1024) {
    return { error: `Image is too large (max ${MAX_PROOF_MB} MB)` }
  }
  return { file: prepared }
}
