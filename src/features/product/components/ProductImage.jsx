export function ProductImage({ src, alt, className = '' }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
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
