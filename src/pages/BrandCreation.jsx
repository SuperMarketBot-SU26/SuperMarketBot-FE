import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { createBrand } from '../features/brand/api/brandApi'

export function BrandCreation() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [form, setForm] = useState({
    brandName: '',
    description: '',
  })

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.brandName.trim()) {
      setSubmitError('Tên nhãn hàng không được để trống.')
      return
    }
    if (form.brandName.trim().length > 100) {
      setSubmitError('Tên nhãn hàng không được vượt quá 100 ký tự.')
      return
    }
    if (form.description && form.description.length > 500) {
      setSubmitError('Mô tả không được vượt quá 500 ký tự.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await createBrand({
        brandName: form.brandName.trim(),
        description: form.description.trim() || null,
      })
      navigate('/brand')
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err.message || 'Tạo nhãn hàng thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Nhãn Hàng" />

      <div className="pl-[260px]">
        <Navbar
          title="Thêm Nhãn Hàng Mới"
          subtitle="Tạo nhãn hàng đối tác mới trong hệ thống SmartMarketBot"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {submitError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Form Card */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
                  <span className="material-symbols-outlined text-xl text-smb-primary-container">
                    storefront
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-smb-on-surface">Thông Tin Nhãn Hàng</h3>
                  <p className="text-sm text-smb-on-surface-variant">Nhập thông tin cơ bản của nhãn hàng</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-smb-on-surface">
                    Tên Nhãn Hàng <span className="text-smb-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Vinamilk, TH True Milk, Nestlé..."
                    value={form.brandName}
                    onChange={(e) => handleChange('brandName', e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                    required
                  />
                  <p className="text-xs text-smb-on-surface-variant">
                    Tối đa 100 ký tự ({form.brandName.length}/100)
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-smb-on-surface">Mô Tả</label>
                  <textarea
                    placeholder="Mô tả ngắn về nhãn hàng (tùy chọn)..."
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                  />
                  <p className="text-xs text-smb-on-surface-variant">
                    Tối đa 500 ký tự ({form.description.length}/500)
                </p>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="flex items-start gap-3 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <span className="material-symbols-outlined mt-0.5 text-smb-primary-container">info</span>
              <div className="text-sm text-smb-on-surface-variant">
                <p className="font-medium text-smb-on-surface">Ví nhãn hàng được tạo tự động</p>
                <p className="mt-0.5">Sau khi tạo, bạn có thể nạp tiền vào ví và bắt đầu tạo chiến dịch quảng cáo cho nhãn hàng này.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <Button variant="secondary" onClick={() => navigate('/brand')}>
                Hủy
              </Button>
              <Button
                variant="primary"
                icon="add"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Đang Tạo...' : 'Tạo Nhãn Hàng'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default BrandCreation
