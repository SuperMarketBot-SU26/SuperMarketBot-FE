import { useEffect, useState, useCallback } from 'react'
import { getLatestMap } from '../api/mapsApi'
import { getRoutes, getRoute } from '../api/robotRoutesApi'
import { getRouteTypes } from '../api/routeTypesApi'

/**
 * useMapAndRoutes
 *
 * Two-step load:
 *   1. Fetch the latest floorplan via `/api/v1/maps/latest?floorId=…`. The BE
 *      decides which `mapId` corresponds to that floor.
 *   2. Use the `mapId` from step 1 to fetch all routes for that map.
 *      Each route is enriched with full waypoint details via `GET /v1/routes/:id`
 *      so the map can render polylines with correct route-type colours.
 *   3. Fetch the route-type catalogue from `GET /v1/routes/types` to drive
 *      the map legend (driven by BE data rather than a hardcoded fallback).
 *
 * Returns: { map, routes, routeTypes, loading, error, refresh }
 */
export function useMapAndRoutes({ floorId = 1, mapId: initialMapId } = {}) {
  const [map, setMap] = useState(null)
  const [routes, setRoutes] = useState([])
  const [routeTypes, setRouteTypes] = useState([])
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
      if (!initialMapId) {
        setError(err?.response?.data?.error || err?.message || 'Không tải được bản đồ.')
      }
    }

    const targetMapId = resolvedMap?.mapId ?? initialMapId ?? null

    // Step 2 — fetch the route list, then enrich each route with waypoints.
    try {
      const list = await getRoutes({ mapId: targetMapId ?? undefined })
      const routeList = Array.isArray(list) ? list : []

      // Fetch full waypoint details for every route in parallel.
      // Skip routes with no waypoints (waypointCount === 0) — nothing to draw.
      const detailPromises = routeList
        .filter((r) => r.waypointCount > 0)
        .map((r) => getRoute(r.robotRouteId).catch(() => null))

      const details = await Promise.all(detailPromises)
      const enriched = details.filter(Boolean)
      setRoutes(enriched)
      setError(null)
    } catch (err) {
      setRoutes([])
      setError(err?.response?.data?.error || err?.message || 'Không tải được danh sách lộ trình.')
    }

    // Step 3 — fetch route-type catalogue for the legend.
    try {
      const types = await getRouteTypes()
      setRouteTypes(Array.isArray(types) ? types : [])
    } catch {
      setRouteTypes([])
    }

    setLoading(false)
  }, [floorId, initialMapId])

  useEffect(() => {
    load()
  }, [load])

  return { map, routes, routeTypes, loading, error, refresh: load }
}
