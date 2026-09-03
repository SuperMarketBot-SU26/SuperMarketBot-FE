/**
 * Brand API — maps to /api/v1/brands
 *
 * Backend endpoints:
 *   GET    /api/v1/brands                   → list all brands
 *   GET    /api/v1/brands/{id}             → single brand
 *   POST   /api/v1/brands                   → create
 *   PUT    /api/v1/brands/{id}             → update
 *   DELETE /api/v1/brands/{id}             → delete
 *   POST   /api/v1/brands/{id}/wallet/topup → topup (brand self-service)
 *
 * Create request:  { brandName, description? }
 * Update request:  { brandName, description? }
 * Topup request:   { amount }   (decimal, must be > 0)
 * Topup response:  { brandId, previousBalance, amountAdded, newBalance }
 *
 * List response: BrandDto[]  { brandId, brandName, wallet, description, activeCampaignCount }
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/brands'

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

export const importBrands = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client
    .post(`${ENDPOINT}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => res.data)
}
