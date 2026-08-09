import React, { useEffect, useMemo, useState } from 'react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import { getPackages } from '../api/adPackageApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

function PackageCard({ pkg, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pkg.packageId)}
      className={`
        relative flex flex-col rounded-lg border-2 p-4 text-left transition-all
        ${selected
          ? 'border-smb-primary-container bg-smb-active-bg shadow-[0_0_0_3px_rgb(74_222_128/0.18)]'
          : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'}
      `}
    >
      {selected && (
        <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-smb-primary-container">
          <Icon name="check" className="text-xs text-white" />
        </div>
      )}
      <div className="mb-2 flex items-center gap-2">
        <Icon name="package_2" className="text-lg text-smb-primary-container" />
        <h4 className="font-semibold text-smb-on-surface">{pkg.packageName}</h4>
      </div>
      <p className="text-xs text-smb-on-surface-variant">Ad Score: {pkg.adScore}</p>
      <div className="mt-3 space-y-1 text-xs text-smb-on-surface-variant">
        <div className="flex justify-between">
          <span>Gói:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.pricePackage)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Mỗi Route:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.priceRoute)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Mỗi Zone:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.priceZone)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Shelf:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.priceShelf)} đ</span>
        </div>
      </div>
    </button>
  )
}

export function StepBasics({ state, onChange, brandOptions, onNext, errors }) {
  const [packages, setPackages] = useState([])
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [packagesError, setPackagesError] = useState(null)

  useEffect(() => {
    setLoadingPackages(true)
    setPackagesError(null)
    getPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items ?? []
        const active = list.filter((p) => !p.status || p.status === 'Active')
        setPackages(active)
      })
      .catch((err) => setPackagesError(err?.message || 'Không tải được danh sách gói'))
      .finally(() => setLoadingPackages(false))
  }, [])

  const updateField = (field, value) => {
    const next = { ...state.basics, [field]: value }
    onChange(next, {})
  }

  const startDateError = errors?.startDate
  const endDateError =
    errors?.endDate ||
    (state.basics.startDate &&
      state.basics.endDate &&
      new Date(state.basics.endDate) <= new Date(state.basics.startDate)
      ? 'Ngày kết thúc phải sau ngày bắt đầu.'
      : null)

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-smb-on-surface">Bước 1 · Thông Tin Cơ Bản</h2>
        <p className="mt-1 text-sm text-smb-on-surface-variant">
          Nhập các thông tin bắt buộc. Các trường có dấu <span className="text-smb-error">*</span> là bắt buộc.
        </p>
      </header>

      <div className="grid gap-4 rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-6 md:grid-cols-2">
        <Input
          label="Tên Chiến Dịch"
          placeholder="VD: Sữa tươi Vinamilk Q4"
          value={state.basics.campaignName}
          onChange={(e) => updateField('campaignName', e.target.value)}
          required
          error={errors?.campaignName}
          maxLength={200}
        />
        <Select
          label="Thương Hiệu"
          placeholder="— Chọn thương hiệu —"
          options={brandOptions}
          value={state.basics.brandId ?? ''}
          onChange={(v) => updateField('brandId', v ? Number(v) : null)}
          required
          error={errors?.brandId}
        />

        <Input
          label="Ngày Bắt Đầu"
          type="date"
          value={state.basics.startDate}
          onChange={(e) => updateField('startDate', e.target.value)}
          required
          error={startDateError}
        />
        <Input
          label="Ngày Kết Thúc (Dự Kiến)"
          type="date"
          value={state.basics.endDate}
          onChange={(e) => updateField('endDate', e.target.value)}
          required
          error={endDateError}
          hint={!endDateError ? 'Phải sau ngày bắt đầu.' : undefined}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-smb-on-surface">Gói Quảng Cáo</h3>
            <p className="text-xs text-smb-on-surface-variant">
              Mỗi gói định nghĩa sẵn giá Route / Zone / Shelf dùng để tính phí ước tính.
            </p>
          </div>
          {errors?.packageId && (
            <span className="text-xs text-smb-error">{errors.packageId}</span>
          )}
        </div>

        {loadingPackages ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-smb-outline-variant bg-smb-surface-container-low py-8 text-sm text-smb-on-surface-variant">
            <Icon name="progress_activity" className="animate-spin text-[16px]" />
            Đang tải gói quảng cáo...
          </div>
        ) : packagesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {packagesError}
          </div>
        ) : packages.length === 0 ? (
          <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-6 text-center text-sm text-smb-on-surface-variant">
            Hiện chưa có gói quảng cáo nào khả dụng.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.packageId}
                pkg={pkg}
                selected={state.basics.packageId === pkg.packageId}
                onSelect={(id) => updateField('packageId', id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onNext === undefined ? undefined : () => {}} disabled>
          Hủy
        </Button>
        <Button variant="primary" icon="arrow_forward" onClick={onNext}>
          Tiếp Tục →
        </Button>
      </div>
    </section>
  )
}

export default StepBasics
