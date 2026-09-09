import React, { useState, useEffect } from 'react'
import { Badge } from '../../../components/DataTable'
import { Button } from '../../../components/ui/Button'
import { getPackage } from '../api/adPackageApi'
import { getErrorMessage } from '../../../api/client'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const statusVariant = (status) =>
  ({
    Active: 'success',
    Inactive: 'neutral',
  }[status] || 'neutral')

const statusLabel = (status) =>
  ({
    Active: 'Đang hoạt động',
    Inactive: 'Không hoạt động',
  }[status] || status)

const pkgIcon = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('basic') || n.includes('bạc')) return 'inventory_2'
  if (n.includes('silver')) return 'military_tech'
  if (n.includes('gold') || n.includes('vàng')) return 'stars'
  if (n.includes('diamond') || n.includes('cấp') || n.includes('vip') || n.includes('premium')) return 'diamond'
  return 'package_2'
}

const formatVND = (value) => Number(value || 0).toLocaleString('vi-VN')

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/**
 * PackageDetailModal
 * Renders a full, rich overview of an Ad Package.
 * Accepts either `packageData` directly or `packageId` to fetch from the API.
 */
export function PackageDetailModal({ packageData, packageId, onClose, onEdit }) {
  const [pkg, setPkg] = useState(packageData || null)
  const [loading, setLoading] = useState(!packageData && Boolean(packageId))
  const [error, setError] = useState(null)

  useEffect(() => {
    // Scroll lock
    const prevOverflow = document.body.style.overflow
    const prevPosition = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width
    const scrollY = window.scrollY

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.position = prevPosition
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [])

  useEffect(() => {
    if (packageData) {
      setPkg(packageData)
      setLoading(false)
      return
    }

    if (!packageId) return

    let isMounted = true
    setLoading(true)
    setError(null)

    getPackage(packageId)
      .then((data) => {
        if (isMounted) setPkg(data)
      })
      .catch((err) => {
        if (isMounted) setError(getErrorMessage(err, 'Không thể tải thông tin chi tiết gói quảng cáo.'))
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [packageData, packageId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-smb-outline-variant/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 shadow-xs">
              <Icon name={pkg ? pkgIcon(pkg.packageName) : 'package_2'} className="text-2xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-smb-on-surface">
                  {pkg ? pkg.packageName : 'Chi Tiết Gói Quảng Cáo'}
                </h2>
                {pkg && (
                  <Badge variant={statusVariant(pkg.status)}>
                    {statusLabel(pkg.status)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-smb-on-surface-variant">
                {pkg ? `Mã định danh: #PKG-${String(pkg.packageId).padStart(3, '0')}` : 'Đang tải dữ liệu gói...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface transition-colors"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-smb-on-surface-variant">
              <Icon name="progress_activity" className="animate-spin text-3xl text-emerald-600 mb-2" />
              <p className="text-sm font-medium">Đang tải thông tin gói...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <Icon name="error" className="text-4xl text-rose-500" />
              <p className="text-sm text-rose-500 max-w-sm">{error}</p>
              <Button variant="secondary" size="sm" onClick={() => onClose?.()}>
                Đóng
              </Button>
            </div>
          ) : pkg ? (
            <>
              {/* Stat Cards Overview */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Ngân Sách Tối Đa</span>
                    <Icon name="account_balance_wallet" className="text-base text-emerald-600" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatVND(pkg.budget)}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">đ</span>
                  </div>
                  <p className="mt-1 text-[11px] text-smb-on-surface-variant">Hạn mức ngân sách tối đa của gói</p>
                </div>

                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-sky-700 dark:text-sky-300">Điểm Ưu Tiên</span>
                    <Icon name="speed" className="text-base text-sky-600" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
                      {pkg.adScore ?? 50}
                    </span>
                    <span className="text-xs font-semibold text-sky-600">pts</span>
                  </div>
                  <p className="mt-1 text-[11px] text-smb-on-surface-variant">Trọng số ưu tiên hiển thị trên Robot</p>
                </div>

                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Chiến Dịch Đang Chạy</span>
                    <Icon name="campaign" className="text-base text-purple-600" />
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
                      {pkg.activeCampaignCount ?? 0}
                    </span>
                    <span className="text-xs font-semibold text-purple-600">chiến dịch</span>
                  </div>
                  <p className="mt-1 text-[11px] text-smb-on-surface-variant">Số chiến dịch đang áp dụng gói</p>
                </div>
              </div>

              {/* Unit Prices Breakdown */}
              <div className="rounded-xl border border-smb-outline-variant/70 bg-smb-surface-container-low/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="payments" className="text-smb-primary text-[18px]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface">
                    Đơn Giá Vị Trí & Tuyến Đường (Fixed Unit Prices)
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-smb-outline-variant/40 bg-smb-surface-container-lowest p-3">
                    <div className="flex items-center justify-between text-xs text-smb-on-surface-variant mb-1">
                      <span>Đơn giá Zone</span>
                      <Icon name="near_me" className="text-sm text-smb-on-surface-variant" />
                    </div>
                    <div className="text-base font-bold tabular-nums text-smb-on-surface">
                      {formatVND(pkg.zoneUnitPrice ?? pkg.zoneFee ?? 0)} <span className="text-xs font-normal text-smb-on-surface-variant">đ / zone</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-smb-outline-variant/40 bg-smb-surface-container-lowest p-3">
                    <div className="flex items-center justify-between text-xs text-smb-on-surface-variant mb-1">
                      <span>Đơn giá Kệ (Shelf)</span>
                      <Icon name="shelves" className="text-sm text-smb-on-surface-variant" />
                    </div>
                    <div className="text-base font-bold tabular-nums text-smb-on-surface">
                      {formatVND(pkg.shelfUnitPrice ?? pkg.shelfFee ?? 0)} <span className="text-xs font-normal text-smb-on-surface-variant">đ / kệ</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-smb-outline-variant/40 bg-smb-surface-container-lowest p-3">
                    <div className="flex items-center justify-between text-xs text-smb-on-surface-variant mb-1">
                      <span>Đơn giá Tuyến (Route)</span>
                      <Icon name="alt_route" className="text-sm text-smb-on-surface-variant" />
                    </div>
                    <div className="text-base font-bold tabular-nums text-smb-on-surface">
                      {formatVND(pkg.routeUnitPrice ?? pkg.routeFee ?? 0)} <span className="text-xs font-normal text-smb-on-surface-variant">đ / tuyến</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-lg bg-smb-surface-container/50 px-3 py-2 text-[11px] text-smb-on-surface-variant">
                  <Icon name="info" className="text-sm text-smb-primary shrink-0 mt-0.5" />
                  <span>
                    Tổng chi phí vị trí cố định = (Số Zone × Đơn giá Zone) + (Số Kệ × Đơn giá Kệ) + (Số Tuyến × Đơn giá Tuyến). Phí này sẽ được khấu trừ vào ngân sách ngay khi chiến dịch kích hoạt.
                  </span>
                </div>
              </div>

              {/* Usage Fee Section */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="ads_click" className="text-amber-600 text-[18px]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Phí Phát Sinh Tương Tác (Usage Fee)
                  </h3>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {formatVND(pkg.clickFee)} đ
                  </span>
                  <span className="text-xs text-amber-700/80 dark:text-amber-300/80">/ mỗi lượt khách bấm xem sản phẩm</span>
                </div>
                <p className="mt-1.5 text-xs text-smb-on-surface-variant leading-relaxed">
                  Khi robot hiển thị quảng cáo, nếu khách hàng tương tác bấm vào màn hình cảm ứng để xem chi tiết sản phẩm hoặc bản đồ dẫn đường, hệ thống sẽ tự động trừ phí click này vào số dư ngân sách của chiến dịch.
                </p>
              </div>

              {/* Description Section */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-smb-on-surface-variant">
                  Mô Tả Gói
                </h3>
                <div className="rounded-xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest p-3.5 text-sm text-smb-on-surface leading-relaxed whitespace-pre-wrap">
                  {pkg.description ? pkg.description : <span className="italic text-smb-on-surface-variant">Chưa có mô tả chi tiết cho gói quảng cáo này.</span>}
                </div>
              </div>

              {/* Metadata Section */}
              <div className="rounded-xl border border-smb-outline-variant/40 bg-smb-surface-container-low/40 p-3.5">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-smb-on-surface-variant">Thời gian tạo gói:</span>
                    <p className="mt-0.5 font-medium text-smb-on-surface">{formatDateTime(pkg.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-smb-on-surface-variant">Cập nhật gần nhất:</span>
                    <p className="mt-0.5 font-medium text-smb-on-surface">{formatDateTime(pkg.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-smb-outline-variant/60 bg-smb-surface-container-lowest px-6 py-3.5">
          <div className="text-xs text-smb-on-surface-variant">
            {pkg && <span>Trạng thái: <strong>{statusLabel(pkg.status)}</strong></span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng
            </Button>
            {onEdit && pkg && (
              <Button variant="primary" size="sm" icon="edit" onClick={() => onEdit(pkg)}>
                Chỉnh Sửa Gói
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PackageDetailModal
