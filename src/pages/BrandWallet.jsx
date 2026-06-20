import React from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function BrandWallet() {
  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Quản Lý Ví Brand"
          subtitle="Đối soát và quản lý ví tài chính của các thương hiệu"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-center justify-center py-24 text-smb-on-surface-variant">
              <Icon name="account_balance_wallet" className="text-[64px]" />
              <p className="mt-4 text-lg font-medium">Trang đang được phát triển</p>
              <p className="mt-1 text-sm">Tính năng này sẽ sớm được cập nhật</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default BrandWallet
