/**
 * Navigation API — /api/v1/navigation & /Navigation & /Robots
 *
 * Backend endpoints:
 *   NavigationController.cs:
 *     GET    /Navigation/route?startX=&startY=&endObjectId=&endNodeId=
 *           → PolylineResultDto { routeNodes[], totalDistance }
 *     POST   /Navigation/route                       → Dijkstra (does not send to robot)
 *     POST   /api/v1/navigation/dispatch-autonomous  → AD / PATROL / GUIDE flow
 *     POST   /api/v1/navigation/navigate             → Dijkstra + publish to robot via MQTT
 *     POST   /api/v1/navigation/reroute              → re-route around obstacles
 *     POST   /api/v1/navigation/unblock-nodes         → clear blocked nodes
 *     POST   /api/v1/navigation/optimize-shopping-route → TSP + Dijkstra + ForbiddenZones
 *     POST   /api/v1/navigation/nodes/{id}/block     → block / unblock a single node
 *     POST   /api/v1/navigation/robots/{robotCode}/cancel → emergency stop
 *
 *   RobotsController.cs:
 *     GET    /Robots/{robotCode}/pose                → RobotPoseDto { robotCode, xCoord, yCoord, headingYawDeg, lastUpdatedAt }
 *     POST   /Robots/command                        → publish MQTT command (MANUAL_TELEOP, etc.)
 *     POST   /Robots/navigate                        → short alias for /Navigation/navigate
 *     POST   /Robots/{robotCode}/status              → update robot status
 *
 * RobotsController.cs (RobotsController — BE vẫn dùng /Robots prefix):
 *   GET    /Robots                            → RobotDto[] { robotId, robotName, robotCode, batteryPct, mode, status, lastSeenAt, ipAddress }
 *   GET    /Robots/status-values             → string[] ["Power_Off","Idle","Moving","Interacting","Offline_Charging"]
 *
 * DispatchAutonomousDto:
 *   { robotCode, flowType: "ad"|"patrol"|"guide", zoneId?, productId?, nodeIds[] }
 *
 * DispatchAutonomousResultDto:
 *   { robotCode, flowType, targetNodeCount, waypoints: [{ nodeId, nodeName, xCoord, yCoord,
 *     headingYawDeg, nodeRole, dwellTimeSeconds, totalPlaylistDurationSeconds,
 *     effectiveDwellTimeSeconds, mustCompletePlaylist, playlist[] }], message }
 *
 * PolylineResultDto (GET /Navigation/route):
 *   { routeNodes: [{ nodeId, xCoord, yCoord, nodeType }], totalDistance }
 *
 * RoutePlanRequestDto: { startNodeId, endNodeId }
 * RoutePlanResultDto:  { totalDistance, nodes: [{ nodeId, xCoord, yCoord }] }
 */

import client from '../../../api/client'

const NAV_ENDPOINT = '/Navigation'
const ROBOTS_ENDPOINT = '/Robots'
const V1_NAV_ENDPOINT = '/api/v1/navigation'

/* ── Polyline routing (web/mobile display) ──────────────────────────────── */

/**
 * Get polyline from (startX, startY) to a product or node.
 * Use for drawing the guide-path polyline on the admin map or mobile app.
 *
 * @param {{ startX: number, startY: number, endObjectId?: number, endNodeId?: number }} params
 */
export const getPolylineRoute = async ({ startX, startY, endObjectId, endNodeId } = {}) => {
  const res = await client.get(`${NAV_ENDPOINT}/route`, {
    params: { startX, startY, endObjectId, endNodeId },
  })
  const data = res.data ?? {}
  return {
    totalDistance: data.totalDistance ?? 0,
    routeNodes: Array.isArray(data.routeNodes) ? data.routeNodes : [],
  }
}

/**
 * Server-side Dijkstra (does NOT publish to robot — use navigateRobot for that).
 *
 * @param {{ startNodeId: number, endNodeId: number }} payload
 */
export const planRoute = async ({ startNodeId, endNodeId } = {}) => {
  const res = await client.post(`${NAV_ENDPOINT}/route`, { startNodeId, endNodeId })
  const data = res.data ?? {}
  return {
    totalDistance: data.totalDistance ?? 0,
    routeNodes: Array.isArray(data.routeNodes) ? data.routeNodes : [],
  }
}

/* ── Autonomous dispatch ─────────────────────────────────────────────────── */

/**
 * Dispatch a robot on an autonomous flow (AD / PATROL / GUIDE).
 * Returns the calculated waypoint list so the UI can show a preview before
 * the robot starts moving.
 *
 * @param {{ robotCode: string, flowType: 'ad'|'patrol'|'guide', zoneId?: number, productId?: number, nodeIds?: number[] }} payload
 */
