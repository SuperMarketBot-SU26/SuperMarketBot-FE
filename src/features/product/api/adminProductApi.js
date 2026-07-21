/**
 * Admin Product API — maps to /api/v1/admin/products
 *
 * Backend endpoints (Authorize[AdminOrStaff]):
 *   GET    /api/v1/admin/products              → list products
 *   GET    /api/v1/admin/products/{id}        → single product
 *   POST   /api/v1/admin/products              → create (multipart/form-data)
 *   PUT    /api/v1/admin/products/{id}        → update (multipart/form-data)
 *   PATCH  /api/v1/admin/products/{id}/status  → update status only (JSON)
 *   DELETE /api/v1/admin/products/{id}        → soft-delete (sets Status='Inactive')
 *
 * ProductDto: { productId, productName, unitPrice, status, imageUrl?, productTypeId }
 * Create/Update DTOs (sent as form fields, NOT JSON, because Create/Update accept
 * an optional `imageFile` upload). All fields except productTypeId + productName
 * are optional on the wire; the BE will validate.
 */

import client from '../../../api/client'

const ADMIN_ENDPOINT = '/v1/admin/products'
const PUBLIC_ENDPOINT = '/products'

/**
 * List products for the admin table.
 * Uses the public /api/products endpoint because /api/v1/admin/products
 * only exposes CRUD; the same list shape is returned either way and
 * the public route doesn't require admin auth.
 *
 * Response: ProductDto[]  { productId, productName, unitPrice, status, imageUrl?, productTypeId }
 */
export const getAdminProducts = (params = {}) =>
  client.get(PUBLIC_ENDPOINT, { params }).then((res) => res.data)

export const getAdminProduct = (productId) =>
  client.get(`${ADMIN_ENDPOINT}/${productId}`).then((res) => res.data)

/**
 * Build a multipart/form-data body from a payload object + optional imageFile.
 * Scalar fields become string entries; arrays (e.g. healthTagIds) become multiple
 * `healthTagIds` parts with the same name so ASP.NET model binding picks them up.
 */
const buildMultipartBody = (payload, imageFile) => {
  const form = new FormData()
  Object.entries(payload ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((v) => form.append(key, String(v)))
    } else {
      form.append(key, String(value))
    }
  })
  if (imageFile) {
    form.append('imageFile', imageFile)
  }
  return form
}

export const createAdminProduct = (payload, imageFile = null) =>
  client
    .post(ADMIN_ENDPOINT, buildMultipartBody(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)

export const updateAdminProduct = (productId, payload, imageFile = null) =>
  client
    .put(`${ADMIN_ENDPOINT}/${productId}`, buildMultipartBody(payload, imageFile), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)

export const updateAdminProductStatus = (productId, status) =>
  client.patch(`${ADMIN_ENDPOINT}/${productId}/status`, { status }).then((res) => res.data)

export const deleteAdminProduct = (productId) =>
  client.delete(`${ADMIN_ENDPOINT}/${productId}`).then((res) => res.data)
