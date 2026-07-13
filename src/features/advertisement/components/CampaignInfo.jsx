import React from 'react'
import { StatCard } from '../../../components/StatCard'

const PACKAGE_LABELS = {
  organic: 'Tự Nhiên',
  basic: 'Cơ Bản',
  silver: 'Bạc',
  gold: 'Vàng',
  premium: 'Cao Cấp',
}

export function CampaignInfo({ data }) {
  if (!data) return null

  const formatDate = (val) =>
    val ? new Date(val).toLocaleDateString('vi-VN') : '—'

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

        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Chiến Dịch</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface">{data.campaignName || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Thương Hiệu</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface">{data.brandName || '—'}</p>
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
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Bắt Đầu</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface">{formatDate(data.startDate)}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Ngày Kết Thúc</p>
            <p className="mt-1 text-sm font-semibold text-smb-on-surface">{formatDate(data.endDate)}</p>
          </div>

          {/* Targeting summary */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-smb-on-surface-variant">Đối Tượng Nhắm Đích</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {data.semanticObjectId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-smb-secondary-container/20 px-2 py-0.5 text-xs text-smb-secondary-container">
                  <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                  1 Kệ
                </span>
              ) : null}
              {Array.isArray(data.routeIds) && data.routeIds.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-smb-primary-container/20 px-2 py-0.5 text-xs text-smb-primary-container">
                  <span className="material-symbols-outlined text-[12px]">route</span>
                  {data.routeIds.length} Tuyến
                </span>
              ) : null}
              {!data.semanticObjectId && (!Array.isArray(data.routeIds) || data.routeIds.length === 0) ? (
                <span className="text-xs text-smb-on-surface-variant">Chưa có nhắm đích</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          title="Đã Chi"
          value={`${(data.totalSpent || 0).toLocaleString('vi-VN')} đ`}
          icon="payments"
          color="success"
        />
        <StatCard
          title="Số Sản Phẩm Tài Trợ"
          value={String(data.sponsoredProductCount ?? 0)}
          icon="inventory_2"
          color="info"
        />
      </div>
    </div>
  )
}

export default CampaignInfo
