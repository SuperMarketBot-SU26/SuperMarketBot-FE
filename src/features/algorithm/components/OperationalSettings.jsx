import React, { useState } from 'react'
import Slider from '../../../components/ui/Slider'

export function OperationalSettings({ data, onChange }) {
  const [settings, setSettings] = useState(data || {
    alertDaysFreshMilk: 7,
    alertDaysDryGoods: 30,
    maxExpiryPoint: 50,
    campaignBoostSmall: 10,
    campaignBoostMedium: 20,
    campaignBoostLarge: 30,
  })

  const handleChange = (field, value) => {
    const next = { ...settings, [field]: value }
    setSettings(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            inventory_2
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Cài Đặt Vận Hành & Tồn Kho</h3>
          <p className="text-sm text-smb-on-surface-variant">Expiry_Score, Admin_Campaign_Score (Operational_Score)</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-smb-on-surface">Hạn Sử Dụng — Expiry_Score</p>
          <div className="space-y-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
            <Slider
              label="Ngày Cảnh Báo — Sữa Tươi"
              description="Số ngày trước hạn để cảnh báo"
              value={settings.alertDaysFreshMilk}
              onChange={(v) => handleChange('alertDaysFreshMilk', v)}
              min={1}
              max={30}
              step={1}
              unit=" ngày"
              icon="water_drop"
            />
            <Slider
              label="Ngày Cảnh Báo — Thực Phẩm Khô"
              description="Số ngày trước hạn để cảnh báo"
              value={settings.alertDaysDryGoods}
              onChange={(v) => handleChange('alertDaysDryGoods', v)}
              min={1}
              max={90}
              step={1}
              unit=" ngày"
              icon="dry_cleaning"
            />
            <Slider
              label="Điểm Hết Hạn Tối Đa"
              description="Điểm tối đa khi sản phẩm gần hết hạn"
              value={settings.maxExpiryPoint}
              onChange={(v) => handleChange('maxExpiryPoint', v)}
              min={0}
              max={100}
              step={5}
              unit=" điểm"
              icon="hourglass_bottom"
            />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-smb-on-surface">Chiến Dịch Thủ Công — Admin_Campaign_Score</p>
          <div className="space-y-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
            <Slider
              label="Tăng Điểm Nhỏ"
              description="Ưu tiên tăng nhẹ cho khuyến mãi cục bộ"
              value={settings.campaignBoostSmall}
              onChange={(v) => handleChange('campaignBoostSmall', v)}
              min={0}
              max={50}
              step={5}
              unit=" điểm"
              icon="add_circle"
            />
            <Slider
              label="Tăng Điểm Trung Bình"
              value={settings.campaignBoostMedium}
              onChange={(v) => handleChange('campaignBoostMedium', v)}
              min={0}
              max={50}
              step={5}
              unit=" điểm"
              icon="add_circle"
            />
            <Slider
              label="Tăng Điểm Lớn"
              description="Ưu tiên tối đa cho siêu thị địa phương"
              value={settings.campaignBoostLarge}
              onChange={(v) => handleChange('campaignBoostLarge', v)}
              min={0}
              max={100}
              step={5}
              unit=" điểm"
              icon="add_circle"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperationalSettings
