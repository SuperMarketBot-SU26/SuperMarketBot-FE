/**
 * Zones API — /api/v1/zones
 *
 * Backend endpoints (ZonesController.cs):
 *   GET    /api/v1/zones?floorId=                  → ZoneDto[] (flat list)
 *   GET    /api/v1/zones/hierarchy?floorId=         → ZoneHierarchyDto (nested: zones → aisles → shelves → node)
 *   POST   /api/v1/zones/zones/setup-default       → seed 4 default zones for a floor
 *   PUT    /api/v1/zones/aisles/{aisleId}/map-node/{nodeId}  → link aisle to a map node
 *
 * ZoneDto: { zoneId, floorId, zoneName?, description? }
 *
 * ZoneHierarchyDto:
 *   { floorId, zones: [{ zoneId, zoneName, aisles: [{ aisleId, aisleCode, aisleName,
 *     mappedNodeId, mappedNodeName, xCoord, yCoord, shelves: [...] }] }] }
 *
 * Semantic-Objects API — /api/v1/semantic-objects
 *   POST   /api/v1/semantic-objects/{objectId}/assign-product-type
 *     body: { productTypeId: number }
 *   DELETE /api/v1/semantic-objects/{objectId}/assign-product-type
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/zones'

/**
 * Fetch flat zone list for a floor.
 *
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

/**
 * Fetch nested zone→aisle→shelf→node hierarchy.
 * Use this for the admin sidebar tree view and for resolving aisle→node mappings.
 *
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
 * Seed 4 default zones for a floor (Rau củ, Sữa, Hóa Mỹ Phẩm, Khuyến Mãi).
 *
 * @param {{ floorId: number }} params
 */
export const setupDefaultZones = async ({ floorId } = {}) => {
  const res = await client.post(`${ENDPOINT}/zones/setup-default`, { floorId })
  return res.data
}

/**
 * Link an aisle (shelf row) to a specific map waypoint node.
 * Enables the BE to calculate routes to that aisle.
 *
 * @param {number} aisleId
 * @param {number} nodeId
 */
export const mapAisleToNode = async (aisleId, nodeId) => {
  const res = await client.put(`${ENDPOINT}/aisles/${aisleId}/map-node/${nodeId}`)
  return res.data
}

/* -------------------------------------------------------------------------- */
/*  Semantic Objects (shelf / product-type assignment)                         */
/* -------------------------------------------------------------------------- */

const SO_ENDPOINT = '/api/v1/semantic-objects'

/**
 * Assign a product type to a semantic object (shelf on the map).
 *
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
 *
 * @param {number} objectId
 */
export const unassignProductType = async (objectId) => {
  const res = await client.delete(`${SO_ENDPOINT}/${objectId}/assign-product-type`)
  return res.data
}
