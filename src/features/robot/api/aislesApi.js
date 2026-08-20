/**
 * Aisles API — /api/v1/aisles
 *
 * Backend endpoints (ZonesController.cs):
 *   GET    /api/v1/aisles?zoneId=         → AisleDto[] (flat list)
 *   GET    /api/v1/aisles/{aisleId}       → AisleDetailDto (with shelves)
 *   POST   /api/v1/aisles                 → create
 *   PUT    /api/v1/aisles/{aisleId}       → update
 *   DELETE /api/v1/aisles/{aisleId}       → delete (cascade shelves/slots)
 *   GET    /api/v1/aisles/density?zoneId= → AisleDensityDto[]
 *
 * AisleDto:        { aisleId, zoneId, aisleCode, aisleName? }
 * AisleDensityDto: { aisleId, aisleCode, aisleName?, latestScanId?,
 *                    scannedAt?, densityPercentage, emptyPercentage,
 *                    needsRestock, imageUrl?, densityColor }
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/aisles'

/**
 * List aisles (optionally filtered by zone).
 * @param {{ zoneId?: number }} params
 */
export const getAisles = async ({ zoneId } = {}) => {
  try {
    const res = await client.get(ENDPOINT, {
      params: zoneId != null ? { zoneId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/** Lấy Aisle theo ID kèm danh sách Shelves. */
export const getAisle = async (aisleId) => {
  const res = await client.get(`${ENDPOINT}/${aisleId}`)
  return res.data
}

/** Tạo Aisle mới. @param {{ zoneId: number, aisleCode: string, aisleName?: string }} payload */
export const createAisle = async (payload) => {
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

/** Cập nhật Aisle. @param {{ aisleCode?: string, aisleName?: string }} payload */
export const updateAisle = async (aisleId, payload) => {
  const res = await client.put(`${ENDPOINT}/${aisleId}`, payload)
  return res.data
}

/** Xóa Aisle (cascade xóa tất cả Shelves/Slots bên trong). */
export const deleteAisle = async (aisleId) => {
  const res = await client.delete(`${ENDPOINT}/${aisleId}`)
  return res.data ?? { success: true }
}

/**
 * Fetch the latest density per aisle (from the most recent AisleScan).
 * `densityColor` is one of 'green' | 'yellow' | 'red'.
 * @param {{ zoneId?: number }} params
 */
export const getAisleDensities = async ({ zoneId } = {}) => {
  try {
    const res = await client.get(`${ENDPOINT}/density`, {
      params: zoneId != null ? { zoneId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}