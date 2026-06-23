import Button from '../../../components/ui/Button'
import { ProductCard } from '..'

export function ProductAlternativesList({ alternatives, loading, onProductClick }) {
  return (
    <div className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-xl text-smb-primary-container">
          swap_horiz
        </span>
        <div>
          <h3 className="text-sm font-semibold text-smb-on-surface">Sản Phẩm Thay Thế An Toàn</h3>
          <p className="text-xs text-smb-on-surface-variant">
            Các sản phẩm cùng loại, cùng phân khúc giá và không chứa thành phần dị ứng
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <span className="material-symbols-outlined animate-spin text-xl text-smb-on-surface-variant">
            progress_activity
          </span>
          <span className="text-sm text-smb-on-surface-variant">
            Đang tải sản phẩm thay thế...
          </span>
        </div>
      ) : alternatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-lg border border-dashed border-smb-outline-variant">
          <span className="material-symbols-outlined text-3xl text-smb-on-surface-variant">
            help
          </span>
          <p className="text-sm text-smb-on-surface-variant">
            Không tìm thấy sản phẩm thay thế phù hợp.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alternatives.map((alt) => (
            <ProductCard
              key={alt.productId}
              product={alt}
              onClick={() => onProductClick(alt.productId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
