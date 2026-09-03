import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { getBrand, updateBrand } from '../features/brand/api/brandApi'

export function BrandUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [originalData, setOriginalData] = useState(null)

  const [form, setForm] = useState({
    brandName: '',
    description: '',
  })

  const [stats, setStats] = useState([
    { label: 'Chiến Dịch Đang Chạy', value: 0, color: 'success' },
  ])

  const fetchBrand = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getBrand(Number(id))
      const norm = {
        brandName: data.brandName || '',
        description: data.description || '',
      }
      setForm(norm)
      setOriginalData(norm)
      setStats([
        {
          label: 'Chiến Dịch Đang Chạy',
          value: data.activeCampaignCount ?? 0,
          color: 'success',
        },
      ])
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải nhãn hàng.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.brandName.trim()) {
      setSaveError('Tên nhãn hàng không được để trống.')
      return
    }
    if (form.brandName.trim().length > 100) {
      setSaveError('Tên nhãn hàng không được vượt quá 100 ký tự.')
      return
    }
    if (form.description && form.description.length > 500) {
      setSaveError('Mô tả không được vượt quá 500 ký tự.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await updateBrand(Number(id), {
        brandName: form.brandName.trim(),
        description: form.description.trim() || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchBrand()
    } catch (err) {
      setSaveError(err?.response?.data?.error || err.message || 'Cập nhật nhãn hàng thất bại.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Quản Lý Nhãn Hàng" />
        <div className="pl-[260px] flex items-center justify-center min-h-screen">
          <span className="material-symbols-outlined animate-spin text-2xl text-smb-on-surface-variant">progress_activity</span>
          <span className="ml-2 text-sm text-smb-on-surface-variant">Đang tải nhãn hàng...</span>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Quản Lý Nhãn Hàng" />
        <div className="pl-[260px] flex flex-col items-center justify-center min-h-screen gap-4">
          <span className="material-symbols-outlined text-4xl text-smb-error">error</span>
          <p className="text-sm text-smb-error">{fetchError}</p>
          <Button variant="secondary" onClick={() => navigate('/brand')}> Quay lại</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Nhãn Hàng" />

      <div className="pl-[260px]">
        <Navbar
          title="Chỉnh Sửa Nhãn Hàng"
          subtitle={`Chỉnh sửa: ${originalData?.brandName || ''}`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {saveError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {/* Stats */}
            <div className="max-w-xs">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6 min-h-[120px]"
                >
                  <div>
                    <p className="text-sm font-medium text-smb-on-surface-variant">{stat.label}</p>
                    <p className="mt-3 text-3xl font-bold text-smb-on-surface tabular-nums">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Cập nhật nhãn hàng thành công!
              </div>
            )}

            {/* Form Card */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
                  <span className="material-symbols-outlined text-xl text-smb-primary-container">
                    edit
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-smb-on-surface">Thông Tin Nhãn Hàng</h3>
                  <p className="text-sm text-smb-on-surface-variant">Cập nhật thông tin cơ bản của nhãn hàng</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-smb-on-surface">
                    Tên Nhãn Hàng <span className="text-smb-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Vinamilk, TH True Milk, Nestlé..."
                    value={form.brandName}
                    onChange={(e) => handleChange('brandName', e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-5 py-4 text-base text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                    required
                  />
                  <p className="text-xs text-smb-on-surface-variant">
                    Tối đa 100 ký tự ({form.brandName.length}/100)
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-smb-on-surface">Mô Tả</label>
                  <textarea
                    placeholder="Mô tả ngắn về nhãn hàng (tùy chọn)..."
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={5}
                    maxLength={500}
                    className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-5 py-4 text-base text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 resize-none"
                  />
                  <p className="text-xs text-smb-on-surface-variant">
                    Tối đa 500 ký tự ({form.description.length}/500)
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <div className="flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="primary"
                  icon="save"
                  size="md"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Đang Lưu...' : 'Lưu Cập Nhật'}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default BrandUpdate
