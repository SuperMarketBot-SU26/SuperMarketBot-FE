/**
 * Admin Product API — maps to /api/v1/admin/products
 *
 * Backend endpoints (Authorize[AdminOrStaff]):
 *   GET    /api/v1/admin/products              → list products
 *   GET    /api/v1/admin/products/{id}        → single product
 *   POST   /api/v1/admin/products              → create (multipart/form-data OR JSON with URL)
 *   PUT    /api/v1/admin/products/{id}        → update (multipart/form-data OR JSON with URL)
 *   PATCH  /api/v1/admin/products/{id}/status  → update status only (JSON)
 *   DELETE /api/v1/admin/products/{id}        → soft-delete (sets Status='Inactive')
 *
 * ProductDto: { productId, productName, unitPrice, status, imageUrl?, productTypeId }
 * Create/Update DTOs: All fields except productTypeId + productName are optional.
 *
 * IMAGE UPLOAD STRATEGY:
 * FE uploads directly to Cloudinary using the unsigned preset `smartmarket_unsigned`.
 * This bypasses BE's misconfigured Cloudinary credentials (api_secret mismatch) and
 * missing static-file serving. After upload, the Cloudinary URL is passed as a plain
 * string `imageUrl` field in the payload — BE just saves it without re-uploading.
 */

import client from '../../../api/client'
import { uploadProductImage } from '../../../utils/cloudinaryUpload'

const ADMIN_ENDPOINT = '/api/v1/admin/products'

/**
 * List products for the admin table.
 * Calls the public /api/products endpoint — the same list shape is returned
 * either way and the public route doesn't require admin auth. The leading
 * `/api` is required so the request hits the Vite dev proxy (and ASP.NET
 * route table on the backend); without it the SPA fallback serves index.html
 * and `Array.isArray(res.data)` is false, leaving the table empty.
 */
export const getAdminProducts = (params = {}) =>
  client.get('/api/products', { params }).then((res) => res.data)

export const getAdminProduct = (productId) =>
  client.get(`${ADMIN_ENDPOINT}/${productId}`).then((res) => res.data)

/**
 * Build a multipart/form-data body from a payload object + optional imageFile.
 * Scalar fields become string entries; arrays (e.g. healthTagIds) become multiple
 * `healthTagIds` parts with the same name so ASP.NET model binding picks them up.
 */
const normalizePayload = (payload) => {
  const out = {}
  if (!payload) return out
  Object.keys(payload).forEach((key) => {
    const val = payload[key]
    if (val === undefined || val === null) return
    if (Array.isArray(val)) {
      out[key] = val
    } else {
      out[key] = String(val)
    }
  })
  return out
}

/**
 * Build a multipart/form-data body from a payload object + optional imageFile.
 * Scalar fields become string entries; arrays (e.g. healthTagIds) become multiple
 * `healthTagIds` parts with the same name so ASP.NET model binding picks them up.
 */
const buildMultipartBody = (payload, imageFile) => {
  const form = new FormData()
  const norm = normalizePayload(payload)
  Object.keys(norm).forEach((key) => {
    const val = norm[key]
    if (Array.isArray(val)) {
      val.forEach((item) => form.append(key, String(item)))
    } else {
      form.append(key, val)
    }
  })
  if (imageFile) {
    form.append('imageFile', imageFile)
  }
  return form
}

/**
 * Create a new product.
 * - If imageFile is provided: FE uploads to Cloudinary first, then sends multipart/form-data
 *   with the returned secure_url as an `imageUrl` string field. This bypasses BE's broken
 *   Cloudinary config (api_secret mismatch) and missing static-file serving.
 * - Otherwise: sends multipart with other fields.
 */
export const createAdminProduct = async (payload, imageFile = null) => {
  if (imageFile) {
    // Upload to Cloudinary first, then send the URL as a string field in multipart.
    const cloudinaryUrl = await uploadProductImage(imageFile)
    const enriched = { ...payload, imageUrl: cloudinaryUrl }
    return client
      .post(ADMIN_ENDPOINT, buildMultipartBody(enriched, null), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data)
  }
  return client
    .post(ADMIN_ENDPOINT, buildMultipartBody(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}

/**
 * Update an existing product.
 * Same upload strategy as createAdminProduct.
 */
export const updateAdminProduct = async (productId, payload, imageFile = null) => {
  if (imageFile) {
    const cloudinaryUrl = await uploadProductImage(imageFile)
    const enriched = { ...payload, imageUrl: cloudinaryUrl }
    return client
      .put(`${ADMIN_ENDPOINT}/${productId}`, buildMultipartBody(enriched, null), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data)
  }
  return client
    .put(`${ADMIN_ENDPOINT}/${productId}`, buildMultipartBody(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}

export const updateAdminProductStatus = (productId, status) =>
  client.patch(`${ADMIN_ENDPOINT}/${productId}/status`, { status }).then((res) => res.data)

export const deleteAdminProduct = (productId) =>
  client.delete(`${ADMIN_ENDPOINT}/${productId}`).then((res) => res.data)

export const importAdminProducts = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client
    .post(`${ADMIN_ENDPOINT}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}
