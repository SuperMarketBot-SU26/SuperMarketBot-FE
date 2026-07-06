import { useEffect, useState, useCallback } from 'react'
import { getLatestMap } from '../api/mapsApi'
import { getRoutes } from '../api/robotRoutesApi'

/**
 * useMapAndRoutes
 * - Loads the latest floor map (`/v1/maps/latest`) and the route library
 *   (`/v1/routes?mapId=…`) for that map.
 * - Returns: { map, routes, loading, error, refresh }
 */
export function useMapAndRoutes({ mapId = 1 } = {}) {
  const [map, setMap] = useState(null)
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [latest, routeList] = await Promise.all([
        getLatestMap({ floorId: 1 }),
        getRoutes({ mapId }),
      ])
      setMap(latest)
      setRoutes(routeList ?? [])
      setError(null)
    } catch (err) {
      setError(err?.message ?? 'Failed to load map/routes')
    } finally {
      setLoading(false)
    }
  }, [mapId])

  useEffect(() => {
    load()
  }, [load])

  return { map, routes, loading, error, refresh: load }
}
