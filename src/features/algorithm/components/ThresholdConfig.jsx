import React, { useState } from 'react'
import Slider from '../../../components/ui/Slider'

export function ThresholdConfig({ data, onChange }) {
  const [config, setConfig] = useState(data || {
    minOrderValue: 50000,
    maxOrdersPerDay: 50,
    fraudScoreThreshold: 75,
    reviewResponseHours: 24,
  })

  const handleChange = (field, value) => {
    const next = { ...config, [field]: value }
    setConfig(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            tune
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Ngưỡng Cơ Bản</h3>
          <p className="text-sm text-smb-on-surface-variant">Thiết lập các ngưỡng hoạt động mặc định</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <Slider
          label="Giá Trị Đơn Hàng Tối Thiểu"
          description="Bỏ qua các đơn hàng có giá trị thấp hơn"
          value={config.minOrderValue}
          onChange={(v) => handleChange('minOrderValue', v)}
          min={10000}
          max={500000}
          step={10000}
          unit="đ"
          icon="payments"
        />

        <Slider
          label="Số Đơn Hàng Tối Đa / Ngày"
          description="Giới hạn số lượng đơn hàng mỗi robot xử lý"
          value={config.maxOrdersPerDay}
          onChange={(v) => handleChange('maxOrdersPerDay', v)}
          min={5}
          max={200}
          step={5}
          icon="shopping_cart"
        />

        <Slider
          label="Ngưỡng Điểm Gian Lận"
          description="Tự động chặn khi điểm gian lận vượt ngưỡng"
          value={config.fraudScoreThreshold}
          onChange={(v) => handleChange('fraudScoreThreshold', v)}
          min={0}
          max={100}
          step={5}
          unit="%"
          icon="gpp_maybe"
        />

        <Slider
          label="Thời Gian Phản Hồi Đánh Giá"
          description="Số giờ tối đa để phản hồi đánh giá trước khi bị cảnh báo"
          value={config.reviewResponseHours}
          onChange={(v) => handleChange('reviewResponseHours', v)}
          min={1}
          max={72}
          step={1}
          unit="h"
          icon="schedule"
        />
      </div>
    </div>
  )
}

export default ThresholdConfig
