import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function UserRelevanceSettings({ data, onChange }) {
  const [settings, setSettings] = useState(data || {
    dietGuestMode: 0,
    dietPerfectMatch: 50,
    dietHardPenalty: -9999,
    budgetSafeRange: 0,
    budgetCartStopLoss: -50,
    loyaltyPurchaseThreshold: 5,
    loyaltyDaysWindow: 30,
    loyaltyBrandBoost: 20,
  })

  const handleChange = (field, value) => {
    const next = { ...settings, [field]: value }
    setSettings(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            person
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Bộ Lọc Cá Nhân Hóa & AI</h3>
          <p className="text-sm text-smb-on-surface-variant">
            Diet_Score, Budget_Score, History_Score (User_Relevance_Score)
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Diet Score */}
        <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="restaurant" className="text-[18px] text-smb-on-surface-variant" />
            <p className="text-sm font-semibold text-smb-on-surface">Điểm Chế Độ Ăn (Diet_Score)</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Chế Độ Khách (Guest)</p>
                <p className="text-xs text-smb-on-surface-variant">Người dùng chưa đăng nhập</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.dietGuestMode}
                  onChange={(e) => handleChange('dietGuestMode', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Khớp Hoàn Hảo</p>
                <p className="text-xs text-smb-on-surface-variant">Phù hợp hoàn toàn với chế độ ăn</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.dietPerfectMatch}
                  onChange={(e) => handleChange('dietPerfectMatch', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Phạt Nặng — Vi Phạm Dị Ứng</p>
                <p className="text-xs text-smb-on-surface-variant">Hard drop khi vi phạm dị ứng người dùng</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.dietHardPenalty}
                  onChange={(e) => handleChange('dietHardPenalty', Number(e.target.value))}
                  className="w-24 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-right text-sm font-semibold text-red-600 tabular-nums focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Score */}
        <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="account_balance_wallet" className="text-[18px] text-smb-on-surface-variant" />
            <p className="text-sm font-semibold text-smb-on-surface">Điểm Ngân Sách (Budget_Score)</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Khoảng An Toàn</p>
                <p className="text-xs text-smb-on-surface-variant">Giỏ hàng nằm trong ngân sách cho phép</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.budgetSafeRange}
                  onChange={(e) => handleChange('budgetSafeRange', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Vượt Ngân Sách Tối Đa</p>
                <p className="text-xs text-smb-on-surface-variant">Giỏ hàng vượt ngân sách người dùng đặt ra</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.budgetCartStopLoss}
                  onChange={(e) => handleChange('budgetCartStopLoss', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
          </div>
        </div>

        {/* History Score */}
        <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="favorite" className="text-[18px] text-smb-on-surface-variant" />
            <p className="text-sm font-semibold text-smb-on-surface">Điểm Lịch Sử — Tăng Trọng Khách Hàng Thân Thiết</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Số Lần Mua Tối Thiểu (CRM)</p>
                <p className="text-xs text-smb-on-surface-variant">Số lần mua tối thiểu để nhận tăng điểm</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={settings.loyaltyPurchaseThreshold}
                  onChange={(e) => handleChange('loyaltyPurchaseThreshold', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">lần</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Khung Thời Gian</p>
                <p className="text-xs text-smb-on-surface-variant">Đếm số lần mua trong bao lâu</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={settings.loyaltyDaysWindow}
                  onChange={(e) => handleChange('loyaltyDaysWindow', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">ngày</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-smb-on-surface">Điểm Tăng Thưởng Thân Thiết</p>
                <p className="text-xs text-smb-on-surface-variant">Điểm thưởng khi đủ điều kiện</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.loyaltyBrandBoost}
                  onChange={(e) => handleChange('loyaltyBrandBoost', Number(e.target.value))}
                  className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
                />
                <span className="text-sm text-smb-on-surface-variant">điểm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserRelevanceSettings
