import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignEdit } from '../features/advertisement'
import { StatCard } from '../components/StatCard'

const MOCK_CAMPAIGN = {
  id: 1,
  name: 'Summer Sale - Vinamilk',
  internalId: 'ADV-2026-001',
  description: 'Chiến dịch thúc đẩy doanh số bán lẻ tại khu vực trung tâm bằng việc sử dụng đội ngũ robot giao hàng mini hỗ trợ khách hàng mua sắm nhanh.',
  brand: 'Vinamilk',
  package: 'Cao Cấp',
  status: 'running',
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  budget: '45.000.000',
  dailyMaxBudget: '1.500.000',
  warehouses: ['kho_tong_hcm', 'kho_vt_q1'],
  minStock: '10',
  impressions: 128450,
  clicks: 3842,
  activeRobots: 12,
  area: 'Khu B',
}

const ROBOT_STATS = [
  { label: 'Robot Đang Hoạt Động', value: MOCK_CAMPAIGN.activeRobots, icon: 'smart_toy', color: 'success' },
  { label: 'Khu Vực', value: MOCK_CAMPAIGN.area, icon: 'location_on', color: 'info' },
]

export function AdvertisementUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState(MOCK_CAMPAIGN)
  const [originalData] = useState(MOCK_CAMPAIGN)

  const handleSave = () => {
    console.log('Updated campaign:', formData)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleRestore = () => {
    setFormData(originalData)
  }

  const handleDiscard = () => {
    navigate(-1)
  }

  const formatLastUpdated = () => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} bởi Admin_A`
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Chỉnh Sửa Chiến Dịch"
          subtitle={`Chỉnh sửa chiến dịch: ${MOCK_CAMPAIGN.name}`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Live Status Banner */}
            <div className="grid gap-3 sm:grid-cols-2">
              {ROBOT_STATS.map((stat, idx) => (
                <StatCard
                  key={idx}
                  title={stat.label}
                  value={String(stat.value)}
                  icon={stat.icon}
                  color={stat.color}
                />
              ))}
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Cập nhật chiến dịch thành công!
              </div>
            )}

            <CampaignEdit
              data={formData}
              onChange={setFormData}
              onSave={handleSave}
              onRestore={handleRestore}
              onDiscard={handleDiscard}
              lastUpdated={formatLastUpdated()}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementUpdate
