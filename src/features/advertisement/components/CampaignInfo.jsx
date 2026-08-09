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
    if (val == null || val === 0) return '—'
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

  return (
    <div className="space-y-4">
      {/* Primary Info */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
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
                {PACKAGE_LABELS[data.packageName] || data.packageName || '—'}
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
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Bắt Đầu</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface tabular-nums">
              {formatDate(data.startDate)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Kết Thúc</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface tabular-nums">
              {formatDate(data.endDate)}
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
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Tổng Chi"
          value={totalSpent > 0 ? formatVND(totalSpent) : '0 đ'}
          subtitle={totalSpent > 0 ? 'Phát sinh từ khi kích hoạt' : 'Chưa phát sinh chi phí'}
          icon="payments"
          color={totalSpent > 0 ? 'success' : 'primary'}
        />
        <StatCard
          title="Sản Phẩm Tài Trợ"
          value={String(sponsoredCount)}
          subtitle={sponsoredCount > 0 ? 'Đang hiển thị trong chiến dịch' : 'Chưa có sản phẩm'}
          icon="inventory_2"
          color="info"
        />
        <StatCard
          title="Vùng Nhắm Đích"
          value={String(shelfCount + zoneCount + routeCount)}
          subtitle={`${shelfCount} kệ · ${zoneCount} zone · ${routeCount} tuyến`}
          icon="my_location"
          color="primary"
        />
      </div>
    </div>
  )
}

export default CampaignInfo
