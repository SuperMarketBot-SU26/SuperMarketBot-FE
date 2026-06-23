import { statusLabel, statusVariantInline } from '..'

export function ProductStatusBadge({ status, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusVariantInline(status)} ${className}`}
    >
      {statusLabel(status)}
    </span>
  )
}
