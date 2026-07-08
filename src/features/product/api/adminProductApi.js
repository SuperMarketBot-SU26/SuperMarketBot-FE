/**
 * Admin Product API — maps to /api/v1/admin/products
 *
 * Backend endpoints (Authorize[AdminOrStaff]):
 *   GET    /api/v1/admin/products              → list products
 *   GET    /api/v1/admin/products/{id}        → single product
 *   POST   /api/v1/admin/products              → create
 *   PUT    /api/v1/admin/products/{id}        → update
 *   PATCH  /api/v1/admin/products/{id}/status  → update status only
 *   DELETE /api/v1/admin/products/{id}        → soft-delete (sets Status='Inactive')
 *
 * ProductDto: { productId, productName, unitPrice, status, imageUrl?, productTypeId }
 * CreateProductRequestDto: { productTypeId, productName, unitPrice, promotionPrice?,
 *                            imageUrl?, description?, status?, substituteProductId? }
 * UpdateProductRequestDto: same as Create but all fields optional.
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

export const createAdminProduct = (payload) =>
  client.post(ADMIN_ENDPOINT, payload).then((res) => res.data)

export const updateAdminProduct = (productId, payload) =>
  client.put(`${ADMIN_ENDPOINT}/${productId}`, payload).then((res) => res.data)

export const updateAdminProductStatus = (productId, status) =>
  client.patch(`${ADMIN_ENDPOINT}/${productId}/status`, { status }).then((res) => res.data)

export const deleteAdminProduct = (productId) =>
  client.delete(`${ADMIN_ENDPOINT}/${productId}`).then((res) => res.data)
