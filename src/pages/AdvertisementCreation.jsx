import React from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignCreateWizard } from '../features/advertisement/wizard/CampaignCreateWizard'

export function AdvertisementCreation() {
  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Khởi Tạo Chiến Dịch"
          subtitle="Wizard 3 bước: Cơ bản → Targeting → Review"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl">
            <CampaignCreateWizard />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementCreation
