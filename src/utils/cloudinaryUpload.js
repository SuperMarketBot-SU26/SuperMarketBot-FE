/**
 * Cloudinary Upload Utility — FE-side uploader.
 *
 * Uses Cloudinary's unsigned upload preset `smartmarket_unsigned`, so no
 * api_secret is needed in the browser. The BE's Cloudinary config is:
 *   CloudName: "dg24w82y0"
 *   UploadPreset: "smartmarket_unsigned"
 *   Folders: products, member_faces, aisle_scans, semantic_objects
 *
 * BE stores the returned `secure_url` as `imageUrl` in the DB. FE reads it
 * via the regular /api/products endpoint and renders it with buildImageUrl().
 *
 * Upload flow:
 *   1. Admin picks a file in ProductManagement
 *   2. FE uploads directly to Cloudinary via this utility
 *   3. Returns Cloudinary URL (e.g. https://res.cloudinary.com/dg24w82y0/...)
 *   4. FE sets `form.imageUrl = cloudinaryUrl` (or passes it as a field)
 *   5. BE receives the URL as a plain string field — no multipart file needed
 *
 * This bypasses:
 *   - BE's broken local static-file serving
 *   - BE's misconfigured Cloudinary credentials (api_secret mismatch)
 *   - The need for BE to implement its own Cloudinary upload
 */

import { toast } from 'react-toastify'

const CLOUD_NAME = 'dg24w82y0'
const UPLOAD_PRESET = 'smartmarket_unsigned'
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`

/**
 * Upload a File (image/video) directly to Cloudinary using an unsigned preset.
 *
 * @param {File} file           - The file to upload (from <input type="file">)
 * @param {Object} [options]
 * @param {string} [options.folder]   - Cloudinary folder, e.g. 'products', 'member_faces'
 * @param {Object} [options.transforms] - Transform options applied at upload time
 *                                        (see Cloudinary upload API docs).
 * @returns {Promise<{ secure_url: string, public_id: string, format: string }>}
 * @throws {Error} on network failure or Cloudinary error response
 */
export async function uploadToCloudinary(file, options = {}) {
  const { folder = 'products', transforms = {} } = options

  if (!file) throw new Error('No file provided to uploadToCloudinary.')
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Only JPEG, PNG, WebP, GIF allowed.`)
  }
  const maxSizeMB = 10
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB. Max ${maxSizeMB} MB.`)
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)

  // Apply basic optimization at upload time so URLs are already optimized.
  formData.append('quality', 'auto')
  formData.append('fetch_format', 'auto')

  // Optional per-upload transforms (e.g. { width: 800, height: 800, crop: 'limit' })
  Object.entries(transforms).forEach(([key, value]) => {
    if (value != null && value !== '') formData.append(key, String(value))
  })

  let res
  try {
    res = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
  } catch (networkErr) {
    throw new Error(`Network error uploading to Cloudinary: ${networkErr.message}`)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.error?.message || JSON.stringify(body)
    } catch {
      detail = `HTTP ${res.status} ${res.statusText}`
    }
    throw new Error(`Cloudinary upload failed: ${detail}`)
  }

  const data = await res.json()
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    format: data.format,
    width: data.width,
    height: data.height,
    bytes: data.bytes,
  }
}

/**
 * Convenience wrapper for uploading a product image.
 * Uploads to folder `products` with a max dimension limit.
 *
 * @param {File} file
 * @returns {Promise<string>} the secure_url — ready to pass as `imageUrl` to BE
 */
export async function uploadProductImage(file) {
  const result = await uploadToCloudinary(file, {
    folder: 'products',
    transforms: {
      width: 800,
      height: 800,
      crop: 'limit',
    },
  })
  return result.secure_url
}

/**
 * Fire-and-forget product image upload with toast feedback.
 * Use this when you want the UI to remain responsive while uploading.
 *
 * @param {File} file
 * @param {(url: string) => void} onSuccess  - called with Cloudinary URL on success
 * @param {(err: Error) => void} [onError]   - called on failure
 */
export function uploadProductImageAsync(file, onSuccess, onError) {
  toast.promise(
    uploadProductImage(file),
    {
      pending: 'Đang tải ảnh lên Cloudinary...',
      success: 'Ảnh đã được tải lên thành công!',
      error: {
        render({ data }) {
          return `Tải ảnh thất bại: ${data?.message || data}`
        },
      },
    },
    { toastId: 'cloudinary-upload' }
  )
    .then(onSuccess)
    .catch((err) => {
      if (onError) onError(err)
    })
}
