import React from 'react'

export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`smb-skeleton rounded-lg ${className}`}
      style={style}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-36" />
      </div>
      <Skeleton className="size-12 rounded-xl" />
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="relative flex h-[600px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-sm">
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="z-10 flex flex-col items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-smb-outline-variant/40 bg-smb-surface-container-low shadow-inner">
          <span className="material-symbols-outlined animate-spin text-2xl text-smb-primary">
            progress_activity
          </span>
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest shadow-sm">
      <div className="border-b border-smb-outline-variant/40 bg-smb-surface-container-low px-6 py-3.5">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-smb-outline-variant/30 px-6">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest p-4 shadow-sm gap-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  )
}

export default Skeleton
