import { useEffect, useState, useCallback } from 'react'
import { getRobots, getRobotPose } from '../api/robotApi'

/**
 * useRobotFleet
 * - Loads /Robots (mocked) once on mount.
 * - Polls /Robots/{code}/pose every `pollMs` so the map markers stay fresh.
 *   When the BE / SignalR / MQTT bridge is wired up, replace this with a real
 *   subscription; everything downstream reads `robots`, `poses`, and `refresh()`.
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
      setRobots(list ?? [])

      const posePairs = await Promise.all(
        (list ?? []).map(async (r) => {
          try {
            const pose = await getRobotPose(r.robotCode)
            return [r.robotCode, pose]
          } catch {
            return [r.robotCode, null]
          }
        })
      )
      const poseMap = {}
      for (const [code, pose] of posePairs) {
        if (pose) poseMap[code] = pose
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
    const id = setInterval(() => {
      setPoses((prev) => {
        const codes = Object.keys(prev)
        if (codes.length === 0) return prev
        // Re-fetch asynchronously; we set state once results arrive.
        Promise.all(
          codes.map(async (c) => {
            try {
              const p = await getRobotPose(c)
              return [c, p]
            } catch {
              return [c, prev[c]]
            }
          })
        ).then((entries) => {
          setPoses((current) => {
            const next = { ...current }
            for (const [c, p] of entries) if (p) next[c] = p
            return next
          })
          setTick((n) => n + 1)
        })
        return prev
      })
    }, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  return { robots, poses, loading, error, refresh: loadAll, tick }
}
