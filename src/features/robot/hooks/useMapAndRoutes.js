import { useEffect, useState, useCallback } from 'react'
import { getLatestMap } from '../api/mapsApi'
import { getRoutes } from '../api/robotRoutesApi'

/**
 * useMapAndRoutes
 *
 * Two-step load:
 *   1. Fetch the latest floorplan via `/v1/maps/latest?floorId=…`. The BE
 *      decides which `mapId` corresponds to that floor — we used to hardcode
 *      `mapId: 1` which silently produced empty route lists on any floor
 *      whose map happened to have a different PK.
 *   2. Use the `mapId` from step 1 to fetch `/v1/routes?mapId=…`.
 *
 * If step 1 fails (e.g. no map for the requested floor) we still try the
 * routes endpoint with `mapId = null`, so the panel can show routes that
 * belong to other maps instead of pretending nothing exists.
 *
 * Returns: { map, routes, loading, error, refresh }
 */
export function useMapAndRoutes({ floorId = 1, mapId: initialMapId } = {}) {
  const [map, setMap] = useState(null)
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)

    // Step 1 — resolve the actual mapId for this floor.
    let resolvedMap = null
    try {
      resolvedMap = await getLatestMap({ floorId })
      setMap(resolvedMap ?? null)
    } catch (err) {
      setMap(null)
      // Keep the error but still try to load routes below.
      if (!initialMapId) {
        setError(err?.response?.data?.error || err?.message || 'Không tải được bản đồ.')
      }
    }

    // Step 2 — fetch routes for the map we just resolved. Prefer the mapId
    // returned by `/latest`; fall back to any caller-supplied initialMapId.
    const targetMapId = resolvedMap?.mapId ?? initialMapId ?? null
    try {
      const list = await getRoutes({ mapId: targetMapId ?? undefined })
      setRoutes(Array.isArray(list) ? list : [])
      setError(null)
    } catch (err) {
      setRoutes([])
      setError(err?.response?.data?.error || err?.message || 'Không tải được danh sách lộ trình.')
    } finally {
      setLoading(false)
    }
  }, [floorId, initialMapId])

  useEffect(() => {
    load()
  }, [load])

  return { map, routes, loading, error, refresh: load }
}