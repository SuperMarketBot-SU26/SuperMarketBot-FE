/**
 * Zones API — /api/v1/zones
 *
 * Returns the list of zones for a given floor. Used by the route-creation form
 * to populate the zone dropdown — previously the FE had to derive zones from
 * existing routes' zoneId/zoneName, which gave an empty list until at least one
 * route had been created.
 *
 * ZoneDto: { zoneId, floorId, zoneName?, description? }
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/zones'

/**
 * Fetch zones for a floor. Returns [] on error or empty result.
 *
 * @param {{ floorId?: number }} params
 */
export const getZones = async ({ floorId } = {}) => {
  try {
    const res = await client.get(ENDPOINT, {
      params: floorId != null ? { floorId } : {},
    })
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}