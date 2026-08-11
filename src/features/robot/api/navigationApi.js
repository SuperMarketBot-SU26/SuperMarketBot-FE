/**
 * Navigation API — /api/v1/navigation
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/navigation'

// 1. Dispatch Autonomous Flow (Ad, Patrol, Guide)
export const dispatchAutonomous = async (payload) => {
  const res = await client.post(`${ENDPOINT}/dispatch-autonomous`, payload)
  return res.data
}

// 2. Direct Node-to-Node Navigation
export const navigate = async (payload) => {
  const res = await client.post(`${ENDPOINT}/navigate`, payload)
  return res.data
}

// 3. Emergency Stop / Cancel
export const cancelNavigation = async (robotCode) => {
  const res = await client.post(`${ENDPOINT}/robots/${robotCode}/cancel`)
  return res.data
}

// 4. Reroute (Block node and calculate new route)
export const reroute = async (payload) => {
  const res = await client.post(`${ENDPOINT}/reroute`, payload)
  return res.data
}

// 5. Unblock nodes
export const unblockNodes = async (payload) => {
  const res = await client.post(`${ENDPOINT}/unblock-nodes`, payload)
  return res.data
}

// 6. Get Route (Mobile style - GET)
export const getRoute = async (params) => {
  const res = await client.get(`${ENDPOINT}/route`, { params })
  return res.data
}

// 7. Plan Route (Dijkstra preview - POST)
export const planRoute = async (payload) => {
  const res = await client.post(`${ENDPOINT}/route`, payload)
  const data = res.data ?? {}
  return {
    totalDistance: data.totalDistance ?? 0,
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
  }
}

// 8. Optimize Shopping Route (TSP)
export const optimizeShoppingRoute = async (payload) => {
  const res = await client.post(`${ENDPOINT}/optimize-shopping-route`, payload)
  return res.data
}

// 9. Sync Standard Zone Names
export const syncStandardZoneNames = async () => {
  const res = await client.post(`${ENDPOINT}/sync-standard-zone-names`)
  return res.data
}