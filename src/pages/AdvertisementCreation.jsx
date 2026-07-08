import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { CampaignCreation, PackageSelector, ProductSelector } from '../features/advertisement'
import { createCampaign } from '../features/advertisement/api/adCampaignApi'
import { getBrands } from '../features/brand/api/brandApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function AdvertisementCreation() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [campaignData, setCampaignData] = useState({
    campaignName: '',
    brandId: '',
    startDate: '',
    endDate: '',
  })
  const [selectedPackage, setSelectedPackage] = useState('')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [brandOptions, setBrandOptions] = useState([])

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setBrandOptions(brands.map((b) => ({ value: b.brandId, label: b.brandName })))
  }, [brands])

  const validate = () => {
    if (!campaignData.campaignName.trim()) {
      setSubmitError('Vui lòng nhập tên chiến dịch.')
      return false
    }
    if (!campaignData.brandId) {
      setSubmitError('Vui lòng chọn thương hiệu.')
      return false
    }
    if (!selectedPackage) {
      setSubmitError('Vui lòng chọn gói quảng cáo.')
      return false
    }
    if (!campaignData.startDate) {
      setSubmitError('Vui lòng chọn ngày bắt đầu.')
      return false
    }
    if (!campaignData.endDate) {
      setSubmitError('Vui lòng chọn ngày kết thúc.')
      return false
    }
    if (new Date(campaignData.endDate) < new Date(campaignData.startDate)) {
      setSubmitError('Ngày kết thúc phải sau ngày bắt đầu.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await createCampaign({
        packageId: Number(selectedPackage),
        brandId: Number(campaignData.brandId),
        robotZoneId: null,
        campaignName: campaignData.campaignName.trim(),
        startDate: new Date(campaignData.startDate).toISOString(),
        endDate: new Date(campaignData.endDate).toISOString(),
        productIds: selectedProducts,
      })
      setSubmitSuccess(true)
      setTimeout(() => navigate('/advertisement'), 1500)
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err.message || 'Tạo chiến dịch thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Khởi Tạo Chiến Dịch"
          subtitle="Tạo chiến dịch khuyến mãi mới cho thương hiệu đối tác"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {submitError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <Icon name="error" className="text-[16px]" />
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <Icon name="check_circle" className="text-[16px]" />
                Tạo chiến dịch thành công! Đang chuyển hướng...
              </div>
            )}

            {/* Step 1: Campaign info */}
            <CampaignCreation
              data={campaignData}
              onChange={setCampaignData}
              brandOptions={brandOptions}
            />

            {/* Step 2: Package selection */}
            <PackageSelector
              value={selectedPackage}
              onChange={setSelectedPackage}
              loading={submitting}
            />

            {/* Step 3: Product selection */}
            <ProductSelector
              value={selectedProducts}
              onChange={setSelectedProducts}
            />

            {/* Step 4: Robot Zone (sẽ gán qua backend khi endpoint sẵn sàng) */}
            <div className="rounded-lg border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
                  <Icon name="smart_toy" className="text-xl text-smb-primary-container" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-smb-on-surface">Khu Vực Robot</h3>
                  <p className="text-sm text-smb-on-surface-variant">Chọn khu vực hoạt động của Robot</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-smb-outline bg-smb-surface-container-low p-4 text-sm text-smb-outline">
                <div className="flex items-center gap-2">
                  <Icon name="lock" className="text-[16px]" />
                  Tính năng đang phát triển — robotZoneId sẽ được thiết lập tự động hoặc chọn thủ công sau khi BE có endpoint.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <Button
                variant="secondary"
                onClick={() => navigate('/advertisement')}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                icon="add"
                onClick={handleSubmit}
                disabled={submitting || submitSuccess}
              >
                {submitting ? 'Đang Tạo...' : 'Tạo Chiến Dịch'}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementCreation
