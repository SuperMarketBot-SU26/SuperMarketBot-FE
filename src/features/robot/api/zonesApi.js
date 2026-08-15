/**
 * Zones API — /api/v1/zones + /api/v1/floors
 *
 * Backend endpoints (ZonesController.cs):
 *   ── Floor ──
 *   GET    /api/v1/floors                             → FloorDto[]
 *   GET    /api/v1/floors/{floorId}                   → FloorDto
 *   POST   /api/v1/floors                             → create
 *   PUT    /api/v1/floors/{floorId}                   → update
 *   DELETE /api/v1/floors/{floorId}                   → delete
 *   ── Zone ──
 *   GET    /api/v1/zones?floorId=                     → ZoneDto[] (flat list)
 *   GET    /api/v1/zones/{zoneId}                     → ZoneDetailDto (with aisles)
 *   POST   /api/v1/zones                              → create
 *   PUT    /api/v1/zones/{zoneId}                     → update
 *   DELETE /api/v1/zones/{zoneId}                     → delete (cascades aisles/shelves/slots)
 *   GET    /api/v1/zones/hierarchy?floorId=            → ZoneHierarchyDto (nested tree)
 *   POST   /api/v1/zones/zones/setup-default          → seed 4 default zones for a floor
 *   PUT    /api/v1/zones/aisles/{aisleId}/map-node/{nodeId} → link aisle to map node
 *
 * Semantic-Objects API — /api/v1/semantic-objects
 *   POST   /api/v1/semantic-objects/{objectId}/assign-product-type
 *   DELETE /api/v1/semantic-objects/{objectId}/assign-product-type
 */

import client from '../../../api/client'

const FLOOR_ENDPOINT = '/api/v1/floors'
const ENDPOINT = '/api/v1/zones'

/* ========================================================================== */
/*  Floor CRUD                                                                */
/* ========================================================================== */

/** Lấy tất cả Floor. */
export const getFloors = async () => {
  try {
    const res = await client.get(FLOOR_ENDPOINT)
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/** Lấy Floor theo ID. */
export const getFloor = async (floorId) => {
  const res = await client.get(`${FLOOR_ENDPOINT}/${floorId}`)
  return res.data
}

/** Tạo Floor mới. @param {{ floorNumber: number }} payload */
export const createFloor = async (payload) => {
  const res = await client.post(FLOOR_ENDPOINT, payload)
  return res.data
}

/** Cập nhật Floor. */
export const updateFloor = async (floorId, payload) => {
  const res = await client.put(`${FLOOR_ENDPOINT}/${floorId}`, payload)
  return res.data
}

/** Xóa Floor. */
export const deleteFloor = async (floorId) => {
  const res = await client.delete(`${FLOOR_ENDPOINT}/${floorId}`)
  return res.data ?? { success: true }
}

/* ========================================================================== */
/*  Zone CRUD                                                                 */
/* ========================================================================== */

/**
 * Fetch flat zone list for a floor.
 * @param {{ floorId?: number }} params
 */
export const getZones = async ({ floorId } = {}) => {
  try {
    const res = await client.get(ENDPOINT, {
      params: floorId != null ? { floorId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/** Lấy Zone theo ID kèm danh sách Aisles. */
export const getZone = async (zoneId) => {
  const res = await client.get(`${ENDPOINT}/${zoneId}`)
  return res.data
}

/** Tạo Zone mới. @param {{ floorId: number, zoneName: string, description?: string }} payload */
export const createZone = async (payload) => {
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

/** Cập nhật Zone. @param {{ zoneName?: string, description?: string }} payload */
export const updateZone = async (zoneId, payload) => {
  const res = await client.put(`${ENDPOINT}/${zoneId}`, payload)
  return res.data
}

/** Xóa Zone (cascade xóa tất cả Aisles/Shelves/Slots bên trong). */
export const deleteZone = async (zoneId) => {
  const res = await client.delete(`${ENDPOINT}/${zoneId}`)
  return res.data ?? { success: true }
}

/**
 * Fetch nested zone→aisle→shelf→node hierarchy.
 * @param {{ floorId?: number }} params
 */
export const getZoneHierarchy = async ({ floorId } = {}) => {
  try {
    const res = await client.get(`${ENDPOINT}/hierarchy`, {
      params: floorId != null ? { floorId } : {},
    })
    return res.data ?? null
  } catch {
    return null
  }
}

/**
 * Seed 4 default zones for a floor.
 * @param {{ floorId: number }} params
 */
export const setupDefaultZones = async ({ floorId } = {}) => {
  const res = await client.post(`${ENDPOINT}/zones/setup-default`, { floorId })
  return res.data
}

/**
 * Link an aisle to a specific map waypoint node.
 * @param {number} aisleId
 * @param {number} nodeId
 */
export const mapAisleToNode = async (aisleId, nodeId) => {
  const res = await client.put(`${ENDPOINT}/aisles/${aisleId}/map-node/${nodeId}`)
  return res.data
}

/* ========================================================================== */
/*  Semantic Objects (shelf / product-type assignment)                         */
/* ========================================================================== */

const SO_ENDPOINT = '/api/v1/semantic-objects'

/**
 * Assign a product type to a semantic object (shelf on the map).
 * @param {number} objectId
 * @param {number} productTypeId
 */
export const assignProductType = async (objectId, productTypeId) => {
  const res = await client.post(`${SO_ENDPOINT}/${objectId}/assign-product-type`, {
    productTypeId,
  })
  return res.data
}

/**
 * Remove product-type assignment from a semantic object.
 * @param {number} objectId
 */
export const unassignProductType = async (objectId) => {
  const res = await client.delete(`${SO_ENDPOINT}/${objectId}/assign-product-type`)
  return res.data
}

