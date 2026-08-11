/**
 * Ad Routes API — /api/v1/ad-routes
 *
 * Backend endpoints (AdRoutesController.cs):
 *   GET    /api/v1/ad-routes?pageNumber=&pageSize=             → paginated list
 *   GET    /api/v1/ad-routes/{routeId}                        → single route
 *   GET    /api/v1/ad-routes/robot/{robotId}/active           → active route for a robot
 *   POST   /api/v1/ad-routes                                  → create
 *   PUT    /api/v1/ad-routes/{routeId}                        → update
 *   DELETE /api/v1/ad-routes/{routeId}                        → delete
 *   POST   /api/v1/ad-routes/{routeId}/assign/{robotId}       → assign route to a robot
 *
 * CreateAdRouteRequestDto:
 *   { mapId, name, routeType: "AdZone"|"AdShelf"|"AdAutonomous",
 *     robotId?, isLoop?, nodeSequence: [{ nodeCode, orderIndex, dwellSeconds? }] }
 *
 * Note: "AdRoute" is the ad-specific counterpart of "RobotRoute"
 * (which is exposed in ./robotRoutesApi.js → /api/v1/routes).
 * AdRoutes are campaign-scoped / robot-assigned for advertising flows.
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/ad-routes'

export const getAdRoutes = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data ?? [])

export const getAdRoute = (routeId) =>
  client.get(`${ENDPOINT}/${routeId}`).then((res) => res.data)

export const getActiveAdRouteForRobot = (robotId) =>
  client.get(`${ENDPOINT}/robot/${robotId}/active`).then((res) => res.data)

export const createAdRoute = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

export const updateAdRoute = (routeId, payload) =>
  client.put(`${ENDPOINT}/${routeId}`, payload).then((res) => res.data)

export const deleteAdRoute = (routeId) =>
  client.delete(`${ENDPOINT}/${routeId}`).then((res) => res.data ?? { success: true })

/** Assign a route to a specific robot. */
export const assignAdRouteToRobot = (routeId, robotId) =>
  client.post(`${ENDPOINT}/${routeId}/assign/${robotId}`).then((res) => res.data)
