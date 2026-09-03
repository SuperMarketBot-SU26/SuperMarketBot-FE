import React, { useEffect, useMemo, useRef, useState } from 'react'
import Input from '../../../components/ui/Input'
import Select from '../../../components/ui/Select'
import Button from '../../../components/ui/Button'
import { getPackages } from '../api/adPackageApi'
import { uploadCampaignBanner, uploadCampaignVideo } from '../api/adCampaignApi'

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
      <p className="text-xs text-smb-on-surface-variant">Chạy đến khi hết ngân sách</p>
      <div className="mt-3 space-y-1 text-xs text-smb-on-surface-variant">
        <div className="flex justify-between">
          <span>Ngân sách:</span>
          <span className="font-bold text-smb-primary-container">{formatVND(pkg.budget)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Phí Route:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.routeUnitPrice ?? pkg.routeFee)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Phí Zone:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.zoneUnitPrice ?? pkg.zoneFee)} đ</span>
        </div>
        <div className="flex justify-between">
          <span>Phí Shelf:</span>
          <span className="font-medium text-smb-on-surface">{formatVND(pkg.shelfUnitPrice ?? pkg.shelfFee)} đ</span>
        </div>
      </div>
    </button>
  )
}

export function StepBasics({ state, onChange, brandOptions, onNext, errors, basicsErrors }) {
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

  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const bannerInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const handleBannerSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('Kích thước ảnh không được vượt quá 5MB.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, GIF).')
      return
    }

    setUploadError(null)
    setUploadingBanner(true)
    try {
      const res = await uploadCampaignBanner(file)
      onChange({ ...state.basics, bannerUrl: res.url }, {})
    } catch (err) {
      setUploadError(err?.message || 'Tải ảnh lên thất bại.')
    } finally {
      setUploadingBanner(false)
      if (bannerInputRef.current) bannerInputRef.current.value = ''
    }
  }

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 30 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError('Kích thước video không được vượt quá 30MB.')
      return
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.mp4') && !file.name.endsWith('.avi') && !file.name.endsWith('.mkv') && !file.name.endsWith('.mov')) {
      setUploadError('Chỉ hỗ trợ file video (MP4, AVI, MKV, MOV).')
      return
    }

    setUploadError(null)
    setUploadingVideo(true)
    try {
      const res = await uploadCampaignVideo(file)
      onChange({ ...state.basics, videoUrl: res.url }, {})
    } catch (err) {
      setUploadError(err?.message || 'Tải video lên thất bại.')
    } finally {
      setUploadingVideo(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  // Realtime errors > click-time errors (ưu tiên realtime).
  const mergedErrors = { ...(basicsErrors ?? {}), ...(errors ?? {}) }
  const hasBasicsErrorsLocal = Object.keys(mergedErrors).length > 0

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
          error={mergedErrors.campaignName}
          maxLength={200}
        />
        <Select
          label="Thương Hiệu"
          placeholder="— Chọn thương hiệu —"
          options={brandOptions}
          value={state.basics.brandId ?? ''}
          onChange={(v) => updateField('brandId', v ? Number(v) : null)}
          required
          error={mergedErrors.brandId}
        />
      </div>

      {/* Description & Media Uploads */}
      <div className="grid gap-6 rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-6 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-smb-on-surface">Mô Tả Chiến Dịch</label>
          <textarea
            rows={3}
            placeholder="Mô tả mục tiêu, thông điệp chiến dịch..."
            value={state.basics.description ?? ''}
            onChange={(e) => updateField('description', e.target.value)}
            className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-3 text-sm text-smb-on-surface focus:border-smb-primary focus:outline-none"
            maxLength={500}
          />
        </div>

        {/* Banner Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-smb-on-surface">
            Banner Quảng Cáo <span className="text-xs font-normal text-smb-on-surface-variant">(Tùy chọn)</span>
          </label>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-smb-outline-variant bg-smb-surface-container-low p-4 text-center min-h-[160px]">
            {state.basics.bannerUrl ? (
              <div className="relative w-full max-h-40 overflow-hidden rounded-lg group">
                <img src={state.basics.bannerUrl} alt="Banner Preview" className="w-full max-h-36 object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => updateField('bannerUrl', '')}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-90 hover:opacity-100"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-4 cursor-pointer hover:text-smb-primary w-full h-full"
              >
                {uploadingBanner ? (
                  <Icon name="progress_activity" className="animate-spin text-2xl text-smb-primary" />
                ) : (
                  <Icon name="image" className="text-3xl text-smb-primary-container" />
                )}
                <span className="text-xs font-medium text-smb-on-surface">Tải ảnh lên (Max 5MB)</span>
                <span className="text-[10px] text-smb-on-surface-variant">JPG, PNG, WebP, GIF</span>
              </button>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleBannerSelect}
            />
          </div>
        </div>

        {/* Video Upload */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-smb-on-surface">
            Video Quảng Cáo <span className="text-xs font-normal text-smb-on-surface-variant">(Tùy chọn)</span>
          </label>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-smb-outline-variant bg-smb-surface-container-low p-4 text-center min-h-[160px]">
            {state.basics.videoUrl ? (
              <div className="relative w-full max-h-40 overflow-hidden rounded-lg group">
                <video src={state.basics.videoUrl} className="w-full max-h-36 object-contain mx-auto" controls />
                <button
                  type="button"
                  onClick={() => updateField('videoUrl', '')}
                  className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-90 hover:opacity-100"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingVideo}
                onClick={() => videoInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 py-4 cursor-pointer hover:text-smb-primary w-full h-full"
              >
                {uploadingVideo ? (
                  <Icon name="progress_activity" className="animate-spin text-2xl text-smb-primary" />
                ) : (
                  <Icon name="movie" className="text-3xl text-smb-primary-container" />
                )}
                <span className="text-xs font-medium text-smb-on-surface">Tải video lên (Max 30MB)</span>
                <span className="text-[10px] text-smb-on-surface-variant">MP4, AVI, MKV, MOV</span>
              </button>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={handleVideoSelect}
            />
          </div>
        </div>

        {mergedErrors.media && (
          <div className="md:col-span-2 flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-medium">
            <Icon name="error" className="text-[16px]" />
            <span>{mergedErrors.media}</span>
          </div>
        )}

        {uploadError && (
          <div className="md:col-span-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <Icon name="error" className="mt-0.5 text-[16px]" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
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

      {/* Delivery Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Hình Thức Phát Quảng Cáo</h3>
          <p className="text-xs text-smb-on-surface-variant">
            Quảng cáo toàn bộ siêu thị — robot phát ad khi dừng ở khu vực hoặc kệ hàng.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { value: 'Route', label: 'Tuyến Đường', icon: 'route', desc: 'Quảng cáo toàn bộ siêu thị' },
            { value: 'Zone', label: 'Khu Vực / Kệ', icon: 'grid_view', desc: 'Robot dừng lại ở zone/kệ để phát ad' },
            { value: 'Both', label: 'Cả Hai', icon: 'sync', desc: 'Robot đi lộ trình và dừng ở zone để phát ad' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('deliveryMode', opt.value)}
              className={`
                flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all
                ${state.basics.deliveryMode === opt.value
                  ? 'border-smb-primary-container bg-smb-active-bg'
                  : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'}
              `}
            >
              <div className="flex items-center gap-2">
                <Icon name={opt.icon} className="text-lg text-smb-primary-container" />
                <span className="font-semibold text-smb-on-surface">{opt.label}</span>
                {state.basics.deliveryMode === opt.value && (
                  <Icon name="check_circle" className="ml-auto text-sm text-smb-primary-container" />
                )}
              </div>
              <span className="text-xs text-smb-on-surface-variant">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" icon="arrow_forward" onClick={onNext} disabled={hasBasicsErrorsLocal}>
          Tiếp Tục →
        </Button>
      </div>
    </section>
  )
}

export default StepBasics