export const dispatchAutonomous = async (payload) => {
  const res = await client.post(`${V1_NAV_ENDPOINT}/dispatch-autonomous`, payload)
  return res.data
}

/* ── Point-to-point navigate ─────────────────────────────────────────────── */

/**
 * Navigate robot from startNode → endNode.
 * Publishes to the robot via MQTT.
 *
 * @param {{ robotCode: string, startNodeId: number, endNodeId: number }} payload
 */
export const navigateRobot = async ({ robotCode, startNodeId, endNodeId }) => {
  const res = await client.post(`${V1_NAV_ENDPOINT}/navigate`, {
    robotCode,
    startNodeId,
    endNodeId,
  })
  return res.data
}

/**
 * Navigate robot (alias via /Robots/navigate — same behaviour).
 */
export const publishNavigate = async (payload) => {
  const res = await client.post(`${ROBOTS_ENDPOINT}/navigate`, payload)
  return res.data
}

/* ── Emergency stop ─────────────────────────────────────────────────────── */

/**
 * Cancel current navigation / emergency stop.
 *
 * @param {string} robotCode
 */
export const cancelRobotNavigation = async (robotCode) => {
  const res = await client.post(`${V1_NAV_ENDPOINT}/robots/${encodeURIComponent(robotCode)}/cancel`)
  return res.data
}

/* ── Robot pose (real-time) ─────────────────────────────────────────────── */

/**
 * Get robot's current pose (x, y, heading).
 * Used by the map overlay to animate robot icon.
 *
 * @param {string} robotCode
 * @returns {Promise<{ robotCode, xCoord, yCoord, headingYawDeg, lastUpdatedAt }>}
 */
export const getRobotPose = async (robotCode) => {
  const res = await client.get(`${ROBOTS_ENDPOINT}/${encodeURIComponent(robotCode)}/pose`)
  return res.data
}

/* ── Robot list ─────────────────────────────────────────────────────────── */

/**
 * List all robots.
 *
 * @returns {Promise<Array<{ robotId, robotName, robotCode, batteryPct, mode, status, lastSeenAt, ipAddress }>>}
 */
export const getRobots = async () => {
  const res = await client.get(ROBOTS_ENDPOINT)
  return res.data ?? []
}

/**
 * Get valid robot status values.
 *
 * @returns {Promise<string[]>}
 */
export const getRobotStatusValues = async () => {
  const res = await client.get(`${ROBOTS_ENDPOINT}/status-values`)
  return res.data ?? []
}

/* ── Robot command & status ─────────────────────────────────────────────── */

/**
 * Send a raw MQTT command to a robot (MANUAL_TELEOP, custom, etc.).
 *
 * @param {{ robotCode: string, commandType: string, payloadJson?: string }} payload
 */
export const publishRobotCommand = async (payload) => {
  const res = await client.post(`${ROBOTS_ENDPOINT}/command`, payload)
  return res.data
}

/**
 * Update a robot's operational status.
 *
 * @param {string} robotCode
 * @param {{ status: string }} payload — valid values: "Power_Off" | "Idle" | "Moving" | "Interacting" | "Offline_Charging"
 */
export const updateRobotStatus = async (robotCode, payload) => {
  const res = await client.post(
    `${ROBOTS_ENDPOINT}/${encodeURIComponent(robotCode)}/status`,
    payload
  )
  return res.data
}

/* ── Node blocking ──────────────────────────────────────────────────────── */

/**
 * Block or unblock a single node (e.g., obstacle detected).
 *
 * @param {number} nodeId
 * @param {{ blocked: boolean }} payload
 */
export const setNodeBlocked = async (nodeId, { blocked } = {}) => {
  const res = await client.post(`${V1_NAV_ENDPOINT}/nodes/${nodeId}/block`, { blocked })
  return res.data
}

/* ── Impression + cleanup (per-robot tracking) ───────────────────────────── */

/**
 * Record that a robot showed an ad impression to a customer.
 * @param {string} robotCode
 * @param {{ campaignId?: number, productId?: number, memberId?: number }} payload
 */
export const recordRobotImpression = async (robotCode, payload = {}) => {
  const res = await client.post(
    `${ROBOTS_ENDPOINT}/${encodeURIComponent(robotCode)}/impression`,
    payload
  )
  return res.data
}

/**
 * Internal cleanup endpoint — single-robot housekeeping (admin/debug only).
 * @param {{ robotCode: string }} payload
 */
export const cleanupSingleRobot = async (payload) => {
  const res = await client.post(`${ROBOTS_ENDPOINT}/cleanup-single-robot`, payload)
  return res.data
}
