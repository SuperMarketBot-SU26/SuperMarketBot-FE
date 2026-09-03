import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { activateCampaign } from '../api/adCampaignApi'
import { getBrandWallet } from '../api/adCampaignApi'
import { getBrands } from '../../brand/api/brandApi'
import { getErrorMessage } from '../../../api/client'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const formatVND = (val) => Number(val ?? 0).toLocaleString('vi-VN')

/**
 * BE có thể trả các shape khác nhau cho wallet:
 *   { balance: 1000000 }
 *   { amount: 1000000, currency: 'VND' }
 *   { wallet: { balance: 1000000 } }
 *   { availableBalance: 1000000 }
 * Normalize về { balance: number }
 */
function normalizeWallet(raw) {
  if (raw == null) return null
  const candidates = [
    raw?.balance,
    raw?.availableBalance,
    raw?.currentBalance,
    raw?.amount,
    raw?.wallet?.balance,
    raw?.wallet?.availableBalance,
    raw?.data?.balance,
  ]
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c)) return { balance: c }
    if (typeof c === 'string' && c.trim() !== '' && !Number.isNaN(Number(c))) {
      return { balance: Number(c) }
    }
  }
  return null
}

/**
 * Load wallet balance cho 1 brand.
 * Thử lần lượt:
 *   1) GET /v1/brands/{id}/wallet  (chi tiết — có thể BE chưa implement)
 *   2) GET /v1/brands → tìm row có brandId, lấy BrandDto.wallet
 *      (list endpoint đã được BrandTable dùng ổn định, nên tin cậy được)
 * Nếu cả 2 đều fail → trả { ok:false, kind:'missing' | 'error', message }
 */
async function loadWalletBalance(brandId) {
  // 1) Try detail endpoint trước
  try {
    const data = await getBrandWallet(brandId)
    const normalized = normalizeWallet(data)
    if (normalized) return { ok: true, wallet: normalized }
    return { ok: false, kind: 'error', message: 'Phản hồi ví không hợp lệ.' }
  } catch (err) {
    const code = err?.response?.status
    // 2) Fallback: lấy từ list brands
    try {
      const list = await getBrands()
      const brand = Array.isArray(list)
        ? list.find((b) => Number(b.brandId) === Number(brandId))
        : null
      if (!brand) {
        return { ok: false, kind: 'missing', message: `Brand #${brandId} không tồn tại.` }
      }
      // BrandDto.wallet có thể là number trực tiếp HOẶC object { balance, ... }
      const raw = brand.wallet
      let balance = null
      if (typeof raw === 'number') balance = raw
      else if (raw && typeof raw === 'object') {
        balance = raw.balance ?? raw.availableBalance ?? raw.currentBalance ?? null
      }
      if (balance === null || typeof balance === 'string') {
        const asNum = Number(balance)
        balance = Number.isNaN(asNum) ? null : asNum
      }
      if (balance === null) {
        return {
          ok: false,
          kind: 'missing',
          message: `Brand #${brandId} chưa có ví (số dư rỗng).`,
        }
      }
      return { ok: true, wallet: { balance } }
    } catch (fallbackErr) {
      // Cả 2 đều fail → trả lỗi gốc
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Lỗi không xác định'
      if (code === 404) {
        return {
          ok: false,
          kind: 'missing',
          message: `Brand #${brandId} chưa có ví hoặc không tồn tại.`,
        }
      }
      return { ok: false, kind: 'error', message: msg }
    }
  }
}

/**
 * ActivateConfirmModal — xác nhận kích hoạt / tiếp tục campaign.
 *
 * 2 mode dựa trên `campaign.status`:
 *  - RESUME  (Paused)        → tiếp tục chiến dịch, BE không trừ tiền.
 *                                UI chỉ xác nhận, không show breakdown.
 *  - ACTIVATE (Inactive / Scheduled / null) → kích hoạt lần đầu.
 *                                UI show breakdown phí (gói + zones mới + routes mới + shelf)
 *                                với BE đã trừ tiền cho targeting trước đó qua /zones, /routes, /shelves.
 *
 * Props:
 *  - campaign: { adCampaignId, status, brandId, packageId, packageName,
 *                pricePackage, priceRoute, priceZone, priceShelf,
 *                routeCount, zoneCount, hasShelf }
 *  - onClose()
 *  - onActivated(updatedCampaign) — sau khi activate 200
 */
