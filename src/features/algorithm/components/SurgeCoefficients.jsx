import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const timeOptions = [
  { id: 'low', label: 'Thấp Điểm', multiplier: 0.7, icon: 'nights_stay' },
  { id: 'normal', label: 'Bình Thường', multiplier: 1.0, icon: 'wb_sunny' },
  { id: 'lunch', label: 'Giờ Cao Điểm Trưa', multiplier: 1.5, icon: 'free_breakfast' },
  { id: 'peak', label: 'Giờ Mua Sắm Đỉnh', multiplier: 2.5, icon: 'bolt' },
]

const eventOptions = [
  { id: 'weekday', label: 'Ngày Thường', multiplier: 1.0, icon: 'work' },
  { id: 'weekend', label: 'Cuối Tuần', multiplier: 1.5, icon: 'weekend' },
  { id: 'mega', label: 'Ngày Lễ Lớn', multiplier: 3.0, icon: 'celebration' },
]

const zoneOptions = [
  { id: 'aisle', label: 'Lối Đi / Khu Vực Chung', multiplier: 1.0, icon: 'route' },
  { id: 'hotspot', label: 'Điểm Nóng (Cửa Ra, Quầy Thanh Toán)', multiplier: 1.5, icon: 'location_on' },
]

const promoOptions = [
  { id: 'none', label: 'Không Khuyến Mãi', multiplier: 1.0, subsidy: 0, icon: 'block' },
  { id: 'moderate', label: 'Khuyến Mãi Trung Bình 10%-20%', multiplier: 0.8, subsidy: 20, icon: 'local_offer' },
  { id: 'deep', label: 'Flash Sale Sâu >20%', multiplier: 0.7, subsidy: 30, icon: 'whatshot' },
]

export function SurgeCoefficients({ data, onChange }) {
  const [coeffs, setCoeffs] = useState(data || {
    M_time: 1.0,
    M_event: 1.0,
    M_zone: 1.0,
    M_promo: 1.0,
  })

  const handleChange = (key, value) => {
    const next = { ...coeffs, [key]: value }
    setCoeffs(next)
    onChange?.(next)
  }

  const renderOptions = (options, selectedMultiplier, onSelect) => (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.multiplier)}
          className={`
            flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all
            ${selectedMultiplier === opt.multiplier
              ? 'border-smb-primary-container bg-smb-active-bg text-smb-primary-container'
              : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant hover:border-smb-outline'
            }
          `}
        >
          <Icon name={opt.icon} className="text-[18px]" />
          <span className="font-medium">{opt.label}</span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${selectedMultiplier === opt.multiplier ? 'bg-smb-primary-container/20 text-smb-primary-container' : 'bg-smb-surface-container text-smb-on-surface-variant'}`}>
            ×{opt.multiplier}
          </span>
        </button>
      ))}
    </div>
  )

  const totalMultiplier = coeffs.M_time * coeffs.M_event * coeffs.M_zone * coeffs.M_promo

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            show_chart
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Hệ Số Nhân Động (Surge Coefficients)</h3>
          <p className="text-sm text-smb-on-surface-variant">
            Công thức: Final_Cost = (Base_Price + Premium_Package_Fee) × M_time × M_event × M_zone × M_promo
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="schedule" className="text-[18px] text-smb-on-surface-variant" />
              <label className="text-sm font-semibold text-smb-on-surface">M_time — Mật Độ Giao Thông Theo Giờ</label>
            </div>
            {renderOptions(timeOptions, coeffs.M_time, (v) => handleChange('M_time', v))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="event" className="text-[18px] text-smb-on-surface-variant" />
              <label className="text-sm font-semibold text-smb-on-surface">M_event — Sức Mua Thị Trường</label>
            </div>
            {renderOptions(eventOptions, coeffs.M_event, (v) => handleChange('M_event', v))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="map" className="text-[18px] text-smb-on-surface-variant" />
              <label className="text-sm font-semibold text-smb-on-surface">M_zone — Hệ Số Bản Đồ Nhiệt</label>
            </div>
            {renderOptions(zoneOptions, coeffs.M_zone, (v) => handleChange('M_zone', v))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="sell" className="text-[18px] text-smb-on-surface-variant" />
              <label className="text-sm font-semibold text-smb-on-surface">M_promo — Đồng Đầu Tư Khuyến Mãi</label>
            </div>
            {renderOptions(promoOptions, coeffs.M_promo, (v) => handleChange('M_promo', v))}
            <p className="text-xs text-smb-on-surface-variant">
              Ngày Lễ Lớn: điều chỉnh từ 3.0 → 4.0 tùy dịp lễ
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-smb-on-surface-variant">
              Tổng Surge Multiplier (tất cả hệ số nhân)
            </span>
            <span className="font-bold text-smb-primary-container tabular-nums">
              ×{totalMultiplier.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SurgeCoefficients
