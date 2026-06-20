import React from 'react'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const BADGE_VARIANTS = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  primary: 'bg-smb-primary-container/10 text-smb-primary-container border-smb-primary-container/20',
}

export function Badge({ children, variant = 'neutral', icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_VARIANTS[variant]} ${className}`}>
      {icon && <Icon name={icon} className="text-[12px]" />}
      {children}
    </span>
  )
}

export function DataTable({ columns, data, emptyMessage = 'Không có dữ liệu', onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-smb-outline-variant">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-smb-outline-variant bg-smb-surface-container-low">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-${col.align || 'left'} whitespace-nowrap font-semibold text-smb-on-surface`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-smb-on-surface-variant">
                <div className="flex flex-col items-center gap-2">
                  <Icon name="inbox" className="text-[32px]" />
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-smb-outline-variant last:border-0 transition-colors
                  ${idx % 2 === 0 ? 'bg-smb-surface-container-lowest' : 'bg-smb-surface-container-low/50'}
                  ${onRowClick ? 'cursor-pointer hover:bg-smb-active-bg' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-${col.align || 'left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
