import React, { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

export function CampaignEdit({ data, onSave, onDiscard, saving = false }) {
  const [formData, setFormData] = useState({
    campaignName: data?.campaignName ?? '',
    startDate: data?.startDate ?? '',
    endDate: data?.endDate ?? '',
  })

  // Only lock editing while the campaign is Active (running)
  const isLocked = data?.status === 'Active'

  const formatDateInput = (val) => {
    if (!val) return ''
    if (typeof val === 'string' && val.includes('T')) return val.split('T')[0]
    return val
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleClick = () => {
    onSave?.({
      campaignName: formData.campaignName,
      startDate: formatDateInput(formData.startDate),
      endDate: formatDateInput(formData.endDate),
    })
  }

  return (
    <div className="space-y-6">
      {/* Cấu Hình Chiến Dịch */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
            <span className="material-symbols-outlined text-xl text-smb-primary-container">
              edit_note
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Cấu Hình Chiến Dịch</h3>
            <p className="text-sm text-smb-on-surface-variant">Cập nhật tên và thời gian chiến dịch</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Input
            label="Tên Chiến Dịch"
            placeholder="Nhập tên chiến dịch"
            value={formData.campaignName}
            onChange={(e) => handleChange('campaignName', e.target.value)}
            disabled={isLocked}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngày Bắt Đầu"
              type="date"
              value={formatDateInput(formData.startDate)}
              onChange={(e) => handleChange('startDate', e.target.value)}
              disabled={isLocked}
            />
            <Input
              label="Ngày Kết Thúc"
              type="date"
              value={formatDateInput(formData.endDate)}
              onChange={(e) => handleChange('endDate', e.target.value)}
              disabled={isLocked}
            />
          </div>

          {isLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 p-3">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-smb-primary-container">info</span>
              <p className="text-xs text-smb-on-surface-variant">
                Chiến dịch đang trong trạng thái <strong className="text-smb-primary-container">Hoạt Động</strong>.
                Thay đổi ngày có thể ảnh hưởng đến lịch trình Robot.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outline"
          icon="close"
          size="sm"
          onClick={onDiscard}
        >
          Hủy Thay Đổi
        </Button>
        <Button
          variant="primary"
          icon="save"
          onClick={handleClick}
          disabled={saving || isLocked}
        >
          {saving ? 'Đang Lưu...' : 'Lưu Cập Nhật'}
        </Button>
      </div>
    </div>
  )
}

export default CampaignEdit
