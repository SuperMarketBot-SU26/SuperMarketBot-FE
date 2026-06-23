import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { CampaignCreation, PackageSelector } from '../features/advertisement'
import { createCampaign } from '../features/advertisement/api/adCampaignApi'
import { getBrands } from '../features/advertisement/api/brandApi'
import { getPackages } from '../features/advertisement/api/adPackageApi'

export function AdvertisementCreation() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const [campaignData, setCampaignData] = useState({
    name: '',
    brandId: '',
    startDate: '',
    endDate: '',
  })
  const [selectedPackage, setSelectedPackage] = useState('')
  const [brands, setBrands] = useState([])
  const [packages, setPackages] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [packageOptions, setPackageOptions] = useState([])

  useEffect(() => {
    getBrands()
      .then(setBrands)
      .catch(() => {})
    getPackages()
      .then(setPackages)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setBrandOptions(brands.map((b) => ({ value: b.brandId, label: b.brandName })))
  }, [brands])

  useEffect(() => {
    setPackageOptions(packages.map((p) => ({ value: p.packageId, label: p.packageName })))
  }, [packages])

  const handleSubmit = async () => {
    if (!campaignData.name.trim()) {
      setSubmitError('Vui lòng nhập tên chiến dịch.')
      return
    }
    if (!campaignData.brandId) {
      setSubmitError('Vui lòng chọn thương hiệu.')
      return
    }
    if (!selectedPackage) {
      setSubmitError('Vui lòng chọn gói quảng cáo.')
      return
    }
    if (!campaignData.startDate) {
      setSubmitError('Vui lòng chọn ngày bắt đầu.')
      return
    }
    if (!campaignData.endDate) {
      setSubmitError('Vui lòng chọn ngày kết thúc.')
      return
    }
    if (new Date(campaignData.endDate) < new Date(campaignData.startDate)) {
      setSubmitError('Ngày kết thúc phải sau ngày bắt đầu.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await createCampaign({
        campaignName: campaignData.name.trim(),
        brandId: Number(campaignData.brandId),
        packageId: Number(selectedPackage),
        startDate: new Date(campaignData.startDate).toISOString(),
        endDate: new Date(campaignData.endDate).toISOString(),
      })
      navigate('/advertisement')
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
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <CampaignCreation
              data={campaignData}
              onChange={setCampaignData}
              brandOptions={brandOptions}
            />

            <PackageSelector
              value={selectedPackage}
              onChange={setSelectedPackage}
            />

            <div className="flex items-center justify-end gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <Button variant="secondary" onClick={() => navigate('/advertisement')}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting}
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
