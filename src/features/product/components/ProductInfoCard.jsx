import { formatVND, statusLabel } from '..'
import { ProductImage, ProductStatusBadge } from '..'

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-smb-outline-variant/50 py-3 last:border-0">
      <span className="text-sm text-smb-on-surface-variant">{label}</span>
      <span className="text-sm font-medium text-smb-on-surface">{value}</span>
    </div>
  )
}

export function ProductInfoCard({ product }) {
  return (
    <div className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest overflow-hidden">
      {/* Image header */}
      <div className="relative h-48 bg-smb-surface-container flex items-center justify-center overflow-hidden">
        <ProductImage
          src={product?.imageUrl}
          alt={product?.productName}
          className="h-full w-full object-contain p-4"
        />
        <div className="absolute right-4 top-4">
          <ProductStatusBadge status={product?.status} />
        </div>
      </div>

      {/* Product info */}
      <div className="px-6 py-5 space-y-1">
        <h2 className="text-xl font-semibold text-smb-on-surface">
          {product?.productName}
        </h2>
        <div className="mt-1 rounded-lg bg-smb-surface-container px-4 py-3 space-y-0">
          <InfoRow label="Mã sản phẩm" value={`#${product?.productId}`} />
          <InfoRow
            label="Giá bán"
            value={`${formatVND(product?.unitPrice)} đ`}
          />
          <InfoRow label="Loại sản phẩm" value={`#${product?.productTypeId}`} />
          <InfoRow label="Trạng thái" value={statusLabel(product?.status)} />
        </div>
      </div>
    </div>
  )
}
