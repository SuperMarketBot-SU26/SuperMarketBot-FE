import React from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { AdPackageList } from '../features/advertisement'

export function AdPackageCreation() {
  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Gói Quảng Cáo" />

      <div className="pl-[260px]">
        <Navbar
          title="Quản Lý Gói Quảng Cáo"
          subtitle="Tạo, chỉnh sửa và quản lý các gói quảng cáo trong hệ thống"
        />

        <main className="px-6 py-6">
          <AdPackageList />
        </main>
      </div>
    </div>
  )
}

export default AdPackageCreation
