import React from 'react'
import { TableSkeleton } from './ui/Skeleton'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const BADGE_VARIANTS = {
  success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300',
  danger: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-300',
  info: 'bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300',
  neutral: 'bg-slate-500/10 text-slate-700 border-slate-500/30 dark:bg-slate-500/20 dark:text-slate-300',
  primary: 'bg-emerald-600/15 text-emerald-700 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-300',
}

export function Badge({ children, variant = 'neutral', icon, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${BADGE_VARIANTS[variant]} ${className}`}>
      {icon && <Icon name={icon} className="text-[12px]" />}
      {children}
    </span>
  )
}

export function DataTable({ columns, data, emptyMessage = 'Không tìm thấy dữ liệu phù hợp', onRowClick, loading = false }) {
  if (loading) {
    return <TableSkeleton rows={5} cols={columns.length} />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-xs">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-smb-outline-variant/60 bg-smb-surface-container-low/70">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3.5 align-middle text-${col.align || 'left'} whitespace-nowrap font-bold uppercase tracking-wider text-smb-on-surface-variant`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-smb-outline-variant/30">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-smb-on-surface-variant">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-smb-surface-container-low">
                    <Icon name="inbox" className="text-2xl text-smb-outline" />
                  </div>
                  <p className="text-xs font-medium">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className={`
                  transition-colors duration-150
                  ${idx % 2 === 0 ? 'bg-smb-surface-container-lowest' : 'bg-smb-surface-container-low/30'}
                  ${onRowClick ? 'cursor-pointer hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 align-middle text-${col.align || 'left'} ${col.className || ''}`}
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
