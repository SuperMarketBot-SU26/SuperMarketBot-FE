import React, { useEffect, useState } from 'react'
import { getProducts } from '../../product/api/productApi'
import { getCampaignSponsoredProducts, assignCampaignSponsoredProducts } from '../api/adCampaignApi'
import { getErrorMessage } from '../../../api/client'
import { buildImageUrl } from '../../../utils/cloudinary'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function CampaignProductsTab({ products, sponsoredProductCount, canEdit = true, campaignId, brandId, onChanged }) {
  const [internalProducts, setInternalProducts] = useState(products)
  const [loading, setLoading] = useState(false)
  const items = Array.isArray(products ?? internalProducts) ? (products ?? internalProducts) : []
  const totalCount = sponsoredProductCount ?? items.length
  const [open, setOpen] = useState(false)

  // Fetch sponsored products from BE if not provided via props
  useEffect(() => {
    if (!campaignId) return
    // Only auto-fetch if products prop is not provided (undefined/null)
    if (products !== undefined && products !== null) return
    let cancelled = false
    setLoading(true)
    getCampaignSponsoredProducts(campaignId)
      .then((data) => {
        if (cancelled) return
        const list = data?.products ?? data?.items ?? data ?? []
        setInternalProducts(list)
      })
      .catch(() => { /* silently fail — show empty state */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [campaignId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-smb-on-surface">Sản phẩm tài trợ</h3>
          <p className="mt-0.5 text-xs text-smb-on-surface-variant">
            Tổng cộng: <strong>{totalCount}</strong> sản phẩm
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-smb-primary-container px-3 py-1.5 text-xs font-medium text-smb-on-primary-container shadow-sm hover:opacity-90"
          >
            <Icon name="add" className="text-[14px]" />
            Thêm sản phẩm
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest py-12 text-sm text-smb-on-surface-variant">
          <Icon name="progress_activity" className="mr-2 animate-spin text-[16px]" />
          Đang tải sản phẩm...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest py-12 text-center text-sm text-smb-on-surface-variant">
          <Icon name="inventory_2" className="mx-auto mb-2 block text-[28px]" />
          Chưa có sản phẩm tài trợ.
          {canEdit && (
            <p className="mt-1 text-xs text-smb-on-surface-variant/70">
              Nhấn nút <strong>Thêm sản phẩm</strong> ở trên để gắn sản phẩm vào chiến dịch.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const pid = p.productId ?? p.id
            const name = p.name ?? p.productName ?? '—'
            const sku = p.sku ?? ''
            const price = p.price ?? null
            // buildImageUrl: Cloudinary URL gets transform; legacy/local returns
            // placeholder so we know it's broken. External URL is left alone.
            const imageUrl = buildImageUrl(p.imageUrl ?? p.image ?? null, {
              width: 96,
              height: 96,
              crop: 'fill',
              quality: 'auto',
              format: 'auto',
            })
            const categoryName = p.categoryName ?? p.category?.name ?? null
            return (
              <div
                key={pid}
                className="flex items-center gap-3 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-3 transition hover:border-smb-primary-container/50"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name}
                    className="size-12 shrink-0 rounded-md object-cover"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retried) {
                        e.currentTarget.dataset.retried = '1'
                        setTimeout(() => { e.currentTarget.src = imageUrl }, 2000)
                        return
                      }
                      e.currentTarget.onerror = null
                      e.currentTarget.src = '/placeholder-needs-reupload.png'
                      e.currentTarget.classList.add('object-contain')
                      e.currentTarget.classList.remove('object-cover')
                    }}
                  />
                ) : null}
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-md bg-smb-primary-container/10 text-smb-primary-container ${imageUrl ? 'hidden' : ''}`}
                >
                  <Icon name="inventory_2" className="text-[22px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-smb-on-surface" title={name}>
                    {name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-smb-on-surface-variant">
                    {sku && <span className="truncate">{sku}</span>}
                    {price != null && (
                      <span className="font-medium text-smb-primary">
                        {Number(price).toLocaleString('vi-VN')}₫
                      </span>
                    )}
                  </div>
                  {categoryName && (
                    <p className="mt-0.5 truncate text-[11px] text-smb-on-surface-variant/70">
                      {categoryName}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <AddProductsModal
          campaignId={campaignId}
          assignedIds={items.map((p) => p.productId ?? p.id).filter(Boolean)}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            // Refetch products + notify parent to refresh campaign counts
            getCampaignSponsoredProducts(campaignId)
              .then((data) => setInternalProducts(data?.products ?? data?.items ?? data ?? []))
              .catch(() => {})
            onChanged?.()
          }}
        />
      )}
    </div>
  )
}

// ─── Modal thêm sản phẩm ──────────────────────────────────────────────────
function AddProductsModal({ campaignId, assignedIds, onClose, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [all, setAll] = useState([])
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(assignedIds)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProducts({ pageSize: 200 })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : data?.items ?? data?.products ?? []
        setAll(list)
      })
      .catch((e) => { if (!cancelled) setErr(getErrorMessage(e, 'Không tải được danh sách sản phẩm.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((p) =>
      (p.productName ?? p.name ?? '').toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q)
    )
  }, [all, query])

  const toggle = (id) => {
    setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])
  }

  const handleSubmit = async () => {
    setSubmitting(true); setErr(null)
    try {
      await assignCampaignSponsoredProducts(campaignId, picked)
      onSaved?.()
    } catch (e) {
      setErr(getErrorMessage(e, 'Lưu thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
        <header className="flex items-center justify-between border-b border-smb-outline-variant px-6 py-4">
          <h2 className="font-semibold text-smb-on-surface">
            <Icon name="inventory_2" className="mr-1 text-[18px] text-smb-primary-container" />
            Thêm sản phẩm tài trợ
          </h2>
          <button onClick={onClose} className="text-smb-on-surface-variant hover:text-smb-on-surface">
            <Icon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="space-y-3 px-6 py-4">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc SKU..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm focus:border-smb-primary-container focus:outline-none"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-sm text-smb-on-surface-variant">
                <Icon name="progress_activity" className="mr-2 animate-spin text-[16px]" /> Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-smb-on-surface-variant">Không có sản phẩm phù hợp.</p>
            ) : filtered.map((p) => {
              const id = p.productId ?? p.id
              const name = p.productName ?? p.name ?? `SP #${id}`
              const isPicked = picked.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    isPicked
                      ? 'border-smb-primary-container bg-smb-primary-container/10'
                      : 'border-smb-outline-variant bg-smb-surface-container-lowest hover:border-smb-outline'
                  }`}
                >
                  <span className={`flex size-4 min-w-4 items-center justify-center rounded border text-[10px] font-bold ${
                    isPicked
                      ? 'border-smb-on-primary-container bg-smb-on-primary-container text-smb-primary-container'
                      : 'border-smb-outline bg-smb-surface-container'
                  }`}>{isPicked && '✓'}</span>
                  {p.imageUrl ? (
                    <img
                      src={buildImageUrl(p.imageUrl, {
                        width: 64,
                        height: 64,
                        crop: 'fill',
                        quality: 'auto',
                        format: 'auto',
                      })}
                      alt={name}
                      className="size-7 shrink-0 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = '/placeholder-needs-reupload.png'
                      }}
                    />
                  ) : (
                    <Icon name="inventory_2" className="size-5 shrink-0 text-smb-primary-container" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-smb-on-surface">{name}</p>
                    <p className="truncate text-[11px] text-smb-on-surface-variant">
                      {p.sku && `SKU ${p.sku}`}
                      {p.unitPrice != null && ` · ${Number(p.unitPrice).toLocaleString('vi-VN')}₫`}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <footer className="space-y-2 border-t border-smb-outline-variant bg-smb-surface-container px-6 py-3">
          {err && <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{err}</div>}
          <div className="flex items-center justify-between text-xs">
            <span className="text-smb-on-surface-variant">
              Đã chọn: <strong>{picked.length}</strong> sản phẩm
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-smb-outline-variant px-3 py-1.5 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container-lowest">
              Huỷ
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || picked.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-smb-primary-container px-3 py-1.5 text-sm font-medium text-smb-on-primary-container shadow-sm hover:opacity-90 disabled:opacity-50">
              {submitting && <Icon name="progress_activity" className="animate-spin text-[14px]" />}
              {submitting ? 'Đang lưu...' : 'Xác nhận'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default CampaignProductsTab
