import React, { useState } from 'react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'

export function CampaignForm({ data, onChange }) {
  const [formData, setFormData] = useState(data || {
    name: '',
    brand: '',
    startDate: '',
    endDate: '',
  })

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onChange?.(newData)
  }

  const brandOptions = [
    { value: 'vinamilk', label: 'Vinamilk' },
    { value: 'techcombank', label: 'Techcombank' },
    { value: 'fpt', label: 'FPT Retail' },
  ]

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            info
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Thông Tin Chung</h3>
          <p className="text-sm text-smb-on-surface-variant">Nhập thông tin cơ bản của chiến dịch</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          label="Tên Chiến Dịch"
          placeholder="Nhập tên chiến dịch"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />

        <Select
          label="Thương Hiệu (Brand)"
          placeholder="Chọn thương hiệu đối tác"
          options={brandOptions}
          value={formData.brand}
          onChange={(value) => handleChange('brand', value)}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ngày Bắt Đầu"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            required
          />

          <Input
            label="Ngày Kết Thúc (Dự Kiến)"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

export default CampaignForm
