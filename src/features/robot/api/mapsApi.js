/**
 * Maps API — /api/v1/maps
 *
 * Backend endpoints (MapsController.cs):
 *   GET    /api/v1/maps/latest?floorId=        → MapFloorplanDto (nodes/edges/semantic objects + floorplan image)
 *   GET    /api/v1/maps/active?floorId=        → MapFloorplanDto (the canonical active map)
 *   GET    /api/v1/maps?floorId=               → MapSummaryDto[] (all map versions for a floor)
 *   GET    /api/v1/maps/{mapId}               → MapFloorplanDto (single map detail)
 *   POST   /api/v1/maps/sync                   → push full canvas state to DB (upsert nodes/edges/objects)
 *   POST   /api/v1/maps/{mapId}/set-active     → mark map as canonical for its floor
 *   POST   /api/v1/maps/{mapId}/upload-image   → multipart upload floorplan image
 *   POST   /api/v1/maps/upload-slam-bundle     → SLAM bundle (yaml + pgm → auto-convert + import waypoints)
 *   POST   /api/v1/maps/seed/{mapId}?floorId=  → seed a blank map skeleton
 *   GET    /api/v1/maps/stats?floorId=        → MapSyncStatsDto
 *
 * MapFloorplanDto:
 *   { mapId, floorId, mapName, createdAt, floorplanImageUrl,
 *     widthMeters, heightMeters, resolution, originX, originY, originYaw, isActive,
 *     nodes[], edges[], semanticObjects[] }
 *
 * MapSyncRequestDto (POST /maps/sync):
 *   { floorId, mapName?, mapData?, widthMeters, heightMeters, resolution?,
 *     originX?, originY?, originYaw?, isActive?,
 *     nodes[], edges[], semanticObjects[] }
 *
 * MapSyncResultDto:
 *   { mapId, nodesCreated, nodesUpdated, nodesDeleted,
 *     edgesCreated, edgesUpdated, edgesDeleted,
 *     semanticObjectsCreated, semanticObjectsUpdated, semanticObjectsDeleted,
 *     message }
 *
 * Notes:
 *   - `getMaps` (all versions) is useful for the map-version dropdown in the editor.
 *   - For Zone / Aisle / RouteType lookup use the dedicated API modules:
 *       ../robot/api/zonesApi.js      → /api/v1/zones
 *       ../robot/api/aislesApi.js     → /api/v1/aisles, /api/v1/aisles/density
 *       ../robot/api/routeTypesApi.js → /api/v1/routes/types
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/maps'

/**
 * Get the latest (most recently saved) map version for a floor.
 * Used by the editor to pre-populate the canvas.
 */
export const getLatestMap = async ({ floorId } = {}) => {
  const res = await client.get(`${ENDPOINT}/latest`, { params: { floorId } })
  return res.data
}

/**
 * Get the canonical active map for a floor (the one robots actually use).
 */
export const getActiveMap = async ({ floorId } = {}) => {
  const res = await client.get(`${ENDPOINT}/active`, { params: { floorId } })
  return res.data
}

/**
 * Sync the full canvas state to the server.
 * Performs upsert on nodes, edges, and semanticObjects (by their IDs).
 * Returns counts of created/updated/deleted entities.
 *
 * @param {Object} payload — MapSyncRequestDto
 */
export const syncMap = async (payload) => {
  const res = await client.post(`${ENDPOINT}/sync`, payload)
  return res.data
}

/**
 * Upload a full SLAM bundle exported from the robot.
 * BE auto-converts PGM→PNG and imports waypoints from the yaml.
 *
 * @param {FormData} bundle — prepared with mapYaml, mapImage, (optional) mapData, posegraph, waypoints
 * @returns {Promise<{ mapId, message }>}
 */
export const uploadSlamBundle = async (bundle) => {
  // Override instance's `application/json` default. Axios appends boundary.
  const res = await client.post(`${ENDPOINT}/upload-slam-bundle`, bundle, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/**
 * List all map versions for a floor (useful for the version-selector dropdown).
 */
export const getMaps = async ({ floorId } = {}) => {
  const res = await client.get(ENDPOINT, {
    params: floorId != null ? { floorId } : {},
  })
  return res.data ?? []
}

/**
 * Get a single map by ID (full detail with nodes/edges/semanticObjects).
 */
export const getMap = async (mapId) => {
  const res = await client.get(`${ENDPOINT}/${mapId}`)
  return res.data
}

/**
 * Mark a specific map version as the canonical active map for its floor.
 */
export const setActiveMap = async (mapId) => {
  const res = await client.post(`${ENDPOINT}/${mapId}/set-active`)
  return res.data
}

/**
 * Upload a floorplan background image for a map.
 * Accepts .png / .jpg via multipart/form-data.
 *
 * @param {number} mapId
 * @param {File} file
 * @returns {Promise<{ mapId, imageUrl, message }>}
 */
export const uploadFloorplanImage = async (mapId, file) => {
  const form = new FormData()
  form.append('file', file)
  // Override the axios instance's `application/json` default so ASP.NET
  // accepts multipart. Axios appends the `boundary=...` fragment automatically.
  const res = await client.post(`${ENDPOINT}/${mapId}/upload-image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/**
 * Seed a blank map skeleton for a floor.
 */
export const seedMap = async (mapId, { floorId } = {}) => {
  const res = await client.post(`${ENDPOINT}/seed/${mapId}`, null, {
    params: { floorId },
  })
  return res.data
}

/**
 * Get map sync statistics (node/edge/object counts).
 */
export const getMapStats = async ({ floorId } = {}) => {
  const res = await client.get(`${ENDPOINT}/stats`, { params: { floorId } })
  return res.data
}