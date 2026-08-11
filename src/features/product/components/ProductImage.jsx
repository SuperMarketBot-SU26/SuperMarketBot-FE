import { buildImageUrl } from '../../../utils/cloudinary'

export function ProductImage({ src, alt, className = '', crop = 'fill' }) {
  const finalSrc = buildImageUrl(src, {
    width: 480,
    height: 480,
    crop,
    quality: 'auto',
    format: 'auto',
  })
  if (finalSrc) {
    return (
      <img
        src={finalSrc}
        alt={alt}
        className={className}
        loading="lazy"
        onError={(e) => {
          // Retry once after 2s in case of transient timeout
          if (!e.currentTarget.dataset.retried) {
            e.currentTarget.dataset.retried = '1'
            setTimeout(() => { e.currentTarget.src = finalSrc }, 2000)
            return
          }
          e.currentTarget.onerror = null
          e.currentTarget.src = '/placeholder-needs-reupload.png'
        }}
      />
    )
  }
  return (
    <div className={`flex items-center justify-center bg-smb-surface-container ${className}`}>
      <span className="material-symbols-outlined text-[20px] text-smb-on-surface-variant">
        inventory_2
      </span>
    </div>
  )
}