export function ActivateConfirmModal({ campaign, onClose, onActivated }) {
  const [wallet, setWallet] = useState({ balance: 999999999 })
  const [loadingWallet, setLoadingWallet] = useState(false)
  const [walletStatus, setWalletStatus] = useState({ kind: 'ok' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const retryWallet = useCallback(() => {}, [])

  const breakdown = useMemo(() => {
    const routeCount = campaign.routeCount ?? 0
    const zoneCount  = campaign.zoneCount ?? 0
    const hasShelf   = campaign.hasShelf ?? false
    const pricePkg   = Number(campaign.budget ?? campaign.pricePackage ?? 0)
    const priceR     = Number(campaign.routeUnitPrice ?? campaign.priceRoute ?? campaign.package?.routeUnitPrice ?? 0)
    const priceZ     = Number(campaign.zoneUnitPrice ?? campaign.priceZone ?? campaign.package?.zoneUnitPrice ?? 0)
    const priceS     = Number(campaign.shelfUnitPrice ?? campaign.priceShelf ?? campaign.package?.shelfUnitPrice ?? 0)
    const routesTotal = routeCount * priceR
    const zonesTotal  = zoneCount * priceZ
    const shelfTotal  = hasShelf ? priceS : 0
    const total = pricePkg + routesTotal + zonesTotal + shelfTotal
    return { routeCount, zoneCount, hasShelf, pricePkg, priceR, priceZ, priceS, routesTotal, zonesTotal, shelfTotal, total }
  }, [campaign])

  const walletBalance = wallet?.balance ?? null
  const hasInsufficient = walletBalance !== null && walletBalance < breakdown.total
  const afterBalance = walletBalance !== null ? walletBalance - breakdown.total : null

  // RESUME (Paused) vs ACTIVATE (Inactive/Scheduled/null)
  // Khai báo TRƯỚC các callback/effect phía dưới để tránh TDZ
  // (Cannot access 'mode' before initialization).
  const mode = String(campaign?.status ?? '').toLowerCase() === 'paused' ? 'resume' : 'activate'

  // Block submit chỉ khi:
  //  - đang load ví
  //  - ví < tổng phí (đã biết rõ số dư)
  // KHÔNG block khi wallet missing/404 → BE sẽ trả lỗi chính xác (Insufficient / WalletNotFound)
  // và FE sẽ hiển thị message từ serverError.
  const submitBlocked = submitting || (mode === 'activate' && (hasInsufficient || loadingWallet))

  const handleConfirm = async () => {
    if (submitBlocked) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await activateCampaign(campaign.adCampaignId)
      onActivated?.(campaign)
      onClose?.()
    } catch (err) {
      const rawMsg = getErrorMessage(err, 'Kích hoạt chiến dịch thất bại.')
      const msg = humanizeActivateError(rawMsg)
      setSubmitError(msg)
      // InsufficientWalletBalance → highlight thêm ví
      if (/insufficient|ví|wallet|số dư/i.test(msg)) {
        // reload wallet nếu BE trả balance mới
        if (campaign.brandId) {
          getBrandWallet(campaign.brandId).then(setWallet).catch(() => {})
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

/**
 * Một số message backend trả thẳng EF Core / SQL exception (developer-oriented).
 * Ánh xạ các pattern này sang message thân thiện với admin/brand.
 */
function humanizeActivateError(raw) {
  if (!raw) return 'Kích hoạt chiến dịch thất bại.'
  const text = String(raw)

  // EF Core retrying strategy + user transactions
  if (/SqlServerRetryingExecutionStrategy|user-initiated transactions|UseExecutionStrategy/i.test(text)) {
    return 'Hệ thống đang bận (lỗi thanh toán song song). Vui lòng thử lại sau vài giây. Nếu tiền đã bị trừ mà chiến dịch chưa Active, hãy liên hệ Admin.'
  }
  // DB deadlock / timeout
  if (/deadlock|timeout|connection.*reset|network.*reset/i.test(text)) {
    return 'Kết nối cơ sở dữ liệu không ổn định. Vui lòng thử lại sau ít phút.'
  }
  // Wallet không đủ
  if (/InsufficientWalletBalance|Insufficient.*balance|InsufficientFunds/i.test(text)) {
    return 'Số dư ví Brand không đủ để kích hoạt. Vui lòng nạp thêm tiền vào ví.'
  }
  // Targeting validation
  if (/Chiến dịch phải có ít nhất 1 loại targeting|CampaignNoTargeting/i.test(text)) {
    return 'Chiến dịch chưa có targeting. Vui lòng chọn ít nhất 1 loại (Route / Zone / Shelf) trước khi kích hoạt.'
  }
  // Editable
  if (/CampaignNotEditable/i.test(text)) {
    return 'Chiến dịch đang ở trạng thái không thể kích hoạt.'
  }
  // Already active
  if (/CampaignAlreadyActive/i.test(text)) {
    return 'Chiến dịch đã hoạt động rồi.'
  }

  return text
}

  if (!campaign) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-smb-outline-variant px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/15 text-smb-primary-container">
            <Icon name={mode === 'resume' ? 'play_arrow' : 'play_circle'} className="text-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-smb-on-surface">
              {mode === 'resume'
                ? <>Tiếp tục "{campaign.campaignName}"</>
                : <>Kích hoạt "{campaign.campaignName}"</>}
            </h2>
            <p className="text-xs text-smb-on-surface-variant">
              {mode === 'resume'
                ? 'Không phát sinh phí khi tiếp tục.'
                : 'Xác nhận kích hoạt chiến dịch quảng cáo.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-smb-on-surface-variant hover:text-smb-on-surface"
            aria-label="Đóng"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {mode === 'resume' ? (
            /* ── RESUME: chỉ xác nhận, không show phí / ví ──────────── */
            <section>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-start gap-2">
                  <Icon name="check_circle" className="mt-0.5 text-[18px]" />
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold">Chiến dịch đã được thanh toán đầy đủ trước đó.</p>
                    <p className="text-xs leading-relaxed">
                      Mọi thay đổi về khu vực, tuyến đường hay kệ hàng đã được ghi nhận và trừ tiền
                      ngay khi bạn bấm lưu. Việc tiếp tục chỉ đưa chiến dịch trở lại trạng thái
                      <strong> Hoạt Động</strong> mà không phát sinh thêm phí.
                    </p>
                    <ul className="mt-2 space-y-0.5 text-xs">
                      <li>• Gói dịch vụ đã mua: <strong>{campaign.packageName ?? '—'}</strong></li>
                      <li>• Khu vực đang gán: <strong>{breakdown.zoneCount}</strong></li>
                      <li>• Tuyến đường đang gán: <strong>{breakdown.routeCount}</strong></li>
                      <li>• Kệ hàng: <strong>{breakdown.hasShelf ? 'đã gán' : 'chưa gán'}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* ── ACTIVATE: show breakdown + ví như cũ ──────────────── */
            <>
          {/* Breakdown */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-smb-on-surface-variant">
              Phí kích hoạt
            </h3>
            <div className="overflow-hidden rounded-lg border border-smb-outline-variant bg-smb-surface-container-low">
              <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-4 py-2 text-sm">
                <span className="text-smb-on-surface-variant">Gói ({campaign.packageName ?? '—'})</span>
                <span className="tabular-nums text-smb-on-surface">{formatVND(breakdown.pricePkg)} đ</span>
              </div>
              <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-4 py-2 text-sm">
                <span className="text-smb-on-surface-variant">
                  🛣️ Routes: <strong>{breakdown.routeCount}</strong> × {formatVND(breakdown.priceR)} đ
                </span>
                <span className="tabular-nums text-smb-on-surface">{formatVND(breakdown.routesTotal)} đ</span>
              </div>
              <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-4 py-2 text-sm">
                <span className="text-smb-on-surface-variant">
                  📍 Zones: <strong>{breakdown.zoneCount}</strong> × {formatVND(breakdown.priceZ)} đ
                </span>
                <span className="tabular-nums text-smb-on-surface">{formatVND(breakdown.zonesTotal)} đ</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-smb-on-surface-variant">
                  📦 Shelf: <strong>{breakdown.hasShelf ? 1 : 0}</strong> × {formatVND(breakdown.priceS)} đ
                </span>
                <span className="tabular-nums text-smb-on-surface">{formatVND(breakdown.shelfTotal)} đ</span>
              </div>
              <div className="flex items-center justify-between border-t-2 border-smb-primary-container/30 bg-smb-primary-container/5 px-4 py-2.5">
                <span className="text-sm font-semibold text-smb-on-surface">TỔNG</span>
                <span className="tabular-nums text-base font-bold text-smb-primary-container">
                  {formatVND(breakdown.total)} đ
                </span>
              </div>
            </div>
          </section>



          {submitError && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
              <Icon name="error" className="mt-0.5 text-[16px]" />
              <span>{submitError}</span>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-smb-outline-variant bg-smb-surface-container px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-smb-outline-variant px-4 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container-lowest disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitBlocked}
            className="inline-flex items-center gap-2 rounded-lg bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary-container shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Icon name="progress_activity" className="animate-spin text-[16px]" />}
            <Icon name={submitting ? '' : 'check_circle'} className={submitting ? 'hidden' : 'text-[16px]'} />
            {submitting
              ? (mode === 'resume' ? 'Đang tiếp tục...' : 'Đang kích hoạt...')
              : (mode === 'resume' ? 'Xác nhận tiếp tục' : 'Xác nhận kích hoạt')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActivateConfirmModal