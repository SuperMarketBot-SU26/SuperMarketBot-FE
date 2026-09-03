import React from 'react'
import { StatCard } from '../../../components/StatCard'

const PACKAGE_LABELS = {
  organic: 'Tự Nhiên',
  basic: 'Cơ Bản',
  silver: 'Bạc',
  gold: 'Vàng',
  premium: 'Cao Cấp',
}

export function CampaignInfo({ data, sponsoredProducts = [] }) {
  if (!data) return null

  const formatDate = (val) =>
    val ? new Date(val).toLocaleDateString('vi-VN') : '—'

  const formatVND = (val) => {
    if (val == null || val === 0) return '0 đ'
    return `${Number(val).toLocaleString('vi-VN')} đ`
  }

  // Fallback chain: preference order DTO count > fetched list length
  const sponsoredCount =
    data.sponsoredProductCount ??
    (Array.isArray(sponsoredProducts) ? sponsoredProducts.length : 0)

  const totalSpent = data.totalSpent ?? 0
  const routeCount = Array.isArray(data.routeIds) ? data.routeIds.length : 0
  const zoneCount = Array.isArray(data.zoneIds) ? data.zoneIds.length : 0
  const shelfCount = data.semanticObjectId ? 1 : 0

  const packageBudget = data.packageBudget ?? data.package?.budget ?? 0
  const remainingBudget = data.remainingBudget ?? Math.max(0, packageBudget - totalSpent)
  const spentPct = packageBudget > 0 ? Math.min(100, Math.round((totalSpent / packageBudget) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Primary Info */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
              <span className="material-symbols-outlined text-xl text-smb-primary-container">
                info
              </span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-smb-on-surface">Thông Tin Chiến Dịch</h3>
              <p className="text-sm text-smb-on-surface-variant">Thông tin chi tiết từ hệ thống</p>
            </div>
          </div>

          {/* Budget progress badge */}
          {packageBudget > 0 && (
            <div className="text-right">
              <span className="text-xs text-smb-on-surface-variant font-medium">Ngân sách còn lại:</span>
              <p className="text-base font-bold text-emerald-600 tabular-nums">
                {formatVND(remainingBudget)}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Chiến Dịch</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface" title={data.campaignName}>
              {data.campaignName || '—'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Thương Hiệu</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface">
              {data.brandName || '—'}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Gói Dịch Vụ</p>
            <p className="mt-1">
              <span className="inline-block rounded-full bg-smb-primary-container/10 px-3 py-0.5 text-xs font-semibold text-smb-primary-container">
                {PACKAGE_LABELS[data.packageName] || data.packageName || '—'} ({formatVND(packageBudget)})
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Trạng thái</p>
            <p className="mt-1">
              <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-600">
                {data.status || '—'}
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngân Sách Gói (Tối đa)</p>
            <p className="mt-1 text-sm font-bold text-smb-primary-container tabular-nums">
              {formatVND(packageBudget)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngân Sách Còn Lại</p>
            <p className="mt-1 text-sm font-bold text-emerald-600 tabular-nums">
              {formatVND(remainingBudget)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Bắt Đầu</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface tabular-nums">
              {formatDate(data.startDate)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Kết Thúc</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface tabular-nums">
              {['Completed', 'Canceled'].includes(data.status)
                ? formatDate(data.endDate)
                : <span className="text-xs text-smb-on-surface-variant italic font-normal">Theo ngân sách</span>
              }
            </p>
          </div>

          {/* Targeting summary */}
          <div className="col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Đối Tượng Nhắm Đích</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {shelfCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-smb-secondary-container/20 px-2.5 py-1 text-xs font-medium text-smb-secondary-container">
                  <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                  {shelfCount} Kệ
                </span>
              ) : null}
              {zoneCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-smb-tertiary-container/20 px-2.5 py-1 text-xs font-medium text-smb-tertiary-container">
                  <span className="material-symbols-outlined text-[14px]">grid_view</span>
                  {zoneCount} Zone
                </span>
              ) : null}
              {routeCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/20 px-2.5 py-1 text-xs font-medium text-smb-primary-container">
                  <span className="material-symbols-outlined text-[14px]">route</span>
                  {routeCount} Tuyến
                </span>
              ) : null}
              {shelfCount === 0 && zoneCount === 0 && routeCount === 0 ? (
                <span className="text-xs italic text-smb-on-surface-variant">Chưa có nhắm đích</span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        {packageBudget > 0 && (
          <div className="mt-6 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
            <div className="flex items-center justify-between text-xs font-medium text-smb-on-surface mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-smb-primary-container">account_balance_wallet</span>
                Mức độ tiêu thụ ngân sách
              </span>
              <span>Đã chi: <strong>{formatVND(totalSpent)}</strong> / {formatVND(packageBudget)} ({spentPct}%)</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-smb-surface-container">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  spentPct >= 100 ? 'bg-red-500' : spentPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${spentPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard
          title="Ngân Sách Tối Đa"
          value={formatVND(packageBudget)}
          subtitle={`Gói ${PACKAGE_LABELS[data.packageName] || data.packageName || ''}`}
          icon="account_balance_wallet"
          color="primary"
        />
        <StatCard
          title="Đã Chi Tiêu"
          value={totalSpent > 0 ? formatVND(totalSpent) : '0 đ'}
          subtitle={`${spentPct}% ngân sách đã dùng`}
          icon="payments"
          color={totalSpent > 0 ? 'warning' : 'primary'}
        />
        <StatCard
          title="Ngân Sách Còn Lại"
          value={formatVND(remainingBudget)}
          subtitle={`${100 - spentPct}% khả dụng`}
          icon="savings"
          color="success"
        />
        <StatCard
          title="Sản Phẩm & Targeting"
          value={`${sponsoredCount} SP`}
          subtitle={`${shelfCount} kệ · ${zoneCount} zone · ${routeCount} tuyến`}
          icon="my_location"
          color="info"
        />
      </div>
    </div>
  )
}

export default CampaignInfo
