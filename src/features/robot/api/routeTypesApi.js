/**
 * Route Types API — /api/v1/routes/types
 *
 * Returns the canonical list of RouteType strings the BE accepts, with labels
 * and short descriptions. The frontend should render this as a dropdown instead
 * of asking the operator to type a raw string.
 *
 * Response shape:
 *   [{ value: 'patrol', label: 'Tuần tra', description: '...' }, ...]
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/routes/types'

/**
 * Fetch the list of valid RouteType values.
 * Returns an empty array on failure so callers don't have to handle null.
 */
export const getRouteTypes = async () => {
  try {
    const res = await client.get(ENDPOINT)
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}