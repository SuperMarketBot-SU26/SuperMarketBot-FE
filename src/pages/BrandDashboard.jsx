import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { BrandWidgets, BrandTable } from '../features/brand'

export function BrandDashboard() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Nhãn Hàng" />

      <div className="pl-[260px]">
        <Navbar
          title="Dashboard Nhãn Hàng"
          subtitle="Tổng quan ví, chiến dịch và hiệu suất nhãn hàng đối tác"
        />

        <main className="px-6 py-6 space-y-8">
          {/* Dashboard Widgets */}
          <BrandWidgets />

          {/* Brand List */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-smb-on-surface">Danh Sách Nhãn Hàng</h2>
                <p className="text-sm text-smb-on-surface-variant">
                  Tất cả nhãn hàng đang có chiến dịch quảng cáo trong hệ thống
                </p>
              </div>
            </div>
            <BrandTable />
          </div>
        </main>
      </div>
    </div>
  )
}

export default BrandDashboard
