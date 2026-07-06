/**
 * Robot API — maps to /api/Robots
 *
 * Backend endpoints (RobotsController.cs):
 *   GET    /api/Robots                            → IReadOnlyList<RobotDto>
 *   GET    /api/Robots/status-values              → ["Power_Off", "Idle", "Moving", "Interacting", "Offline_Charging"]
 *   POST   /api/Robots/command                    → publish MQTT command
 *   POST   /api/Robots/navigate                   → Dijkstra + publish navigate
 *   GET    /api/Robots/{robotCode}/pose           → current pose (x, y, heading)
 *   POST   /api/Robots/{robotCode}/status         → update robot status
 *
 * RobotDto:
 *   { robotId, robotName, robotCode, batteryPct, mode, status, lastSeenAt, ipAddress }
 * RobotPoseDto:
 *   { robotCode, x, y, headingRad, headingDeg, timestampUtc }
 *
 * NOTE: All functions below currently return LOCAL MOCK DATA so the UI renders
 * end-to-end without the backend. Replace the bodies with `client.get(...)`
 * calls when API integration starts.
 */

import client from '../../../api/client'
import { mockRobots, mockRobotPoses } from '../utils/mockData'

const ENDPOINT = '/Robots'

// Toggle this when the backend is reachable. UI stays in mock mode while false.
const USE_MOCK = true

export const getRobots = async () => {
  if (USE_MOCK) return mockRobots
  const res = await client.get(ENDPOINT)
  return res.data
}

export const getRobotStatusValues = async () => {
  if (USE_MOCK) return ['Power_Off', 'Idle', 'Moving', 'Interacting', 'Offline_Charging']
  const res = await client.get(`${ENDPOINT}/status-values`)
  return res.data
}

export const getRobotPose = async (robotCode) => {
  if (USE_MOCK) return mockRobotPoses[robotCode] ?? null
  const res = await client.get(`${ENDPOINT}/${encodeURIComponent(robotCode)}/pose`)
  return res.data
}

export const publishRobotCommand = async (payload) => {
  if (USE_MOCK) return { accepted: true, ...payload }
  const res = await client.post(`${ENDPOINT}/command`, payload)
  return res.data
}

export const navigateRobot = async (payload) => {
  if (USE_MOCK) return { accepted: true, ...payload }
  const res = await client.post(`${ENDPOINT}/navigate`, payload)
  return res.data
}

export const updateRobotStatus = async (robotCode, payload) => {
  if (USE_MOCK) return { robotCode, ...payload }
  const res = await client.post(
    `${ENDPOINT}/${encodeURIComponent(robotCode)}/status`,
    payload
  )
  return res.data
}
