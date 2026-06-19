import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const defaultPackages = [
  { id: 'organic', name: 'Organic', label: 'Tự Nhiên', icon: 'eco', color: 'bg-green-100 text-green-700', baseFee: 0 },
  { id: 'basic', name: 'Basic', label: 'Cơ Bản', icon: 'radio_button_checked', color: 'bg-gray-100 text-gray-600', baseFee: 0 },
  { id: 'silver', name: 'Silver', label: 'Bạc', icon: 'military_tech', color: 'bg-slate-100 text-slate-500', baseFee: 500 },
  { id: 'gold', name: 'Gold', label: 'Vàng', icon: 'stars', color: 'bg-yellow-50 text-yellow-700', baseFee: 1500 },
  { id: 'premium', name: 'Premium', label: 'Cao Cấp', icon: 'diamond', color: 'bg-sky-50 text-sky-700', baseFee: 3000 },
]

export function PackageFeeGrid({ data, onChange }) {
  const [packages, setPackages] = useState(data || defaultPackages)

  const handleFeeChange = (id, value) => {
    const next = packages.map((p) => (p.id === id ? { ...p, baseFee: Number(value) } : p))
    setPackages(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            price_check
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Phí Gói Thương Hiệu Cao Cấp</h3>
          <p className="text-sm text-smb-on-surface-variant">Phí gói thương hiệu cao cấp (Premium_Package_Fee)</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-smb-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-smb-outline-variant bg-smb-surface-container-low">
              <th className="px-4 py-3 text-left font-semibold text-smb-on-surface">Gói</th>
              <th className="px-4 py-3 text-center font-semibold text-smb-on-surface">Icon</th>
              <th className="px-4 py-3 text-right font-semibold text-smb-on-surface">Phí (VND)</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, idx) => (
              <tr
                key={pkg.id}
                className={`border-b last:border-0 ${idx % 2 === 0 ? 'bg-smb-surface-container-lowest' : 'bg-smb-surface-container-low/50'}`}
              >
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${pkg.color}`}>
                    {pkg.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Icon name={pkg.icon} className={`text-[20px] ${pkg.color.split(' ')[1]}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step={100}
                      value={pkg.baseFee}
                      onChange={(e) => handleFeeChange(pkg.id, e.target.value)}
                      className="w-32 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 tabular-nums"
                    />
                    <span className="text-sm text-smb-on-surface-variant">VND</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PackageFeeGrid
