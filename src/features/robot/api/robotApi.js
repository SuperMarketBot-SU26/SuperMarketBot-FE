/**
 * Robot API — /api/Robots
 *
 * NOTE: All robot HTTP calls are now centralised in:
 *   ../navigation/api/navigationApi.js
 *
 * This file re-exports the most commonly used helpers so existing consumers
 * (e.g. useRobotFleet, RobotAssignmentPanel) don't need to update their imports.
 * Import directly from navigationApi.js for new code.
 */

export {
  getRobots,
  getRobotStatusValues,
  getRobotPose,
  publishRobotCommand,
  navigateRobot as navigateRobotViaApi,
  updateRobotStatus,
  cancelRobotNavigation,
  dispatchAutonomous,
  planRoute,
  getPolylineRoute,
  setNodeBlocked,
} from './navigationApi'

/**
 * getRobot — fetch a single robot by code.
 * The BE has no GET /Robots/{code} so we fetch the full list and find the match.
 *
 * @param {string} robotCode
 * @returns {Promise<object|null>}
 */
export const getRobot = async (robotCode) => {
  const robots = await getRobots()
  return robots.find((r) => r.robotCode === robotCode) ?? null
}
