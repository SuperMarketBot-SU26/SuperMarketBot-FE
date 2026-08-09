/**
 * useRobotEvent — fire-and-forget POST /api/v1/robot-events
 *
 * Wraps `recordRobotEvent` so failures don't break the UI.
 * Used by:
 *   - The robot fleet (real robots send this on each route pass).
 *   - Admin debug tools (a "Simulate robot pass" button to test logs).
 *
 * Usage:
 *   const { recordEvent, recording } = useRobotEvent()
 *   await recordEvent({ robotId: 1, zoneId: 2, xCoord: 10, yCoord: 20 })
 */

import { useCallback, useState } from 'react'
import { recordRobotEvent } from '../features/advertisement/api/adCampaignApi'

export function useRobotEvent({ onError = null, onSuccess = null } = {}) {
  const [recording, setRecording] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const recordEvent = useCallback(
    async (payload) => {
      if (!payload?.robotId || !payload?.zoneId) {
        const msg = 'recordRobotEvent: robotId and zoneId are required'
        if (import.meta.env.DEV) console.warn('[useRobotEvent]', msg)
        if (onError) onError(new Error(msg))
        return null
      }

      setRecording(true)
      try {
        const data = await recordRobotEvent(payload)
        setLastResult(data)
        if (onSuccess) onSuccess(data)
        return data
      } catch (err) {
        setLastResult({ success: false, error: err?.message || String(err) })
        if (onError) onError(err)
        else if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[useRobotEvent] failed', err)
        }
        return null
      } finally {
        setRecording(false)
      }
    },
    [onError, onSuccess]
  )

  return { recordEvent, recording, lastResult }
}

export default useRobotEvent