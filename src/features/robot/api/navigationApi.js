/**
 * Navigation API — maps to /api/Navigation
 *
 * Backend endpoints (NavigationController.cs):
 *   GET  /api/Navigation/route?startX&startY&endObjectId=&endNodeId=
 *   POST /api/Navigation/route                       → Dijkstra (không gửi xuống robot)
 *   POST /api/Navigation/navigate                    → Dijkstra + publish xuống robot
 *   POST /api/Navigation/reroute                     → re-route khi có vùng cấm
 *   POST /api/Navigation/unblock-nodes               → bỏ block nodes
 *   POST /api/Navigation/optimize-shopping-route     → TSP + Dijkstra + ForbiddenZones
 *   POST /api/Navigation/nodes/{id}/block            → block / unblock 1 node
 *
 * NOTE: returns LOCAL MOCK DATA until backend wiring is enabled.
 */

import client from '../../../api/client'

const ENDPOINT = '/Navigation'

const USE_MOCK = true

export const planRoute = async (payload) => {
  if (USE_MOCK) {
    // Pretend the backend returned a 2-stop loop. Real impl will hit Dijkstra.
    return {
      distance: 42.5,
      estimatedSeconds: 180,
      waypoints: (payload.nodeIds ?? []).map((id, idx) => ({
        nodeId: id,
        sequenceOrder: idx,
      })),
    }
  }
  const res = await client.post(`${ENDPOINT}/route`, payload)
  return res.data
}
