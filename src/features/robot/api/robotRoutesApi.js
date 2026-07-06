/**
 * Robot Routes API — maps to /api/v1/routes
 *
 * Backend endpoints (RobotRoutesController.cs):
 *   GET    /api/v1/routes?mapId=&zoneId=&routeType=        → IReadOnlyList<RobotRouteListDto>
 *   GET    /api/v1/routes/{routeId}                         → RobotRouteDetailDto (kèm Waypoints)
 *   POST   /api/v1/routes                                   → tạo route mới
 *   PUT    /api/v1/routes/{routeId}                         → cập nhật route (ghi đè waypoints)
 *   DELETE /api/v1/routes/{routeId}                         → xóa route
 *
 * RobotRouteCreateDto:
 *   { mapId, robotId, routeName, routeType, description?, zoneId?, nodeIds: number[] }
 *
 * NOTE: All functions below return LOCAL MOCK DATA. Replace bodies with
 * `client.get/post/put/delete(...)` when API integration starts.
 */

import client from '../../../api/client'
import { mockRoutes, mockRouteDetails } from '../utils/mockData'

const ENDPOINT = '/v1/routes'

const USE_MOCK = true

export const getRoutes = async ({ mapId, zoneId, routeType } = {}) => {
  if (USE_MOCK) {
    return mockRoutes.filter((r) => {
      if (mapId && r.mapId !== mapId) return false
      if (zoneId && r.zoneId !== zoneId) return false
      if (routeType && r.routeType !== routeType) return false
      return true
    })
  }
  const res = await client.get(ENDPOINT, {
    params: { mapId, zoneId, routeType },
  })
  return res.data
}

export const getRoute = async (routeId) => {
  if (USE_MOCK) return mockRouteDetails[routeId] ?? mockRoutes.find((r) => r.robotRouteId === routeId) ?? null
  const res = await client.get(`${ENDPOINT}/${routeId}`)
  return res.data
}

export const createRoute = async (payload) => {
  if (USE_MOCK) {
    const newId = Math.max(0, ...Object.keys(mockRouteDetails).map(Number)) + 1
    const created = {
      robotRouteId: newId,
      mapId: payload.mapId,
      routeName: payload.routeName,
      routeType: payload.routeType ?? 'patrol',
      description: payload.description ?? null,
      zoneId: payload.zoneId ?? null,
      zoneName: null,
      robotId: payload.robotId,
      createdAt: new Date().toISOString(),
      waypoints: (payload.nodeIds ?? []).map((id, idx) => ({
        nodeId: id,
        nodeName: `Node ${id}`,
        xCoord: 0,
        yCoord: 0,
        sequenceOrder: idx,
      })),
    }
    mockRouteDetails[newId] = created
    return { robotRouteId: newId, routeName: created.routeName, message: 'Route created (mock).' }
  }
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

export const updateRoute = async (routeId, payload) => {
  if (USE_MOCK) return { robotRouteId: routeId, routeName: payload.routeName, message: 'Route updated (mock).' }
  const res = await client.put(`${ENDPOINT}/${routeId}`, payload)
  return res.data
}

export const deleteRoute = async (routeId) => {
  if (USE_MOCK) return true
  const res = await client.delete(`${ENDPOINT}/${routeId}`)
  return res.status === 204
}

export const assignRouteToRobot = async (routeId, robotCode) => {
  if (USE_MOCK) {
    return { routeId, robotCode, message: `Route ${routeId} assigned to ${robotCode} (mock).` }
  }
  // Backend doesn't currently expose an assign endpoint — this is the contract
  // we expect to call when it lands. Until then, mocks still drive the UX.
  const res = await client.post(`${ENDPOINT}/${routeId}/assign`, { robotCode })
  return res.data
}

export const unassignRouteFromRobot = async (routeId, robotCode) => {
  if (USE_MOCK) {
    return { routeId, robotCode, message: `Route ${routeId} unassigned from ${robotCode} (mock).` }
  }
  const res = await client.post(`${ENDPOINT}/${routeId}/unassign`, { robotCode })
  return res.data
}
