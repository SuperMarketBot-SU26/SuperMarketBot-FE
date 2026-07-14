/**
 * Aisles API — /api/v1/aisles and /api/v1/aisles/density
 *
 * AisleDto:        { aisleId, zoneId, aisleCode, aisleName? }
 * AisleDensityDto: { aisleId, aisleCode, aisleName?, latestScanId?,
 *                    scannedAt?, densityPercentage, emptyPercentage,
 *                    needsRestock, imageUrl?, densityColor }
 *
 * The density endpoint returns both the numeric percentages and a precomputed
 * `densityColor` (green/yellow/red) the FE can render directly — useful for
 * drawing shelf fill-state on the map without recomputing thresholds.
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/aisles'

/**
 * List aisles (optionally filtered by zone).
 *
 * @param {{ zoneId?: number }} params
 */
export const getAisles = async ({ zoneId } = {}) => {
  try {
    const res = await client.get(ENDPOINT, {
      params: zoneId != null ? { zoneId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/**
 * Fetch the latest density per aisle (from the most recent AisleScan).
 * `densityColor` is one of 'green' | 'yellow' | 'red'.
 *
 * @param {{ zoneId?: number }} params
 */
export const getAisleDensities = async ({ zoneId } = {}) => {
  try {
    const res = await client.get(`${ENDPOINT}/density`, {
      params: zoneId != null ? { zoneId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}