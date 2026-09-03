import React, { useState, useEffect } from 'react'
import { getPackages } from '../api/adPackageApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const FEATURE_LABELS = [
  'Quản lý 1 robot',
  'Quản lý 3 robot',
  'Quản lý 5 robot',
  'Quản lý 10 robot',
  'Không giới hạn robot',
  'Báo cáo cơ bản',
  'Báo cáo nâng cao',
  'Báo cáo chi tiết',
  'Báo cáo AI',
  'Hỗ trợ email',
  'Hỗ trợ 24/7',
  'Hỗ trợ ưu tiên',
  'Hỗ trợ VIP',
  'Hiển thị ưu tiên',
  'Toàn quyền tùy chỉnh',
]

const pkgFeatures = (pkg) => {
  const score = pkg.adScore ?? 0
  const feats = []
  if (score >= 10) feats.push('Quản lý 1 robot')
  if (score >= 30) feats.push('Quản lý 3 robot')
  if (score >= 50) feats.push('Quản lý 5 robot')
  if (score >= 80) feats.push('Quản lý 10 robot')
  if (score >= 100) feats.push('Không giới hạn robot')
  if (score >= 10) feats.push('Báo cáo cơ bản')
  if (score >= 30) feats.push('Báo cáo nâng cao')
  if (score >= 50) feats.push('Báo cáo chi tiết')
  if (score >= 100) feats.push('Báo cáo AI')
  if (score >= 10) feats.push('Hỗ trợ email')
  if (score >= 30) feats.push('Hỗ trợ 24/7')
  if (score >= 50) feats.push('Hỗ trợ ưu tiên')
  if (score >= 100) feats.push('Hỗ trợ VIP')
  if (score >= 50) feats.push('Hiển thị ưu tiên')
  if (score >= 100) feats.push('Toàn quyền tùy chỉnh')
  return feats.slice(0, 5)
}

const pkgIcon = (name) => {
  const n = (name || '').toLowerCase()
  if (n.includes('basic') || n.includes('bạc')) return 'inventory_2'
  if (n.includes('silver')) return 'military_tech'
  if (n.includes('gold') || n.includes('vàng')) return 'stars'
  if (n.includes('diamond') || n.includes('cấp')) return 'diamond'
  return 'package_2'
}

export function PackageSelector({ value, onChange, loading }) {
  const [packages, setPackages] = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    getPackages()
      .then((data) => {
        const active = Array.isArray(data) ? data.filter((p) => p.status === 'Active') : []
        setPackages(active)
      })
      .catch(() => setPackages([]))
      .finally(() => setFetching(false))
  }, [])

  const selected = packages.find((p) => p.packageId === value)

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <Icon name="package_2" className="text-xl text-smb-primary-container" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Cấu Hình Gói Quảng Cáo</h3>
          <p className="text-sm text-smb-on-surface-variant">Chọn gói phù hợp với nhu cầu của bạn</p>
        </div>
      </div>

      {(fetching || loading) ? (
        <div className="flex items-center justify-center py-8 text-sm text-smb-on-surface-variant">
          <Icon name="progress_activity" className="animate-spin mr-2 text-[16px]" />
          Đang tải gói quảng cáo...
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low py-8 text-center text-sm text-smb-on-surface-variant">
          Không có gói quảng cáo nào đang hoạt động.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => {
              const isSelected = value === pkg.packageId
              return (
                <button
                  key={pkg.packageId}
                  type="button"
                  onClick={() => onChange?.(pkg.packageId)}
                  className={`
                    relative rounded-lg border-2 p-4 text-left transition-all
                    ${isSelected
                      ? 'border-smb-primary-container bg-smb-active-bg'
                      : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'
                    }
                  `}
                >
                  <div className={`
                    mb-3 flex size-10 items-center justify-center rounded-lg
                    ${isSelected ? 'bg-smb-primary-container text-smb-on-primary' : 'bg-smb-surface-container text-smb-on-surface-variant'}
                  `}>
                    <Icon name={pkgIcon(pkg.packageName)} className="text-xl" />
                  </div>

                  <h4 className={`font-semibold ${isSelected ? 'text-smb-primary-container' : 'text-smb-on-surface'}`}>
                    {pkg.packageName}
                  </h4>

                  <div className="mt-2">
                    <p className="text-[10px] text-smb-on-surface-variant uppercase">Ngân sách</p>
                    <span className="text-lg font-bold text-smb-primary-container">
                      {Number(pkg.budget).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs text-smb-on-surface-variant"> đ</span>
                  </div>

                  <div className="mt-1 text-[11px] text-smb-on-surface-variant">
                    Chạy đến khi hết ngân sách
                  </div>

                  {isSelected && (
                    <div className="absolute right-3 top-3">
                      <div className="flex size-5 items-center justify-center rounded-full bg-smb-primary-container">
                        <Icon name="check" className="text-xs text-white" />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected package detail */}
          {selected && (
            <div className="mt-6 space-y-3">
              <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
                <h4 className="text-sm font-semibold text-smb-on-surface">Chi tiết chi phí gói: {selected.packageName}</h4>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 text-xs text-smb-on-surface-variant">
                  <div className="space-y-1">
                    <p className="font-semibold text-smb-on-surface">Đơn giá vị trí & tuyến đường (Unit Prices):</p>
                    <p>• Đơn giá Zone: <strong className="text-smb-on-surface">{Number(selected.zoneUnitPrice ?? selected.zoneFee ?? 0).toLocaleString('vi-VN')} đ</strong></p>
                    <p>• Đơn giá Kệ (Shelf): <strong className="text-smb-on-surface">{Number(selected.shelfUnitPrice ?? selected.shelfFee ?? 0).toLocaleString('vi-VN')} đ</strong></p>
                    <p>• Đơn giá Tuyến (Route): <strong className="text-smb-on-surface">{Number(selected.routeUnitPrice ?? selected.routeFee ?? 0).toLocaleString('vi-VN')} đ</strong></p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-smb-on-surface">Phí phát sinh (Usage Fee):</p>
                    <p>• Phí Click: <strong className="text-amber-600">{Number(selected.clickFee).toLocaleString('vi-VN')} đ/click</strong></p>
                    <p className="mt-2 text-[11px] italic">Phí click sẽ trừ trực tiếp từ ngân sách tối đa của gói.</p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
                <Icon name="info" className="mt-0.5 text-[16px] text-smb-primary-container" />
                <span className="text-xs text-smb-on-surface-variant">
                  Phí cố định = (Số Zone × Đơn giá Zone) + (Số Kệ × Đơn giá Kệ) + (Số Tuyến × Đơn giá Tuyến). Tổng phí cố định phải ≤ Ngân sách gói ({Number(selected.budget).toLocaleString('vi-VN')} đ).
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PackageSelector
