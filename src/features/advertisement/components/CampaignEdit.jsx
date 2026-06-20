import React, { useState } from 'react'
import Input from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

const WAREHOUSE_OPTIONS = [
  { value: 'kho_tong_hcm', label: 'Kho Tổng TP.HCM' },
  { value: 'kho_vt_q1', label: 'Kho Vệ Tinh Quận 1' },
  { value: 'kho_pp_mdong', label: 'Kho Phân Phối Miền Đông' },
]

export function CampaignEdit({ data, onChange, onSave, onRestore, onDiscard, lastUpdated }) {
  const [formData, setFormData] = useState(data || {
    name: '',
    internalId: '',
    description: '',
    budget: '',
    dailyMaxBudget: '',
    warehouses: [],
    minStock: '',
    startDate: '',
    endDate: '',
  })

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    onChange?.(updated)
  }

  const handleWarehouseToggle = (value) => {
    const current = formData.warehouses || []
    const updated = current.includes(value)
      ? current.filter((w) => w !== value)
      : [...current, value]
    handleChange('warehouses', updated)
  }

  return (
    <div className="space-y-6">
      {/* Thông Tin Cơ Bản */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
            <span className="material-symbols-outlined text-xl text-smb-primary-container">
              edit_note
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Thông Tin Cơ Bản</h3>
            <p className="text-sm text-smb-on-surface-variant">Cập nhật thông tin cơ bản của chiến dịch</p>
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

          <Input
            label="Mã Định Danh (Internal ID)"
            placeholder="VD: ADV-2026-001"
            value={formData.internalId}
            onChange={(e) => handleChange('internalId', e.target.value)}
            disabled
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-smb-on-surface">Mô Tả Ngắn</label>
            <textarea
              placeholder="Mô tả ngắn về chiến dịch..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
            />
          </div>
        </div>
      </div>

      {/* Ngân Sách & Nhãn Kho */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
            <span className="material-symbols-outlined text-xl text-smb-primary-container">
              payments
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Ngân Sách & Nhãn Kho</h3>
            <p className="text-sm text-smb-on-surface-variant">Cấu hình ngân sách và kho hàng áp dụng</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngân Sách Dự Kiến (VNĐ)"
              type="number"
              placeholder="0"
              value={formData.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              required
            />
            <Input
              label="Ngân Sách Tối Đa Mỗi Ngày (VNĐ)"
              type="number"
              placeholder="0"
              value={formData.dailyMaxBudget}
              onChange={(e) => handleChange('dailyMaxBudget', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-smb-on-surface">Nhãn Kho Hàng Áp Dụng</label>
            <div className="flex flex-wrap gap-2">
              {WAREHOUSE_OPTIONS.map((opt) => {
                const selected = formData.warehouses?.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleWarehouseToggle(opt.value)}
                    className={`
                      inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all
                      ${selected
                        ? 'border-smb-primary-container bg-smb-primary-container/10 text-smb-primary-container'
                        : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant hover:border-smb-primary-container/50'
                      }
                    `}
                  >
                    <span className={`material-symbols-outlined text-[14px] ${selected ? '' : 'opacity-40'}`}>
                      {selected ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-smb-on-surface">
              Trạng Thái Tồn Kho Tối Thiểu
            </label>
            <p className="text-xs text-smb-on-surface-variant">
              Robot sẽ tự động dừng chiến dịch nếu tồn kho dưới mức này.
            </p>
            <Input
              type="number"
              placeholder="0"
              value={formData.minStock}
              onChange={(e) => handleChange('minStock', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cấu Hình Thời Gian */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
            <span className="material-symbols-outlined text-xl text-smb-primary-container">
              schedule
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Cấu Hình Thời Gian</h3>
            <p className="text-sm text-smb-on-surface-variant">Thời gian bắt đầu và kết thúc chiến dịch</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngày Bắt Đầu"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              required
            />
            <Input
              label="Ngày Kết Thúc"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
            />
          </div>

          {data?.status === 'running' && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 p-3">
              <span className="material-symbols-outlined mt-0.5 text-[16px] text-smb-primary-container">info</span>
              <p className="text-xs text-smb-on-surface-variant">
                Chiến dịch đang trong trạng thái <strong className="text-smb-primary-container">Đang chạy</strong>.
                Thay đổi ngày có thể ảnh hưởng đến lịch trình Robot.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hoạt Động & Đồng Bộ */}
      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
            <span className="material-symbols-outlined text-xl text-smb-primary-container">
              sync
            </span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Hoạt Động & Đồng Bộ</h3>
            <p className="text-sm text-smb-on-surface-variant">Lưu hoặc hủy các thay đổi</p>
          </div>
        </div>

        {lastUpdated && (
          <p className="mb-4 text-xs text-smb-on-surface-variant">
            Lần cập nhật cuối: <strong>{lastUpdated}</strong>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon="history"
              size="sm"
              onClick={onRestore}
            >
              Khôi Phục Dữ Liệu Gốc
            </Button>
            <Button
              variant="outline"
              icon="delete_forever"
              size="sm"
              onClick={onDiscard}
            >
              Hủy Thay Đổi
            </Button>
          </div>
          <Button
            variant="primary"
            icon="save"
            onClick={onSave}
          >
            Lưu Cập Nhật & Đồng Bộ
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CampaignEdit
