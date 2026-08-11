/**
 * Shelves API — /api/v1/shelves
 *
 * Backend endpoints (ShelvesController.cs):
 *   GET    /api/v1/shelves?aisleId=         → ShelfDto[] (list shelves, optionally filtered)
 *   GET    /api/v1/shelves/{shelfId}       → ShelfDto (single shelf detail)
 *   POST   /api/v1/shelves                 → create
 *   PUT    /api/v1/shelves/{shelfId}       → update
 *   DELETE /api/v1/shelves/{shelfId}       → delete
 *
 * ShelfDto:        { shelfId, aisleId, shelfName, shelfCode?, capacity?, description? }
 * CreateShelfRequestDto: { aisleId, shelfName, shelfCode?, capacity?, description? }
 * UpdateShelfRequestDto: { shelfName?, shelfCode?, capacity?, description? }
 *
 * Note: hierarchy traversal (zone → aisle → shelf → slot) is exposed via
 *       zonesApi.getZoneHierarchy(floorId) — prefer that for tree views.
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/shelves'

export const getShelves = async ({ aisleId } = {}) => {
  const res = await client.get(ENDPOINT, {
    params: aisleId != null ? { aisleId } : {},
  })
  return Array.isArray(res.data) ? res.data : []
}

export const getShelf = async (shelfId) => {
  const res = await client.get(`${ENDPOINT}/${shelfId}`)
  return res.data
}

export const createShelf = async (payload) => {
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

export const updateShelf = async (shelfId, payload) => {
  const res = await client.put(`${ENDPOINT}/${shelfId}`, payload)
  return res.data
}

export const deleteShelf = async (shelfId) => {
  const res = await client.delete(`${ENDPOINT}/${shelfId}`)
  return res.data ?? { success: true }
}
