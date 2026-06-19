import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const defaultTiers = [
  { id: 'organic', name: 'Organic', label: 'Tự Nhiên', baseScore: 0, color: 'bg-green-100 text-green-700' },
  { id: 'basic', name: 'Basic', label: 'Cơ Bản', baseScore: 20, color: 'bg-gray-100 text-gray-600' },
  { id: 'silver', name: 'Silver', label: 'Bạc', baseScore: 40, color: 'bg-slate-100 text-slate-500' },
  { id: 'gold', name: 'Gold', label: 'Vàng', baseScore: 60, color: 'bg-yellow-50 text-yellow-700' },
  { id: 'premium', name: 'Premium', label: 'Cao Cấp', baseScore: 80, color: 'bg-sky-50 text-sky-700' },
]

const tierIcons = {
  organic: 'eco',
  basic: 'radio_button_checked',
  silver: 'military_tech',
  gold: 'stars',
  premium: 'diamond',
}

export function AdScoreWeights({ data, onChange }) {
  const [tiers, setTiers] = useState(data || defaultTiers)

  const handleScoreChange = (id, value) => {
    const next = tiers.map((t) => (t.id === id ? { ...t, baseScore: Number(value) } : t))
    setTiers(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            star_rate
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Trọng Số Điểm Quảng Cáo</h3>
          <p className="text-sm text-smb-on-surface-variant">Base_Ad_Score cho từng gói thương hiệu (Ad_Score)</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex items-center justify-between rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tier.color}`}>
                <Icon name={tierIcons[tier.id]} className={`text-[14px] ${tier.color.split(' ')[1]}`} />
                {tier.label}
              </span>
              <span className="text-xs text-smb-on-surface-variant">Base_Ad_Score</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={200}
                step={5}
                value={tier.baseScore}
                onChange={(e) => handleScoreChange(tier.id, e.target.value)}
                className="w-24 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold text-smb-on-surface tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20"
              />
              <span className="text-sm text-smb-on-surface-variant">điểm</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdScoreWeights
