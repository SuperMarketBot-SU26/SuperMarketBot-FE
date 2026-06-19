import React from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import {
  SystemBaseline,
  PackageFeeGrid,
  SurgeCoefficients,
  AdScoreWeights,
  OperationalSettings,
  InventoryScoreGrid,
  UserRelevanceSettings,
} from '../features/algorithm/components'

export function ParameterSettings() {
  const handleSave = () => {
    console.log('Đang lưu thông số thuật toán...')
  }

  const handleReset = () => {
    console.log('Đang khôi phục mặc định...')
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Cấu Hình Thuật Toán" />

      <div className="pl-[260px]">
        <Navbar
          title="Cấu Hình Thuật Toán"
          subtitle="Thiết lập thông số Dynamic CPC & Priority Score Engine"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-8">
            {/* MODULE A: Động Cơ Thanh Toán Động */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded bg-smb-primary-container text-smb-on-primary">
                  <span className="text-sm font-bold">A</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-smb-on-surface">Động Cơ Thanh Toán Động</h2>
                  <p className="text-xs text-smb-on-surface-variant">
                    Final_Cost = (Base_Price + Premium_Package_Fee) × M_time × M_event × M_zone × M_promo
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <SystemBaseline />
                <PackageFeeGrid />
                <SurgeCoefficients />
              </div>
            </section>

            {/* MODULE B: Động Cơ Tính Điểm Ưu Tiên */}
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded bg-smb-secondary-container text-smb-on-secondary-container">
                  <span className="text-sm font-bold">B</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-smb-on-surface">Động Cơ Tính Điểm Ưu Tiên</h2>
                  <p className="text-xs text-smb-on-surface-variant">
                    Final_Priority_Score = Ad_Score + Operational_Score + User_Relevance_Score
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <AdScoreWeights />
                <OperationalSettings />
                <InventoryScoreGrid />
                <UserRelevanceSettings />
              </div>
            </section>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-4">
              <Button variant="secondary" onClick={handleReset}>
                Khôi Phục Mặc Định
              </Button>
              <Button
                variant="primary"
                icon="save"
                iconPosition="left"
                onClick={handleSave}
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ParameterSettings
