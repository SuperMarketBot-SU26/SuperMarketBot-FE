/**
 * Brand API — maps to /api/v1/brands
 *
 * Backend endpoints:
 *   GET    /api/v1/brands         → list all brands
 *   GET    /api/v1/brands/{id}   → single brand
 *   POST   /api/v1/brands         → create
 *   PUT    /api/v1/brands/{id}   → update
 *   DELETE /api/v1/brands/{id}   → delete
 *
 * List response: BrandDto[]  { brandId, brandName, wallet, description, activeCampaignCount }
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/brands'

export const getBrands = () =>
  client.get(ENDPOINT).then((res) => res.data)

export const getBrand = (brandId) =>
  client.get(`${ENDPOINT}/${brandId}`).then((res) => res.data)

export const createBrand = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

export const updateBrand = (brandId, payload) =>
  client.put(`${ENDPOINT}/${brandId}`, payload).then((res) => res.data)

export const deleteBrand = (brandId) =>
  client.delete(`${ENDPOINT}/${brandId}`).then((res) => res.data)
