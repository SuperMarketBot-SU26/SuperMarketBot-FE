import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const packages = [
  {
    id: 'basic',
    name: 'Cơ Bản',
    icon: 'inventory_2',
    price: '5,000,000',
    period: 'tháng',
    description: 'Dành cho robot đơn lẻ',
    features: ['Quản lý 1 robot', 'Báo cáo cơ bản', 'Hỗ trợ email'],
  },
  {
    id: 'silver',
    name: 'Bạc',
    icon: 'military_tech',
    price: '12,000,000',
    period: 'tháng',
    description: 'Tối đa 5 điểm bán',
    features: ['Quản lý 5 robot', 'Báo cáo nâng cao', 'Hỗ trợ 24/7'],
    badge: null,
  },
  {
    id: 'gold',
    name: 'Vàng',
    icon: 'stars',
    price: '25,000,000',
    period: 'tháng',
    description: 'Ưu tiên hiển thị màn hình',
    features: ['Quản lý 10 robot', 'Báo cáo chi tiết', 'Hỗ trợ ưu tiên', 'Hiển thị ưu tiên'],
    badge: 'Phổ biến nhất',
    popular: true,
  },
  {
    id: 'diamond',
    name: 'Cao Cấp',
    icon: 'diamond',
    price: '50,000,000',
    period: 'tháng',
    description: 'Toàn quyền tùy chỉnh nội dung',
    features: ['Không giới hạn robot', 'Báo cáo AI', 'Hỗ trợ VIP', 'Toàn quyền tùy chỉnh'],
  },
]

export function PackageSelector({ value, onChange }) {
  const [selectedPackage, setSelectedPackage] = useState(value || 'gold')

  const handleSelect = (packageId) => {
    setSelectedPackage(packageId)
    onChange?.(packageId)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <Icon name="package_2" className="text-xl text-smb-primary-container" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Cấu Hình Gói Sản Phẩm</h3>
          <p className="text-sm text-smb-on-surface-variant">Chọn gói phù hợp với nhu cầu của bạn</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => handleSelect(pkg.id)}
            className={`
              relative rounded-lg border-2 p-4 text-left transition-all
              ${selectedPackage === pkg.id
                ? 'border-smb-primary-container bg-smb-active-bg'
                : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'
              }
            `}
          >
            {pkg.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-smb-primary-container px-3 py-1 text-xs font-medium text-smb-on-primary">
                {pkg.badge}
              </span>
            )}

            <div className={`
              mb-3 flex size-10 items-center justify-center rounded-lg
              ${selectedPackage === pkg.id ? 'bg-smb-primary-container text-smb-on-primary' : 'bg-smb-surface-container text-smb-on-surface-variant'}
            `}>
              <Icon name={pkg.icon} className="text-xl" />
            </div>

            <h4 className={`font-semibold ${selectedPackage === pkg.id ? 'text-smb-primary-container' : 'text-smb-on-surface'}`}>
              {pkg.name}
            </h4>

            <p className="mt-1 text-xs text-smb-on-surface-variant">
              {pkg.description}
            </p>

            <div className="mt-3">
              <span className="text-xl font-bold text-smb-on-surface">
                {pkg.price.toLocaleString('vi-VN')}
              </span>
              <span className="text-sm text-smb-on-surface-variant">đ /{pkg.period}</span>
            </div>

            {selectedPackage === pkg.id && (
              <div className="absolute right-3 top-3">
                <div className="flex size-5 items-center justify-center rounded-full bg-smb-primary-container">
                  <Icon name="check" className="text-xs text-smb-on-primary" />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
        <div className="flex items-center gap-2 text-sm text-smb-on-surface-variant">
          <Icon name="info" className="text-[18px] text-smb-primary-container" />
          <span>Chi phí sẽ được tính theo số ngày sử dụng thực tế nếu chiến dịch kết thúc sớm hơn dự kiến.</span>
        </div>
      </div>
    </div>
  )
}

export default PackageSelector
