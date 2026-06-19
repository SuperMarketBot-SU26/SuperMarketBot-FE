import React, { useState } from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const defaultRows = [
  { id: 'normal', label: 'Hàng Còn Hạn (Bình Thường)', icon: 'check_circle', stateApi: true, score: 0, color: 'text-green-600 bg-green-50 border-green-200', penaltyLabel: '—' },
  { id: 'low', label: 'Hàng Sắp Hết (Thúc Đẩy)', icon: 'warning', stateApi: true, score: 15, color: 'text-amber-600 bg-amber-50 border-amber-200', penaltyLabel: 'Khuyến khích' },
  { id: 'overstock', label: 'Tồn Kho Quá Nhiều (Xả Hàng)', icon: 'trending_up', stateApi: true, score: 30, color: 'text-blue-600 bg-blue-50 border-blue-200', penaltyLabel: 'Ưu tiên cao' },
  { id: 'oos', label: 'Hết Hàng (State_API = False)', icon: 'cancel', stateApi: false, score: -9999, color: 'text-red-600 bg-red-50 border-red-200', penaltyLabel: 'Hard Drop' },
]

export function InventoryScoreGrid({ data, onChange }) {
  const [rows, setRows] = useState(data || defaultRows)

  const handleScoreChange = (id, value) => {
    const next = rows.map((r) => (r.id === id ? { ...r, score: Number(value) } : r))
    setRows(next)
    onChange?.(next)
  }

  return (
    <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
          <span className="material-symbols-outlined text-xl text-smb-primary-container">
            inventory
          </span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-smb-on-surface">Điểm Tồn Kho — Quản Lý Nhãn Ngữ Cảnh</h3>
          <p className="text-sm text-smb-on-surface-variant">
            Bảng ánh xạ: State_API → điều chỉnh trọng số thuật toán (Inventory_Score)
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-smb-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-smb-outline-variant bg-smb-surface-container-low">
              <th className="px-4 py-3 text-left font-semibold text-smb-on-surface">Trạng Thái</th>
              <th className="px-4 py-3 text-center font-semibold text-smb-on-surface">State_API</th>
              <th className="px-4 py-3 text-right font-semibold text-smb-on-surface">Inventory_Score</th>
              <th className="px-4 py-3 text-left font-semibold text-smb-on-surface">Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`border-b last:border-0 ${idx % 2 === 0 ? 'bg-smb-surface-container-lowest' : 'bg-smb-surface-container-low/50'}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Icon name={row.icon} className={`text-[18px] ${row.color.split(' ')[0]}`} />
                    <div>
                      <p className={`font-medium ${row.color.split(' ')[0]}`}>{row.label}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${row.stateApi ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {row.stateApi ? 'True' : 'False'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      step={5}
                      value={row.score}
                      onChange={(e) => handleScoreChange(row.id, e.target.value)}
                      disabled={row.id === 'oos'}
                      className={`w-28 rounded border bg-smb-surface-container-lowest px-3 py-1.5 text-right text-sm font-semibold tabular-nums focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 ${
                        row.id === 'oos'
                          ? 'border-red-300 bg-red-50 text-red-600 cursor-not-allowed'
                          : 'border-smb-outline-variant text-smb-on-surface'
                      }`}
                    />
                    <span className="text-sm text-smb-on-surface-variant">điểm</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${row.color.split(' ')[0]}`}>{row.penaltyLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-smb-on-surface-variant">
        <Icon name="info" className="text-[16px] text-smb-primary-container" />
        Hết Hàng được hardcoded <span className="rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">-9999</span> để ẩn SKU hoàn toàn và không thể chỉnh sửa.
      </p>
    </div>
  )
}

export default InventoryScoreGrid
