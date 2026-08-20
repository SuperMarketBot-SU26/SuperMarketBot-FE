import { useEffect, useState, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { getRobots, getRobotPose } from '../api/navigationApi'
import { ACTIVE_BACKEND_URL } from '../../../api/client'

/**
 * useRobotFleet
 *
 * Loads /api/Robots on mount, connects to SignalR /hubs/robot for sub-second
 * live telemetry & status streaming, and uses graceful fallback polling.
 *
 * RobotPoseDto shape:
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
  const signalrConnectionRef = useRef(null)

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

  // SignalR live real-time connection (/hubs/robot)
  useEffect(() => {
    const hubUrl = import.meta.env.DEV ? '/hubs/robot' : `${ACTIVE_BACKEND_URL}/hubs/robot`
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    signalrConnectionRef.current = connection

    const handleTelemetry = (telemetry) => {
      if (!telemetry?.robotCode) return
      const code = telemetry.robotCode
      const x = telemetry.xCoord ?? telemetry.x ?? 0
      const y = telemetry.yCoord ?? telemetry.y ?? 0
      const yaw = typeof telemetry.headingYawDeg === 'number'
        ? telemetry.headingYawDeg
        : typeof telemetry.yaw === 'number'
          ? (telemetry.yaw * 180) / Math.PI
          : 0

      setPoses((prev) => ({
        ...prev,
        [code]: {
          robotCode: code,
          xCoord: x,
          yCoord: y,
          headingYawDeg: yaw,
          lastUpdatedAt: new Date().toISOString(),
        },
      }))

      if (telemetry.batteryPercentage !== undefined || telemetry.batteryPct !== undefined) {
        const pct = telemetry.batteryPercentage ?? telemetry.batteryPct
        setRobots((prev) =>
          prev.map((r) => (r.robotCode === code ? { ...r, batteryPct: pct } : r))
        )
      }
      setTick((t) => t + 1)
    }

    const handleNavStatus = (statusUpdate) => {
      if (!statusUpdate?.robotCode) return
      const code = statusUpdate.robotCode
      const statusText = statusUpdate.status || statusUpdate.navigationStatus
      if (statusText) {
        setRobots((prev) =>
          prev.map((r) => (r.robotCode === code ? { ...r, status: statusText } : r))
        )
      }
      setTick((t) => t + 1)
    }

    connection.on('ReceiveTelemetry', handleTelemetry)
    connection.on('ReceiveNavigationStatus', handleNavStatus)

    connection.start().catch(() => {
      // Graceful fallback to HTTP polling if WebSocket is blocked
    })

    return () => {
      if (signalrConnectionRef.current) {
        signalrConnectionRef.current.off('ReceiveTelemetry')
        signalrConnectionRef.current.off('ReceiveNavigationStatus')
        signalrConnectionRef.current.stop().catch(() => {})
        signalrConnectionRef.current = null
      }
    }
  }, [])

  // Periodic pose refresh (fallback & sync)
  useEffect(() => {
    if (pollMs <= 0) return undefined
    const id = setInterval(async () => {
      const codes = Object.keys(poses)
      if (codes.length === 0) {
        // Nếu chưa có robot nào, thử tải lại toàn bộ danh sách robot
        loadAll()
        return
      }

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
