/**
 * Targeting lookup API — các endpoint dùng cho wizard tạo mới
 * (campaignId chưa tồn tại, không dùng được /ad-campaigns/{id}/targeting-context).
 *
 * Lookup wrappers:
 *   - GET /v1/zones?floorId=N                  → zone picker
 *   - GET /v1/semantic-objects?floorId=N&type=Shelf
 *   - GET /v1/robot-routes?floorId=N
 */

import client from '../../../api/client'

// ── Zones ──────────────────────────────────────────────────────────────────
// Phản hồi dự kiến: [{ zoneId, zoneName, floorId, floorNumber }, ...]
// Hoặc dạng phân trang: { items: [...] }
const unwrap = (res) => {
  const data = res?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  return []
}

export const getZonesByFloor = (floorId) =>
  client.get('/v1/zones', { params: { floorId } }).then(unwrap)

// ── Shelves (semantic objects of type Shelf) ──────────────────────────────
// Endpoint: GET /v1/semantic-objects?floorId=N&type=Shelf
// Response: [{ objectId, label/name, floorId, x, y, objectType }, ...]
export const getShelvesByFloor = (floorId) =>
  client
    .get('/v1/semantic-objects', { params: { floorId, type: 'Shelf' } })
    .then(unwrap)

// ── Robot routes ──────────────────────────────────────────────────────────
// Endpoint: GET /v1/robot-routes?floorId=N
// Response: [{ robotRouteId, routeName, zoneId, zoneName, waypointCount }, ...]
// Một số BE yêu cầu mapId thay vì floorId — thử map trước, fallback floorId.
export const getRoutesByFloor = async (floorId) => {
  // Discover latest map for this floor (the BE usually indexes routes by map)
  try {
    const mapRes = await client.get('/v1/maps/latest', { params: { floorId } })
    const mapId = mapRes.data?.mapId
    if (mapId) {
      const res = await client.get('/v1/routes', { params: { mapId } })
      const data = res?.data
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    }
  } catch {
    // ignore — try fallback
  }
  const res = await client.get('/v1/robot-routes', { params: { floorId } })
  return unwrap(res)
}

// ── Normalize helpers (BE field names có thể khác nhau) ──────────────────
export const normalizeZone = (z) => ({
  id: z.zoneId ?? z.id,
  name: z.zoneName ?? z.name ?? `Khu vực #${z.zoneId ?? z.id}`,
  floorId: z.floorId,
  floorNumber: z.floorNumber ?? z.floor,
})

export const normalizeShelf = (s) => ({
  id: s.objectId ?? s.semanticObjectId ?? s.id,
  label: s.label ?? s.objectName ?? s.name ?? `Kệ #${s.objectId ?? s.id}`,
  floorId: s.floorId,
  floorNumber: s.floorNumber ?? s.floor,
  x: s.x,
  y: s.y,
  objectType: s.objectType,
})

export const normalizeRoute = (r) => ({
  id: r.robotRouteId ?? r.routeId ?? r.id,
  name: r.routeName ?? r.name ?? `Tuyến #${r.robotRouteId ?? r.id}`,
  zoneId: r.zoneId,
  zoneName: r.zoneName,
  waypointCount: r.waypointCount ?? r.waypoint?.length ?? 0,
})
