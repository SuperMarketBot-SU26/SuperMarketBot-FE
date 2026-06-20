import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignList, DashboardWidgets } from '../features/advertisement'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function AdvertisementDashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Dashboard Quảng Cáo"
          subtitle="Tổng quan hiệu suất chiến dịch & quản lý quảng cáo"
        />

        <main className="px-6 py-6 space-y-8">
          {/* Dashboard Widgets */}
          <DashboardWidgets />

          {/* Campaign List */}
          <div>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-smb-on-surface">Danh Sách Chiến Dịch</h2>
              <p className="text-sm text-smb-on-surface-variant">
                Xem, lọc và quản lý tất cả chiến dịch quảng cáo của bạn
              </p>
            </div>
            <CampaignList onCreateNew={() => navigate('/advertisement/create')} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementDashboard
