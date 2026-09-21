import { useEffect, useState, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { getRobots, getRobotPose, getRobotMissionState } from '../api/navigationApi'
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
      const robotList = Array.isArray(list) ? list : []

      // Fetch pose and active mission for each robot in parallel; gracefully skip failures.
      const enrichedResults = await Promise.allSettled(
        robotList.map(async (r) => {
          const [pose, mission] = await Promise.all([
            getRobotPose(r.robotCode).catch(() => null),
            getRobotMissionState(r.robotCode).catch(() => null),
          ])
          return {
            robotCode: r.robotCode,
            pose,
            activeFlowType: mission?.flowType ?? r.activeFlowType ?? null,
            activeMissionStatus: mission?.status ?? r.activeMissionStatus ?? null,
            activeMission: mission ?? null,
          }
        })
      )

      const poseMap = {}
      const missionMap = {}
      for (const result of enrichedResults) {
        if (result.status === 'fulfilled') {
          const { robotCode, pose, activeFlowType, activeMissionStatus, activeMission } = result.value
          if (pose) poseMap[robotCode] = pose
          missionMap[robotCode] = { activeFlowType, activeMissionStatus, activeMission }
        }
      }

      setRobots(
        robotList.map((r) => {
          const extra = missionMap[r.robotCode] ?? {}
          return {
            ...r,
            activeFlowType: extra.activeFlowType ?? r.activeFlowType ?? null,
            activeMissionStatus: extra.activeMissionStatus ?? r.activeMissionStatus ?? null,
            activeMission: extra.activeMission ?? null,
          }
        })
      )
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
          x,
          y,
          xCoord: x,
          yCoord: y,
          headingDeg: yaw,
          headingYawDeg: yaw,
          lastUpdatedAt: new Date().toISOString(),
        },
      }))

      const rawBat = telemetry.batteryPercentage ?? telemetry.batteryPct ?? telemetry.battery ?? telemetry.Battery
      const hasBatteryUpdate =
        rawBat !== undefined ||
        telemetry.deviceBattery !== undefined ||
        telemetry.deviceBatteryPct !== undefined ||
        telemetry.espBattery !== undefined ||
        telemetry.espBatteryPct !== undefined ||
        telemetry.deviceIsCharging !== undefined ||
        telemetry.isCharging !== undefined

      if (hasBatteryUpdate) {
        setRobots((prev) =>
          prev.map((r) => {
            const isMatch = r.robotCode === code ||
              (code === 'RB001' && r.robotCode === 'RB0001') ||
              (code === 'RB0001' && r.robotCode === 'RB001')
            if (!isMatch) return r
            const isDevCharging =
              telemetry.deviceIsCharging !== undefined
                ? Boolean(telemetry.deviceIsCharging)
                : telemetry.isCharging !== undefined
                  ? Boolean(telemetry.isCharging)
                  : r.deviceIsCharging

            return {
              ...r,
              batteryPct: rawBat !== undefined ? rawBat : r.batteryPct,
              deviceBatteryPct: telemetry.deviceBattery !== undefined ? telemetry.deviceBattery : (telemetry.deviceBatteryPct !== undefined ? telemetry.deviceBatteryPct : r.deviceBatteryPct),
              deviceIsCharging: isDevCharging,
              espBatteryPct: telemetry.espBattery !== undefined ? telemetry.espBattery : (telemetry.espBatteryPct !== undefined ? telemetry.espBatteryPct : r.espBatteryPct),
              espBatteryVolts: telemetry.espBatteryVolts !== undefined ? telemetry.espBatteryVolts : r.espBatteryVolts,
            }
          })
        )
      }
      setTick((t) => t + 1)
    }

    const handleNavStatus = (statusUpdate) => {
      if (!statusUpdate?.robotCode) return
      const code = statusUpdate.robotCode
      const statusText = statusUpdate.status || statusUpdate.navigationStatus || statusUpdate.navStatus
      const flowType = statusUpdate.flowType || statusUpdate.missionType
      if (statusText || flowType) {
        setRobots((prev) =>
          prev.map((r) => {
            const isMatch =
              r.robotCode === code ||
              (code === 'RB001' && r.robotCode === 'RB0001') ||
              (code === 'RB0001' && r.robotCode === 'RB001')
            if (!isMatch) return r
            return {
              ...r,
              status: statusText || r.status,
              activeMissionStatus: statusText || r.activeMissionStatus,
              activeFlowType: flowType !== undefined ? flowType : r.activeFlowType,
            }
          })
        )
      }
      setTick((t) => t + 1)
    }

    const handleMapLayout = (payload) => {
      window.dispatchEvent(new CustomEvent('mapLayoutUpdated', { detail: payload }))
    }

    connection.on('telemetry', handleTelemetry)
    connection.on('ReceiveTelemetry', handleTelemetry)
    connection.on('navigationStatus', handleNavStatus)
    connection.on('ReceiveNavigationStatus', handleNavStatus)
    connection.on('mapLayoutUpdated', handleMapLayout)
    connection.on('status', () => {})
    connection.on('robotLog', () => {})
    connection.on('zoneEntered', () => {})
    connection.on('slamMapStream', () => {})

    connection.start().catch(() => {
      // Graceful fallback to HTTP polling if WebSocket is blocked
    })

    return () => {
      if (signalrConnectionRef.current) {
        signalrConnectionRef.current.off('telemetry')
        signalrConnectionRef.current.off('ReceiveTelemetry')
        signalrConnectionRef.current.off('navigationStatus')
        signalrConnectionRef.current.off('ReceiveNavigationStatus')
        signalrConnectionRef.current.off('mapLayoutUpdated')
        signalrConnectionRef.current.off('status')
        signalrConnectionRef.current.off('robotLog')
        signalrConnectionRef.current.off('zoneEntered')
        signalrConnectionRef.current.off('slamMapStream')
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
