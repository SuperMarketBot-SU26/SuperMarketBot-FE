import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { BrandWidgets, BrandTable } from '../features/brand'
import { getBrands } from '../features/brand/api/brandApi'

export function BrandDashboard() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBrands()
      const list = Array.isArray(data) ? data : data?.items ?? []
      setBrands(list)
    } catch {
      setBrands([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Nhãn Hàng" />

      <div className="pl-[260px]">
        <Navbar
          title="Dashboard Nhãn Hàng"
          subtitle="Tổng quan ví, chiến dịch và hiệu suất nhãn hàng đối tác"
        />

        <main className="px-6 py-6 space-y-6 max-w-[1600px] mx-auto">
          {/* 1. KPIs & Visual Analytics */}
          <BrandWidgets brands={brands} loading={loading} />

          {/* 2. Brand Partner Directory & Operations */}
          <BrandTable brands={brands} loading={loading} onRefresh={fetchBrands} />
        </main>
      </div>
    </div>
  )
}

export default BrandDashboard
