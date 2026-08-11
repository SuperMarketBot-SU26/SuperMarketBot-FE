import { useEffect, useState, useCallback } from 'react'
import { getRobots, getRobotPose } from '../api/navigationApi'

/**
 * useRobotFleet
 *
 * Loads /api/Robots on mount and polls /api/Robots/{code}/pose every `pollMs`
 * to keep robot markers fresh on the map.
 *
 * When the SignalR / MQTT bridge is wired up, replace the polling with a
 * subscription — everything downstream reads `robots`, `poses`, and `refresh()`.
 *
 * RobotPoseDto shape (from BE):
 *   { robotCode, xCoord, yCoord, headingYawDeg, lastUpdatedAt }
 *
 * Returns: { robots, poses, loading, error, refresh, tick }
 */
export function useRobotFleet({ pollMs = 5000 } = {}) {
  const [robots, setRobots] = useState([])
  const [poses, setPoses] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  const loadAll = useCallback(async () => {
    try {
      const list = await getRobots()
      setRobots(Array.isArray(list) ? list : [])

      // Fetch pose for each robot in parallel; gracefully skip failures.
      const posePairs = await Promise.allSettled(
        (list ?? []).map(async (r) => {
          const pose = await getRobotPose(r.robotCode)
          return [r.robotCode, pose]
        })
      )
      const poseMap = {}
      for (const result of posePairs) {
        if (result.status === 'fulfilled') {
          const [code, pose] = result.value
          if (pose) poseMap[code] = pose
        }
      }
      setPoses(poseMap)
      setError(null)
    } catch (err) {
      setError(err?.message ?? 'Failed to load robots')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Periodic pose refresh
  useEffect(() => {
    if (pollMs <= 0) return undefined
    const id = setInterval(async () => {
      const codes = Object.keys(poses)
      if (codes.length === 0) return

      const results = await Promise.allSettled(
        codes.map(async (c) => {
          const pose = await getRobotPose(c)
          return [c, pose]
        })
      )
      setPoses((prev) => {
        const next = { ...prev }
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const [code, pose] = result.value
            if (pose) next[code] = pose
          }
        }
        return next
      })
      setTick((n) => n + 1)
    }, pollMs)
    return () => clearInterval(id)
  }, [pollMs, poses])

  return { robots, poses, loading, error, refresh: loadAll, tick }
}
