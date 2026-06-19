import React, { useState } from 'react'
import Sidebar from '../components/sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { CampaignCreation, PackageSelector } from '../features/advertisement'

export function AdvertisementCreation() {
  const [campaignData, setCampaignData] = useState({
    name: '',
    brand: '',
    startDate: '',
    endDate: '',
  })
  const [selectedPackage, setSelectedPackage] = useState('gold')

  const handleSubmit = () => {
    console.log('Campaign data:', { ...campaignData, package: selectedPackage })
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
            <CampaignCreation 
              data={campaignData} 
              onChange={setCampaignData} 
            />

            <PackageSelector 
              value={selectedPackage}
              onChange={setSelectedPackage}
            />

            <div className="flex items-center justify-end gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <Button variant="secondary">
                Hủy
              </Button>
              <Button 
                variant="primary"
                onClick={handleSubmit}
              >
                Tạo Chiến Dịch
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementCreation
