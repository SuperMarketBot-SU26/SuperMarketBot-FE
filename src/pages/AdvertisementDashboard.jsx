import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { FilterChip, SearchBar } from '../components/FilterBar'
import { CampaignList, DashboardWidgets } from '../features/advertisement'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function AdvertisementDashboard() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Dashboard Quảng Cáo"
          subtitle="Tổng quan hiệu suất chiến dịch & quản lý quảng cáo"
        />

        <main className="px-6 py-6 space-y-8">
          <DashboardWidgets />

          <div>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-smb-on-surface">Danh Sách Chiến Dịch</h2>
                <p className="text-sm text-smb-on-surface-variant">
                  Xem, lọc và quản lý tất cả chiến dịch quảng cáo của bạn
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/advertisement/create')}
                className="flex items-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary-container shadow-sm hover:bg-smb-primary-container/90 transition-colors"
              >
                <Icon name="add" className="text-[18px]" />
                Tạo Chiến Dịch Mới
              </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Tìm kiếm chiến dịch..."
                className="max-w-xs"
              />
              <FilterChip
                label="Trạng thái"
                options={[
                  { value: 'all',       label: 'Tất Cả',            icon: 'apps'        },
                  { value: 'Inactive',  label: 'Không Hoạt Động',   icon: 'cancel'       },
                  { value: 'Active',    label: 'Hoạt Động',          icon: 'check_circle' },
                  { value: 'Paused',    label: 'Tạm Dừng',           icon: 'pause_circle' },
                  { value: 'Canceled',  label: 'Đã Hủy',             icon: 'block'        },
                  { value: 'Completed', label: 'Hoàn Thành',          icon: 'task_alt'     },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            <CampaignList
              onCreateNew={() => navigate('/advertisement/create')}
              search={search}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementDashboard
