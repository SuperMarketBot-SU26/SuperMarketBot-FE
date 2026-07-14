/**
 * Maps API — /api/v1/maps
 *
 * Backend endpoints (MapsController.cs):
 *   GET    /api/v1/maps/latest?floorId=   → MapFloorplanDto (nodes/edges/semantic objects + floorplan image)
 *   GET    /api/v1/maps/stats?floorId=   → MapSyncStatsDto
 *   POST   /api/v1/maps/sync             → push new map JSON to DB
 *   POST   /api/v1/maps/{mapId}/upload-image → upload floorplan image
 *
 * MapFloorplanDto:
 *   { mapId, floorId, mapName, createdAt, floorplanImageUrl,
 *     widthMeters, heightMeters, nodes[], edges[], semanticObjects[] }
 *
 * Notes:
 *   - `getMaps` projects the map dropdown from the live `/latest` response.
 *     The BE doesn't expose a separate "list all maps" endpoint.
 *   - For Zone / Aisle / RouteType lookup use the dedicated API modules:
 *       ../robot/api/zonesApi.js      → /api/v1/zones
 *       ../robot/api/aislesApi.js     → /api/v1/aisles, /api/v1/aisles/density
 *       ../robot/api/routeTypesApi.js → /api/v1/routes/types
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/maps'

export const getLatestMap = async ({ floorId } = {}) => {
  const res = await client.get(`${ENDPOINT}/latest`, { params: { floorId } })
  return res.data
}

export const getMapStats = async ({ floorId } = {}) => {
  const res = await client.get(`${ENDPOINT}/stats`, { params: { floorId } })
  return res.data
}

/**
 * getMaps — flat list for the route-creation map dropdown.
 *
 * The BE only exposes `/latest` per floor, so this returns a single-entry
 * projection shaped like a list. If you need multiple maps, the BE has to
 * add a `/maps` listing endpoint.
 */
export const getMaps = async () => {
  const latest = await getLatestMap({ floorId: 1 })
  if (!latest) return []
  return [{
    mapId: latest.mapId,
    floorId: latest.floorId,
    mapName: latest.mapName,
    widthMeters: latest.widthMeters,
    heightMeters: latest.heightMeters,
    nodeCount: latest.nodes?.length ?? 0,
  }]
}