import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { StatCard } from '../components/StatCard'
import { FormModal, FormField } from '../components/FormModal'
import { getBrand, updateBrand, topUpWallet } from '../features/brand/api/brandApi'

const formatVND = (value) =>
  Number(value || 0).toLocaleString('vi-VN')

const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]

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
    { label: 'Số Dư Ví Hiện Tại', value: '—', icon: 'account_balance_wallet', color: 'info' },
    { label: 'Chiến Dịch Đang Chạy', value: 0, icon: 'campaign', color: 'success' },
  ])

  // Topup modal state
  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('')
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const [topupSuccess, setTopupSuccess] = useState(null)

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
          label: 'Số Dư Ví Hiện Tại',
          value: `${formatVND(data.wallet)} đ`,
          icon: 'account_balance_wallet',
          color: 'info',
          action: {
            label: 'Nạp Tiền Ví',
            icon: 'add_card',
            onClick: () => setTopupOpen(true),
          },
        },
        {
          label: 'Chiến Dịch Đang Chạy',
          value: data.activeCampaignCount ?? 0,
          icon: 'campaign',
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

  const handleRestore = () => {
    if (originalData) setForm({ ...originalData })
  }

  const handleDiscard = () => {
    navigate('/brand')
  }

  const openTopup = () => {
    setTopupAmount('')
    setTopupSuccess(null)
    setTopupOpen(true)
  }

  const closeTopup = () => {
    setTopupOpen(false)
    setTopupAmount('')
    setTopupSuccess(null)
  }

  const handleTopupSubmit = async () => {
    const raw = topupAmount.replace(/[.\s]/g, '')
    const amount = Number(raw)

    if (!raw || isNaN(amount) || amount <= 0) {
      setTopupSuccess({ error: 'Số tiền nạp phải lớn hơn 0.' })
      return
    }
    if (amount > 999_999_999) {
      setTopupSuccess({ error: 'Số tiền nạp tối đa là 999.999.999 đ.' })
      return
    }

    setTopupSubmitting(true)
    setTopupSuccess(null)
    try {
      const result = await topUpWallet(Number(id), { amount })
      setTopupSuccess({
        ok: true,
        message: `Nạp thành công ${formatVND(result.amountAdded)} đ!`,
        detail: `Số dư trước: ${formatVND(result.previousBalance)} đ → Số dư mới: ${formatVND(result.newBalance)} đ`,
      })
      setTopupAmount('')
      fetchBrand()
    } catch (err) {
      setTopupSuccess({ error: err?.response?.data?.error || err.message || 'Nạp tiền thất bại.' })
    } finally {
      setTopupSubmitting(false)
    }
  }

  const formatLastUpdated = () => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} bởi Admin_A`
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
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat, idx) => (
                <div key={idx} className="relative">
                  <StatCard
                    title={stat.label}
                    value={String(stat.value)}
                    icon={stat.icon}
                    color={stat.color}
                  />
                  {stat.action && (
                    <button
                      onClick={stat.action.onClick}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-xs font-medium text-smb-primary-container hover:bg-smb-primary-container/10 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">{stat.action.icon}</span>
                      {stat.action.label}
                    </button>
                  )}
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

            {/* Actions */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              {formatLastUpdated && (
                <p className="mb-4 text-xs text-smb-on-surface-variant">
                  Lần cập nhật cuối: <strong>{formatLastUpdated()}</strong>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" icon="history" size="sm" onClick={handleRestore}>
                    Khôi Phục Dữ Liệu Gốc
                  </Button>
                  <Button variant="outline" icon="delete_forever" size="sm" onClick={handleDiscard}>
                    Hủy Thay Đổi
                  </Button>
                </div>
                <Button
                  variant="primary"
                  icon="save"
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

      {/* Topup Modal */}
      {topupOpen && (
        <FormModal
          title="Nạp Tiền Ví"
          onClose={closeTopup}
          onSubmit={handleTopupSubmit}
        >
          {topupSuccess?.error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {topupSuccess.error}
            </div>
          )}

          {topupSuccess?.ok && (
            <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700 space-y-1">
              <p className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                {topupSuccess.message}
              </p>
              <p className="text-xs text-green-600/80">{topupSuccess.detail}</p>
            </div>
          )}

          <FormField label="Số tiền nạp (VNĐ)">
            <input
              type="text"
              inputMode="numeric"
              placeholder="VD: 5.000.000"
              value={topupAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '')
                if (raw === '') { setTopupAmount(''); return }
                const num = Number(raw)
                setTopupAmount(num.toLocaleString('vi-VN'))
              }}
              className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2.5 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
              autoFocus
            />
          </FormField>

          <div className="space-y-2">
            <p className="text-xs font-medium text-smb-on-surface-variant">Nạp nhanh:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTopupAmount(amount.toLocaleString('vi-VN'))}
                  className="rounded-lg border border-smb-outline-variant bg-smb-surface-container px-3 py-1.5 text-xs font-medium text-smb-on-surface hover:bg-smb-primary-container/10 hover:border-smb-primary-container transition-colors"
                >
                  {amount >= 1_000_000
                    ? `${amount / 1_000_000}M`
                    : `${amount / 1000}K`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeTopup}>
              {topupSuccess?.ok ? 'Đóng' : 'Hủy'}
            </Button>
            {!topupSuccess?.ok && (
              <Button
                variant="primary"
                icon="add_card"
                type="submit"
                disabled={topupSubmitting}
              >
                {topupSubmitting ? 'Đang xử lý...' : 'Xác Nhận Nạp Tiền'}
              </Button>
            )}
          </div>
        </FormModal>
      )}
    </div>
  )
}

export default BrandUpdate
