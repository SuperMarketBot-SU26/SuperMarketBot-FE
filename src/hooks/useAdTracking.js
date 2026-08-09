/**
 * useAdTracking — fire-and-forget tracking calls for ad banners.
 *
 * Wraps `trackImpression` / `trackClick` so:
 *   - Errors never block the UI (catch + console.warn only).
 *   - Impression is debounced per (campaignId, memberId) to avoid spam
 *     (banner on screen for 30s shouldn't fire 30 impressions).
 *   - Click is always sent (1 click = 1 event, no debounce).
 *
 * Usage:
 *   const { trackView, trackClick } = useAdTracking()
 *   useEffect(() => { trackView(campaignId, { zoneId, productId }) }, [campaignId])
 *   <button onClick={() => trackClick(campaignId, { zoneId, productId })}>Mua ngay</button>
 */

import { useCallback, useRef } from 'react'
import { trackImpression, trackClick } from '../features/advertisement/api/adCampaignApi'

// Default dedupe window: same (campaign, member) won't re-fire impression
// within this many ms. Override via hook arg if needed.
const DEFAULT_DEBOUNCE_MS = 30_000

export function useAdTracking({
  memberId = null,
  zoneId = null,
  productId = null,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onError = null,
} = {}) {
  // Track last impression time per campaignId so we don't spam
  const lastImpressionAt = useRef(new Map())

  // Build the payload once, reuse for both call types
  const buildPayload = useCallback(
    (extra = {}) => ({
      memberId,
      zoneId,
      productId,
      ...extra,
    }),
    [memberId, zoneId, productId]
  )

  const trackView = useCallback(
    async (campaignId, extra = {}) => {
      if (!campaignId) return
      const now = Date.now()
      const last = lastImpressionAt.current.get(campaignId) || 0
      if (now - last < debounceMs) return // skip, too soon
      lastImpressionAt.current.set(campaignId, now)

      try {
        await trackImpression(campaignId, buildPayload(extra))
      } catch (err) {
        if (onError) onError(err, 'impression')
        else if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[ad-tracking] impression failed', err)
        }
      }
    },
    [buildPayload, debounceMs, onError]
  )

  const trackClick = useCallback(
    async (campaignId, extra = {}) => {
      if (!campaignId) return
      try {
        await trackClick(campaignId, buildPayload(extra))
      } catch (err) {
        if (onError) onError(err, 'click')
        else if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[ad-tracking] click failed', err)
        }
      }
    },
    [buildPayload, onError]
  )

  return { trackView, trackClick }
}

export default useAdTracking
