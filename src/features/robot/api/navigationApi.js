/**
 * Navigation API — /api/Navigation
 *
 * Backend endpoints (NavigationController.cs):
 *   GET  /api/Navigation/route?startX&startY&endObjectId=&endNodeId=
 *   POST /api/Navigation/route                       → Dijkstra (does not send to robot)
 *   POST /api/Navigation/navigate                    → Dijkstra + publish to robot via MQTT
 *   POST /api/Navigation/reroute                     → re-route around new obstacles
 *   POST /api/Navigation/unblock-nodes               → unblock nodes
 *   POST /api/Navigation/optimize-shopping-route     → TSP + Dijkstra + ForbiddenZones
 *   POST /api/Navigation/nodes/{id}/block            → block / unblock a single node
 *
 * RoutePlanRequestDto: { startNodeId, endNodeId }          (no mapId, no robotId)
 * RoutePlanResultDto:  { totalDistance, nodes: [{ nodeId, x, y, distanceFromStart }] }
 */

import client from '../../../api/client'

const ENDPOINT = '/Navigation'

export const planRoute = async ({ startNodeId, endNodeId } = {}) => {
  const res = await client.post(`${ENDPOINT}/route`, { startNodeId, endNodeId })
  // Wire → camelCase JSON. Backend PascalCase fields arrive camelCased.
  const data = res.data ?? {}
  return {
    totalDistance: data.totalDistance ?? 0,
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
  }
}