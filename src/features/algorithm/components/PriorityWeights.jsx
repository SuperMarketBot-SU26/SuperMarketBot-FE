import React, { useState } from 'react'
import Slider from '../../../components/ui/Slider'

export function PriorityWeights({ data, onChange }) {
  const [weights, setWeights] = useState(data || {
    brand: 30,
    promotion: 25,
    proximity: 20,
    rating: 15,
    recency: 10,
  })

  const handleChange = (field, value) => {
    const next = { ...weights, [field]: value }
    setWeights(next)
    onChange?.(next)
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            balance
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Trọng Số Ưu Tiên</h3>
          <p className="text-sm text-smb-on-surface-variant">Phân bổ trọng số cho thuật toán xếp hạng</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-smb-on-surface-variant">Tổng trọng số</span>
          <span className={`font-semibold ${total === 100 ? 'text-smb-primary-container' : 'text-smb-error'}`}>
            {total}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-smb-surface-container-lowest">
          <div
            className={`h-full rounded-full transition-all ${total === 100 ? 'bg-smb-primary-container' : 'bg-smb-error'}`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
        {total !== 100 && (
          <p className="mt-1.5 text-xs text-smb-error">
            Tổng trọng số phải bằng 100%. Hiện tại {total}%.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-5">
        <Slider
          label="Thương Hiệu"
          description="Ưu tiên theo thương hiệu đối tác"
          value={weights.brand}
          onChange={(v) => handleChange('brand', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="business"
        />

        <Slider
          label="Khuyến Mãi"
          description="Ưu tiên mức chiết khấu & trợ giá"
          value={weights.promotion}
          onChange={(v) => handleChange('promotion', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="sell"
        />

        <Slider
          label="Khoảng Cách"
          description="Ưu tiên theo khoảng cách địa lý"
          value={weights.proximity}
          onChange={(v) => handleChange('proximity', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="near_me"
        />

        <Slider
          label="Đánh Giá"
          description="Ưu tiên theo điểm đánh giá của điểm bán"
          value={weights.rating}
          onChange={(v) => handleChange('rating', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="star_rate"
        />

        <Slider
          label="Độ Mới"
          description="Ưu tiên các đơn hàng được tạo gần đây"
          value={weights.recency}
          onChange={(v) => handleChange('recency', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="schedule"
        />
      </div>
    </div>
  )
}

export default PriorityWeights
