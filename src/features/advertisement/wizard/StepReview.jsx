import React, { useMemo } from 'react'
import Button from '../../../components/ui/Button'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')
const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN')
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between border-b border-smb-outline-variant/40 py-2 text-sm last:border-b-0">
      <span className="text-smb-on-surface-variant">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-smb-on-surface' : 'text-smb-on-surface'}`}>
        {value}
      </span>
    </div>
  )
}

function PricingRow({ icon, label, count, pricePerItem }) {
  const total = (count || 0) * (pricePerItem || 0)
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-2 text-smb-on-surface-variant">
        <Icon name={icon} className="text-[18px] text-smb-primary-container" />
        {label}
      </span>
      <span className="text-smb-on-surface">
        {count} × <strong>{formatVND(pricePerItem)} đ</strong>{' '}
        = <strong className="text-smb-primary-container">{formatVND(total)} đ</strong>
      </span>
    </div>
  )
}

export function StepReview({ state, brandOptions, selectedPackage, effectiveTargeting, onBack, onSubmit, submitting, serverError }) {
  const brandName = useMemo(
    () => brandOptions.find((b) => String(b.value) === String(state.basics.brandId))?.label ?? '—',
    [brandOptions, state.basics.brandId]
  )

  const pkg = selectedPackage
  // Dùng effectiveTargeting để đảm bảo chỉ tính phí những mục đang được phép theo deliveryMode.
  const target = effectiveTargeting ?? state.targeting
  const routeCount = target.routeIds?.length ?? 0
  const zoneCount  = target.zoneIds?.length  ?? 0
  const shelfCount = target.shelfIds?.length ?? 0

  const routeUnitPrice = pkg?.routeUnitPrice ?? pkg?.priceRoute ?? pkg?.routeFee ?? 0
  const zoneUnitPrice  = pkg?.zoneUnitPrice  ?? pkg?.priceZone  ?? pkg?.zoneFee  ?? 0
  const shelfUnitPrice = pkg?.shelfUnitPrice ?? pkg?.priceShelf ?? pkg?.shelfFee ?? 0

  const totalTargetingFee =
    routeCount * routeUnitPrice +
    zoneCount  * zoneUnitPrice +
    shelfCount * shelfUnitPrice

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-smb-on-surface">Bước 4 · Review & Tạo</h2>
        <p className="mt-1 text-sm text-smb-on-surface-variant">
          Kiểm tra lại toàn bộ thông tin trước khi tạo. Chiến dịch sau khi tạo sẽ ở trạng thái <strong>Draft</strong>.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Basics */}
        <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="info" className="text-[20px] text-smb-primary-container" />
            <h3 className="font-semibold text-smb-on-surface">Thông Tin Cơ Bản</h3>
          </div>
          <Row label="Tên chiến dịch" value={state.basics.campaignName || '—'} bold />
          <Row label="Mô tả" value={state.basics.description || '—'} />
          <Row label="Brand" value={brandName} />
          <Row
            label="Package"
            value={
              pkg
                ? `${pkg.packageName} · AdScore ${pkg.adScore ?? '—'}`
                : '—'
            }
          />
          <Row label="Thời gian chạy" value="Theo ngân sách (Tự động dừng khi hết Budget)" />
          <Row
            label="Hình thức phát"
            value={
              state.basics.deliveryMode === 'Route' ? 'Tuyến đường (robot đi, phát khi di chuyển)' :
              state.basics.deliveryMode === 'Both'  ? 'Cả hai (lộ trình + dừng ở zone)' :
              'Khu vực / Kệ (robot dừng để phát)'
            }
          />
        </div>

        {/* Targeting summary */}
        <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="my_location" className="text-[20px] text-smb-primary-container" />
            <h3 className="font-semibold text-smb-on-surface">Targeting</h3>
          </div>
          {(() => {
            const deliveryMode = state.basics.deliveryMode ?? 'Zone'
            const showRoute = deliveryMode !== 'Zone' && routeCount > 0
            const showZone  = deliveryMode !== 'Route' && zoneCount > 0
            const showShelf = deliveryMode !== 'Route' && shelfCount > 0
            const hasAny = showRoute || showZone || showShelf
            if (!hasAny) {
              return <p className="text-sm text-smb-on-surface-variant">Chưa chọn targeting nào. (Có thể thiết lập ở bước tiếp theo hoặc khi kích hoạt.)</p>
            }
            return (
              <>
                {showRoute && <PricingRow icon="route"       label="Tuyến đường" count={routeCount} pricePerItem={routeUnitPrice} />}
                {showZone  && <PricingRow icon="grid_view"   label="Khu vực"    count={zoneCount}  pricePerItem={zoneUnitPrice} />}
                {showShelf && <PricingRow icon="inventory_2" label="Kệ hàng"    count={shelfCount} pricePerItem={shelfUnitPrice} />}
              </>
            )
          })()}
          <div className="mt-2 flex items-center justify-between border-t border-smb-outline-variant pt-2 text-sm">
            <span className="font-medium text-smb-on-surface">Tổng phí targeting</span>
            <strong className="text-smb-primary-container">{formatVND(totalTargetingFee)} đ</strong>
          </div>
        </div>

        {/* Banner & Video Preview */}
        <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="perm_media" className="text-[20px] text-smb-primary-container" />
            <h3 className="font-semibold text-smb-on-surface">Banner & Video</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-smb-on-surface-variant mb-2">Banner Quảng Cáo:</p>
              {state.basics.bannerUrl ? (
                <div className="border border-smb-outline-variant rounded-lg overflow-hidden max-h-48 flex items-center justify-center bg-black/5 p-2">
                  <img src={state.basics.bannerUrl} alt="Banner Preview" className="max-h-40 object-contain mx-auto" />
                </div>
              ) : (
                <p className="text-sm text-smb-on-surface-variant italic">Chưa có banner.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-smb-on-surface-variant mb-2">Video Quảng Cáo:</p>
              {state.basics.videoUrl ? (
                <div className="border border-smb-outline-variant rounded-lg overflow-hidden max-h-48 flex items-center justify-center bg-black/5 p-2">
                  <video src={state.basics.videoUrl} controls className="max-h-40 object-contain mx-auto" />
                </div>
              ) : (
                <p className="text-sm text-smb-on-surface-variant italic">Chưa có video.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sponsored products summary */}
        <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="inventory_2" className="text-[20px] text-smb-primary-container" />
            <h3 className="font-semibold text-smb-on-surface">
              Sản Phẩm Tài Trợ ({state.products.productIds.length})
            </h3>
          </div>
          {state.products.productIds.length === 0 ? (
            <p className="text-sm text-smb-on-surface-variant">Chưa chọn sản phẩm nào.</p>
          ) : (
            <p className="text-sm text-smb-on-surface">
              <strong>{state.products.productIds.length}</strong> sản phẩm sẽ được gắn vào chiến dịch
              khi tạo. (Danh sách chi tiết sẽ hiển thị ở tab <em>Sản Phẩm</em> sau khi tạo.)
            </p>
          )}
        </div>
      </div>

      {/* Maximum Budget Notice */}
      <div className="rounded-2xl border border-smb-primary-container/30 bg-smb-primary-container/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="payments" className="text-[20px] text-smb-primary-container" />
          <h3 className="font-semibold text-smb-on-surface">Ngân Sách Chiến Dịch</h3>
        </div>
        <Row
          label="Ngân sách phân bổ (Budget)"
          value={pkg ? `${formatVND(pkg.budget)} đ` : '—'}
          bold
        />
        <p className="mt-3 flex items-start gap-2 text-xs text-smb-on-surface-variant">
          <Icon name="info" className="mt-0.5 text-[14px]" />
          Ngân sách này là giới hạn chi tiêu tối đa của chiến dịch. Chiến dịch sẽ tự động tạm dừng khi tổng chi tiêu chạm hạn mức này.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="secondary" icon="arrow_back" onClick={onBack} disabled={submitting}>
          ← Quay Lại
        </Button>
        <Button
          variant="primary"
          icon="add"
          onClick={onSubmit}
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? 'Đang Tạo...' : 'Tạo Chiến Dịch'}
        </Button>
      </div>
    </section>
  )
}

export default StepReview
