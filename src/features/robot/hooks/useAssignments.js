import { useCallback, useMemo, useState } from 'react'

/**
 * useAssignments
 * Route-centric holder for robot ↔ route assignments while the BE wiring
 * for the assign endpoint is pending. The real implementation will call
 * `POST /v1/routes/{id}/assign` (or similar) through `robotRoutesApi.assignRouteToRobot`.
 *
 * Storage shape: { [routeId]: Set<robotCode> }
 *
 * Returns:
 *   - assignments          : routeId → Set<robotCode>
 *   - robotsForRoute(id)   : Set<robotCode> assigned to a route
 *   - routesForRobot(code) : routeIds assigned to a robot
 *   - getAssignedRoute(code, routes)
 *   - assignRobot(routeId, robotCode)
 *   - unassignRobot(routeId, robotCode)
 *   - toggleRobot(routeId, robotCode)
 *
 * `initial` accepts the legacy { [robotCode]: routeId } shape (or the new
 * route-centric shape) and migrates it on first read.
 */
function normalize(initial) {
  if (!initial) return {}
  // Already route-centric: values are Sets/arrays.
  const looksRouteCentric =
    Object.values(initial).every((v) => v instanceof Set || Array.isArray(v))
  if (looksRouteCentric) {
    const out = {}
    for (const [k, v] of Object.entries(initial)) out[k] = new Set(v)
    return out
  }
  // Legacy robot-centric → route-centric.
  const out = {}
  for (const [robotCode, routeId] of Object.entries(initial)) {
    if (routeId == null) continue
    if (!out[routeId]) out[routeId] = new Set()
    out[routeId].add(robotCode)
  }
  return out
}

export function useAssignments(initial = {}) {
  const [assignments, setAssignments] = useState(() => normalize(initial))

  const robotsForRoute = useCallback(
    (routeId) => assignments[routeId] ?? new Set(),
    [assignments]
  )

  const routesForRobot = useMemo(() => {
    const out = new Map()
    for (const [routeId, robots] of Object.entries(assignments)) {
      for (const code of robots) {
        if (!out.has(code)) out.set(code, new Set())
        out.get(code).add(Number(routeId))
      }
    }
    return out
  }, [assignments])

  const getAssignedRoute = useCallback(
    (robotCode, routes) => {
      const ids = routesForRobot.get(robotCode)
      if (!ids || !ids.size) return null
      // First assigned route that still exists in the routes list.
      for (const id of ids) {
        const r = routes.find((x) => x.robotRouteId === id)
        if (r) return r
      }
      return null
    },
    [routesForRobot]
  )

  const assignRobot = useCallback((routeId, robotCode) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(routeId) ?? [])
      set.add(robotCode)
      next.set(routeId, set)
      return Object.fromEntries(next)
    })
  }, [])

  const unassignRobot = useCallback((routeId, robotCode) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(routeId) ?? [])
      set.delete(robotCode)
      if (set.size) next.set(routeId, set)
      else next.delete(routeId)
      return Object.fromEntries(next)
    })
  }, [])

  const toggleRobot = useCallback((routeId, robotCode) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(routeId) ?? [])
      if (set.has(robotCode)) {
        set.delete(robotCode)
      } else {
        set.add(robotCode)
      }
      if (set.size) next.set(routeId, set)
      else next.delete(routeId)
      return Object.fromEntries(next)
    })
  }, [])

  return {
    assignments,
    robotsForRoute,
    routesForRobot,
    getAssignedRoute,
    assignRobot,
    unassignRobot,
    toggleRobot,
  }
}