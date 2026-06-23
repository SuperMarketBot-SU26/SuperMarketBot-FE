import { formatVND, statusLabel } from '..'
import { ProductImage, ProductStatusBadge } from '..'

export function ProductCard({ product, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-smb-outline-variant bg-smb-surface-container p-3 hover:bg-smb-surface-container-low cursor-pointer transition-colors"
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.productName}
        className="size-12 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-smb-on-surface truncate">
          {product.productName}
        </p>
        <p className="text-xs text-smb-on-surface-variant">
          {formatVND(product.unitPrice)} đ · <ProductStatusBadge status={product.status} />
        </p>
      </div>
    </div>
  )
}
