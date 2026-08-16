import { useState, useEffect } from 'react'
import { getRobotMissionState } from '../api/navigationApi'

export function useActiveMission(robotCode, pollMs = 5000) {
  const [missionState, setMissionState] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!robotCode) {
      setMissionState(null)
      return
    }

    let isMounted = true
    const fetchMission = async () => {
      try {
        setLoading(true)
        const data = await getRobotMissionState(robotCode)
        if (isMounted) setMissionState(data)
      } catch (err) {
        console.error('Failed to fetch mission state:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMission()
    const interval = setInterval(fetchMission, pollMs)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [robotCode, pollMs])

  return { missionState, loading }
}
