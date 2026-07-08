/**
 * Robot Routes API — /api/v1/routes
 *
 * Backend endpoints (RobotRoutesController.cs):
 *   GET    /api/v1/routes?mapId=&zoneId=&routeType=        → IReadOnlyList<RobotRouteListDto>
 *   GET    /api/v1/routes/{routeId}                         → RobotRouteDetailDto (with Waypoints)
 *   POST   /api/v1/routes                                   → create new route
 *   PUT    /api/v1/routes/{routeId}                         → update route (overwrite waypoints)
 *   DELETE /api/v1/routes/{routeId}                         → delete route
 *
 * RobotRouteCreateDto:   { mapId, robotId, routeName, routeType, description?, zoneId?, nodeIds: number[] }
 * RobotRouteUpdateDto:   { routeName, routeType, description?, zoneId?, nodeIds: number[] }  (no robotId)
 *
 * Note: route↔robot assignment (POST /routes/{id}/assign) does NOT exist on the BE.
 * Until that endpoint lands, the UI must not display assigned-robot state for routes.
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/routes'

export const getRoutes = async ({ mapId, zoneId, routeType } = {}) => {
  const res = await client.get(ENDPOINT, {
    params: { mapId, zoneId, routeType },
  })
  return res.data ?? []
}

export const getRoute = async (routeId) => {
  const res = await client.get(`${ENDPOINT}/${routeId}`)
  return res.data
}

export const createRoute = async (payload) => {
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

export const updateRoute = async (routeId, payload) => {
  const res = await client.put(`${ENDPOINT}/${routeId}`, payload)
  return res.data
}

export const deleteRoute = async (routeId) => {
  const res = await client.delete(`${ENDPOINT}/${routeId}`)
  return res.status === 204
}