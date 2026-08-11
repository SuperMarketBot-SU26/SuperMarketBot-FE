/**
 * <AdBanner /> — member-facing banner that auto-tracks impression + click.
 *
 * Drop-in component for any member-side page (home, product detail, search).
 * - Fires `trackView` once when the banner becomes visible (debounced).
 * - Fires `trackClick` when user clicks the CTA.
 * - All tracking calls are fire-and-forget; failures don't break the UI.
 *
 * Usage:
 *   <AdBanner
 *     campaignId={17}
 *     zoneId={2}
 *     productId={5}
 *     imageUrl="https://cdn/.../banner.jpg"
 *     ctaText="Mua ngay"
 *     onClick={() => navigate('/products/5')}
 *   />
 *
 * If you don't want navigation, omit `onClick` and the banner will just
 * report the click.
 */

import { useEffect } from 'react'
import useAdTracking from '../../../hooks/useAdTracking'
import { getOriginalImageUrl } from '../../../utils/cloudinary'

export default function AdBanner({
  campaignId,
  zoneId = null,
  productId = null,
  imageUrl,
  title,
  description,
  ctaText = 'Xem chi tiết',
  href,
  onClick,
  className = '',
}) {
  const { trackView, trackClick: track } = useAdTracking({ zoneId, productId })

  // Fire impression once when component mounts (debounced inside hook)
  useEffect(() => {
    if (campaignId) trackView(campaignId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  const handleClick = (e) => {
    if (campaignId) track(campaignId)
    if (onClick) onClick(e)
    if (href && !onClick) window.location.href = href
  }

  return (
    <div
      className={`ad-banner relative overflow-hidden rounded-xl border border-gray-200 bg-linear-to-r from-amber-50 to-orange-50 shadow-sm ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick(e)
        }
      }}
    >
      <div className="flex items-center gap-4 p-4">
        {imageUrl && (
          <img
            src={getOriginalImageUrl(imageUrl)}
            alt={title || 'Quảng cáo'}
            className="h-24 w-24 shrink-0 rounded-lg object-contain"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/placeholder-needs-reupload.png'
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          {title && <h3 className="font-semibold text-gray-900 truncate">{title}</h3>}
          {description && <p className="mt-1 text-sm text-gray-600 line-clamp-2">{description}</p>}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
}
