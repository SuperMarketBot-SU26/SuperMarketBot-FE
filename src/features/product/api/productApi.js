/**
 * Product API — maps to /api/products
 *
 * Backend endpoints:
 *   GET /api/products              → list all products (AllowAnonymous)
 *   GET /api/products/{id}        → single product (AllowAnonymous)
 *   GET /api/products/{id}/alternatives → safe alternatives for a member (AllowAnonymous)
 *   GET /api/products/categories   → list of CategoryDto
 *   GET /api/products/subcategories → list of SubcategoryDto
 *   GET /api/products/product-types → list of ProductTypeDto
 *   GET /api/products/health-tags   → list of HealthTagDto
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

/* ------------------------------------------------------------------ */
/*  Reference data (categories, subcategories, product types, …)     */
/*  Used by ProductManagement to populate form dropdowns so the       */
/*  operator never has to type a raw FK id.                            */
/* ------------------------------------------------------------------ */

const safeArray = (data) => (Array.isArray(data) ? data : [])

export const getCategories = () =>
  client.get(`${ENDPOINT}/categories`).then((res) => safeArray(res.data)).catch(() => [])

export const getSubcategories = (params = {}) =>
  client.get(`${ENDPOINT}/subcategories`, { params }).then((res) => safeArray(res.data)).catch(() => [])

export const getProductTypes = (params = {}) =>
  client.get(`${ENDPOINT}/product-types`, { params }).then((res) => safeArray(res.data)).catch(() => [])

export const getHealthTags = () =>
  client.get(`${ENDPOINT}/health-tags`).then((res) => safeArray(res.data)).catch(() => [])
