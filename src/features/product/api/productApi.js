/**
 * Product API — maps to /api/products
 *
 * Backend endpoints (all live under `/api` on the BE; the Vite dev proxy
 * only forwards paths starting with `/api`, `/uploads`, `/storage`,
 * `/hubs`, so the leading `/api` is REQUIRED — otherwise the SPA
 * fallback returns `index.html`, axios resolves with a 200, and the
 * caller silently gets an empty array because the HTML string isn't
 * an Array).
 *
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

const ENDPOINT = '/api/products'

export const getProducts = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data)

export const getProduct = (productId) =>
  client.get(`${ENDPOINT}/${productId}`).then((res) => res.data)

export const getAlternatives = (productId, memberId) =>
  client.get(`${ENDPOINT}/${productId}/alternatives`, {
    params: memberId ? { memberId } : {},
  }).then((res) => res.data)

/**
 * Single-product detail including the HealthTags array (the basic ProductDto
 * doesn't include them). Used by ProductManagement to pre-select the health
 * tags when editing a product.
 *
 * ProductDetailDto: { ProductId, ProductName, UnitPrice, PromotionPrice?,
 *                     Status, ImageUrl?, Description?, ProductTypeId,
 *                     IsOnSale, IsFavorite, HealthTags: HealthTagDto[] }
 */
export const getProductDetail = (productId) =>
  client.get(`${ENDPOINT}/${productId}/detail`).then((res) => res.data)

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

/**
 * Canonical health tags endpoint (BE /api/health-tags).
 * Prefer this over /products/health-tags going forward — it returns the
 * same payload but the route is owned by the HealthTag module on BE.
 */
export const getHealthTagsCanonical = () =>
  client.get('/api/health-tags').then((res) => safeArray(res.data)).catch(() => [])
