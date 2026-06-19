import React, { useState } from 'react'
import Slider from '../../../components/ui/Slider'

export function SystemBaseline({ data, onChange }) {
  const [baseline, setBaseline] = useState(data || {
    hardwareAmortization: 800,
    batteryDegradation: 400,
    maintenance: 500,
    serverCosts: 300,
  })

  const handleChange = (field, value) => {
    const next = { ...baseline, [field]: value }
    setBaseline(next)
    onChange?.(next)
  }

  const total = Object.values(baseline).reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            account_balance_wallet
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Chi Phí Nền Tảng Hệ Thống</h3>
          <p className="text-sm text-smb-on-surface-variant">Chi phí vận hành cơ bản hệ thống (VND)</p>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        <Slider
          label="Khấu Hao Phần Cứng"
          description="Khấu hao thiết bị robot & phần cứng"
          value={baseline.hardwareAmortization}
          onChange={(v) => handleChange('hardwareAmortization', v)}
          min={0}
          max={5000}
          step={100}
          unit="đ"
          icon="memory"
        />

        <Slider
          label="Hao Mòn Pin"
          description="Chi phí hao mòn pin & năng lượng"
          value={baseline.batteryDegradation}
          onChange={(v) => handleChange('batteryDegradation', v)}
          min={0}
          max={2000}
          step={50}
          unit="đ"
          icon="battery_charging_full"
        />

        <Slider
          label="Bảo Trì"
          description="Bảo trì, vệ sinh & phụ tùng thay thế"
          value={baseline.maintenance}
          onChange={(v) => handleChange('maintenance', v)}
          min={0}
          max={3000}
          step={100}
          unit="đ"
          icon="build"
        />

        <Slider
          label="Chi Phí Server"
          description="Chi phí server & hạ tầng đám mây"
          value={baseline.serverCosts}
          onChange={(v) => handleChange('serverCosts', v)}
          min={0}
          max={2000}
          step={50}
          unit="đ"
          icon="cloud"
        />
      </div>

      <div className="mt-5 rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-smb-on-surface-variant">Tổng Base_Price</span>
          <span className="font-bold text-smb-primary-container tabular-nums">
            {total.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>
    </div>
  )
}

export default SystemBaseline
