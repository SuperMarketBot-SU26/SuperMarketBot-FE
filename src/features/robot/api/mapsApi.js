/**
 * Maps API — maps to /api/v1/maps
 *
 * Backend endpoints (MapsController.cs):
 *   GET    /api/v1/maps/latest?floorId=   → MapFloorplanDto (nodes/edges/semantic objects + ảnh mặt bằng)
 *   GET    /api/v1/maps/stats?floorId=   → MapSyncStatsDto
 *   POST   /api/v1/maps/sync             → đẩy JSON map mới lên DB
 *   POST   /api/v1/maps/{mapId}/upload-image → upload floorplan image
 *
 * MapFloorplanDto:
 *   { mapId, floorId, mapName, createdAt, floorplanImageUrl,
 *     widthMeters, heightMeters, nodes[], edges[], semanticObjects[] }
 *
 * NOTE: returns LOCAL MOCK DATA until backend wiring is enabled.
 */

import client from '../../../api/client'
import { mockMap, mockMapStats, mockRoutes } from '../utils/mockData'

const ENDPOINT = '/v1/maps'

const USE_MOCK = true

export const getLatestMap = async ({ floorId } = {}) => {
  if (USE_MOCK) return mockMap
  const res = await client.get(`${ENDPOINT}/latest`, { params: { floorId } })
  return res.data
}

export const getMapStats = async ({ floorId } = {}) => {
  if (USE_MOCK) return mockMapStats
  const res = await client.get(`${ENDPOINT}/stats`, { params: { floorId } })
  return res.data
}

/**
 * getMaps — flat list of available maps (for the route-creation map dropdown).
 * The current BE only exposes /latest; this is a small projection that the UI
 * uses to populate the dropdown. Replace with a real /maps endpoint later.
 */
export const getMaps = async () => {
  if (USE_MOCK) {
    return [
      {
        mapId: mockMap.mapId,
        floorId: mockMap.floorId,
        mapName: mockMap.mapName,
        widthMeters: mockMap.widthMeters,
        heightMeters: mockMap.heightMeters,
        nodeCount: mockMap.nodes.length,
      },
    ]
  }
  const res = await client.get(ENDPOINT)
  return res.data
}

/**
 * getZones — derive the available Zone options from existing routes
 * (the BE doesn't expose a dedicated zones endpoint yet, and each
 * RouteListDto carries ZoneId/ZoneName). Falls back to a static list
 * if no routes have a zone set.
 */
export const getZones = async ({ mapId } = {}) => {
  if (USE_MOCK) {
    const zones = new Map()
    mockRoutes.forEach((r) => {
      if (mapId && r.mapId !== mapId) return
      if (r.zoneId != null) zones.set(r.zoneId, r.zoneName ?? `Zone #${r.zoneId}`)
    })
    if (!zones.size) {
      return [
        { zoneId: 1, zoneName: 'Khu rau quả' },
        { zoneId: 2, zoneName: 'Khu tạp hóa' },
        { zoneId: 3, zoneName: 'Khu đông lạnh' },
      ]
    }
    return Array.from(zones, ([zoneId, zoneName]) => ({ zoneId, zoneName }))
  }
  const res = await client.get('/v1/zones', { params: { mapId } })
  return res.data
}
