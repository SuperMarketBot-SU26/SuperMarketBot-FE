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
    // Use allSettled so a failure on the map (e.g. no MAP row for floorId=1
    // on Azure) doesn't wipe the routes out. The panel's RouteList only needs
    // the route list, so load it independently and let the FleetMap show its
    // own empty-state when the map is missing.
    const [mapResult, routeResult] = await Promise.allSettled([
      getLatestMap({ floorId: 1 }),
      getRoutes({ mapId }),
    ])
    if (mapResult.status === 'fulfilled') setMap(mapResult.value)
    else setMap(null)

    if (routeResult.status === 'fulfilled') setRoutes(routeResult.value ?? [])
    else setRoutes([])

    if (mapResult.status === 'rejected' && routeResult.status === 'rejected') {
      setError(mapResult.reason?.message ?? 'Failed to load map/routes')
    } else {
      setError(null)
    }
    setLoading(false)
  }, [mapId])

  useEffect(() => {
    load()
  }, [load])

  return { map, routes, loading, error, refresh: load }
}
