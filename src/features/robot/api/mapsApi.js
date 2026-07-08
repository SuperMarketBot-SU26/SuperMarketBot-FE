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
 *   - `getZones` derives available zones from routes' `zoneId`/`zoneName`
 *     (BE has no dedicated zones endpoint yet). Returns [] when no routes
 *     exist for the requested map — the UI must handle an empty list.
 */

import client from '../../../api/client'
import { getRoutes } from './robotRoutesApi'

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

/**
 * getZones — derive Zone options from existing routes' zoneId/zoneName.
 * The BE doesn't expose a dedicated /zones endpoint yet.
 */
export const getZones = async ({ mapId } = {}) => {
  if (!mapId) return []
  const routes = await getRoutes({ mapId })
  const zones = new Map()
  for (const r of routes ?? []) {
    if (r.zoneId == null) continue
    zones.set(r.zoneId, r.zoneName ?? `Zone #${r.zoneId}`)
  }
  return Array.from(zones, ([zoneId, zoneName]) => ({ zoneId, zoneName }))
}