/**
 * Robot API — /api/Robots
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
 */

import client from '../../../api/client'

const ENDPOINT = '/Robots'

export const getRobots = async () => {
  const res = await client.get(ENDPOINT)
  return res.data
}

export const getRobotStatusValues = async () => {
  const res = await client.get(`${ENDPOINT}/status-values`)
  return res.data
}

export const getRobotPose = async (robotCode) => {
  const res = await client.get(`${ENDPOINT}/${encodeURIComponent(robotCode)}/pose`)
  return res.data
}

export const publishRobotCommand = async (payload) => {
  const res = await client.post(`${ENDPOINT}/command`, payload)
  return res.data
}

export const navigateRobot = async (payload) => {
  const res = await client.post(`${ENDPOINT}/navigate`, payload)
  return res.data
}

export const updateRobotStatus = async (robotCode, payload) => {
  const res = await client.post(
    `${ENDPOINT}/${encodeURIComponent(robotCode)}/status`,
    payload
  )
  return res.data
}

/**
 * Fetch a single robot by code.
 * The BE has no `GET /Robots/{code}` endpoint, so we fetch the full list
 * and find the match.  Returns null if the robot is not found.
 */
export const getRobot = async (robotCode) => {
  const robots = await getRobots()
  return robots.find((r) => r.robotCode === robotCode) ?? null
}