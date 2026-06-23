/**
 * Product API — maps to /api/products
 *
 * Backend endpoints:
 *   GET /api/products              → list all products (AllowAnonymous)
 *   GET /api/products/{id}        → single product (AllowAnonymous)
 *   GET /api/products/{id}/alternatives → safe alternatives for a member (AllowAnonymous)
 *
 * Response: ProductDto[]  { productId, productName, unitPrice, status, imageUrl?, productTypeId }
 */

import client from '../../../api/client'

const ENDPOINT = '/products'

export const getProducts = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data)

export const getProduct = (productId) =>
  client.get(`${ENDPOINT}/${productId}`).then((res) => res.data)

export const getAlternatives = (productId, memberId) =>
  client.get(`${ENDPOINT}/${productId}/alternatives`, {
    params: memberId ? { memberId } : {},
  }).then((res) => res.data)
