import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignInfo, CampaignEdit, CampaignStatusActions } from '../features/advertisement'
import { TargetingManager } from '../features/advertisement/components/TargetingManager'
import { ActivateConfirmModal } from '../features/advertisement/components/ActivateConfirmModal'
import { CampaignLogsTab } from '../features/advertisement/components/CampaignLogsTab'
import { CampaignProductsTab } from '../features/advertisement/components/CampaignProductsTab'
import {
  getCampaign,
  updateCampaign,
  activateCampaign,
  pauseCampaign,
  cancelCampaign,
  getCampaignRoutes,
  getCampaignZones,
  getCampaignShelf,
  getCampaignSponsoredProducts,
} from '../features/advertisement/api/adCampaignApi'
import { getPackages } from '../features/advertisement/api/adPackageApi'

export function AdvertisementUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [campaign, setCampaign] = useState(null)
  const [packages, setPackages] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  // Counts lấy thẳng từ BE (routeCount / zoneCount / hasShelf)
  const [targetingCounts, setTargetingCounts] = useState({ routeCount: 0, zoneCount: 0, hasShelf: false })
  // Sponsored products list riêng (BE CampaignResponseDto không trả list, chỉ trả count)
  const [sponsoredProducts, setSponsoredProducts] = useState([])

  const editRef = useRef(null)

  const fetchCampaign = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getCampaign(Number(id))
      setCampaign(data)
      // Đồng thời fetch targeting counts + sponsored products từ BE để modal activate biết chính xác.
      // Best-effort — lỗi sẽ fallback về 0 / [] (không block load trang).
      try {
        const [routes, zones, shelf, sponsored] = await Promise.all([
          getCampaignRoutes(Number(id)).catch(() => ({ routes: [] })),
          getCampaignZones(Number(id)).catch(() => ({ zones: [] })),
          getCampaignShelf(Number(id)).catch(() => ({ shelves: [] })),
          getCampaignSponsoredProducts(Number(id)).catch(() => ({ products: [] })),
        ])
        setTargetingCounts({
          routeCount: (routes?.routes ?? []).length,
          zoneCount:  (zones?.zones ?? []).length,
          hasShelf:   (shelf?.shelves ?? []).length > 0,
        })
        // Normalize: có thể trả { products: [...] } hoặc [...] trực tiếp
        const productList = Array.isArray(sponsored)
          ? sponsored
          : Array.isArray(sponsored?.products)
            ? sponsored.products
            : Array.isArray(sponsored?.items)
              ? sponsored.items
              : []
        setSponsoredProducts(productList)
      } catch {
        // giữ state mặc định nếu fetch counts fail
      }
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải chiến dịch.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  useEffect(() => {
    getPackages()
      .then((data) => setPackages(Array.isArray(data) ? data : data?.items ?? []))
      .catch(() => setPackages([]))
  }, [])

  // `handleSave` is reused by both the explicit "Lưu Cập Nhật" button and the
  // implicit auto-save-before-Activate chain. Returns true on success, false
  // on failure (so callers can short-circuit).
  const handleSave = useCallback(async (formData) => {
    if (!formData.campaignName?.trim()) {
      setActionError('Tên chiến dịch không được để trống.')
      return false
    }
    if (!formData.startDate) {
      setActionError('Ngày bắt đầu là bắt buộc.')
      return false
    }
    if (!formData.endDate) {
      setActionError('Ngày kết thúc là bắt buộc.')
      return false
    }

    setActionLoading(true)
    setActionError(null)
    try {
      await updateCampaign(Number(id), {
        campaignName:     formData.campaignName.trim(),
        startDate:        new Date(formData.startDate).toISOString(),
        endDate:          new Date(formData.endDate).toISOString(),
        semanticObjectId: formData.semanticObjectId ?? null,
        zoneIds:          formData.zoneIds          ?? null,
        routeIds:         formData.routeIds         ?? null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await fetchCampaign()
      return true
    } catch (err) {
      const msg = err?.response?.data?.error
               || err?.response?.data?.message
               || err?.message
               || 'Cập nhật chiến dịch thất bại.'
      setActionError(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }, [id, fetchCampaign])

// Activate được xử lý qua ActivateConfirmModal (full breakdown).
// Giữ wrapper rỗng cho CampaignStatusActions không bị mất prop; thực tế modal tự gọi API.
const handleActivateWrapper = () => {
  setShowActivateModal(true)
}

const STATUS_LABELS = {
    Inactive:  'Không Hoạt Động',
    Active:    'Hoạt Động',
    Paused:    'Tạm Dừng',
    Canceled:  'Đã Hủy',
    Completed: 'Hoàn Thành',
  }

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      setActionError('Vui lòng nhập lý do tạm dừng.')
      return
    }
    if (pauseReason.length > 500) {
      setActionError('Lý do tối đa 500 ký tự.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await pauseCampaign(Number(id), pauseReason.trim())
      setShowPauseModal(false)
      setPauseReason('')
      fetchCampaign()
    } catch (err) {
      setActionError(err?.response?.data?.error || err.message || 'Tạm dừng chiến dịch thất bại.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      await cancelCampaign(Number(id))
      navigate('/advertisement')
    } catch (err) {
      setActionError(err?.response?.data?.error || err.message || 'Hủy chiến dịch thất bại.')
      throw err
    } finally {
      setActionLoading(false)
    }
  }

  const handleDiscard = () => navigate(-1)

  const handleViewLogs = () => navigate(`/advertisement/logs/${id}`)

  // Resolve current package (lấy priceRoute/Zone/Shelf để truyền vào modal & targeting)
  const currentPkg = React.useMemo(() => {
    if (!campaign?.packageId) return null
    return packages.find((p) => p.packageId === campaign.packageId)
      ?? packages.find((p) => p.packageName === campaign.packageName)
      ?? null
  }, [packages, campaign?.packageId, campaign?.packageName])

  const formatLastUpdated = () => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} bởi Admin_A`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />
        <div className="pl-[260px] flex items-center justify-center min-h-screen">
          <p className="text-smb-on-surface-variant">Đang tải chiến dịch...</p>
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-smb-surface">
        <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />
        <div className="pl-[260px] flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-red-600">{fetchError}</p>
          <button onClick={() => navigate(-1)} className="text-smb-primary underline">Quay lại</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Khuyến Mãi & Trợ Giá" />

      <div className="pl-[260px]">
        <Navbar
          title="Chỉnh Sửa Chiến Dịch"
          subtitle={`${campaign?.campaignName ?? ''} · ${STATUS_LABELS[campaign?.status] ?? campaign?.status ?? ''}`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-6">

            {actionError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Cập nhật chiến dịch thành công!
              </div>
            )}

            {/* Status actions — Activate / Pause / Cancel / Logs */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
              <CampaignStatusActions
                status={campaign.status}
                onActivate={handleActivateWrapper}
                onPause={() => setShowPauseModal(true)}
                onCancel={handleCancel}
                onViewLogs={handleViewLogs}
                loading={actionLoading}
              />
            </div>

            {/* Tabs */}
            <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest shadow-sm">
              <nav className="flex flex-wrap gap-1 border-b border-smb-outline-variant bg-smb-surface-container/40 px-2 pt-2">
                {[
                  { key: 'overview',   label: 'Tổng quan',  icon: 'info' },
                  { key: 'targeting',  label: 'Targeting',  icon: 'my_location' },
                  { key: 'logs',       label: 'Lịch sử',    icon: 'history' },
                  { key: 'products',   label: 'Sản phẩm',   icon: 'inventory_2' },
                ].map((tab) => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'border-smb-primary-container bg-smb-surface-container-lowest text-smb-primary-container shadow-sm'
                          : 'border-transparent text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  )
                })}
              </nav>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <CampaignInfo data={campaign} sponsoredProducts={sponsoredProducts} />
                    <CampaignEdit
                      ref={editRef}
                      data={campaign}
                      onSave={handleSave}
                      onDiscard={handleDiscard}
                      lastUpdated={formatLastUpdated()}
                      saving={actionLoading}
                    />
                  </div>
                )}

                {activeTab === 'targeting' && (
                  <TargetingManager
                    campaignId={Number(id)}
                    status={campaign.status}
                    priceRoute={currentPkg?.priceRoute ?? 0}
                    priceZone={currentPkg?.priceZone ?? 0}
                    priceShelf={currentPkg?.priceShelf ?? 0}
                    onChanged={() => {
                      // Re-fetch counts từ BE sau khi user thay đổi targeting.
                      // Lưu ý: không setState ngay để tránh stale snapshot.
                      getCampaignRoutes(Number(id)).catch(() => ({ routes: [] })).then((routes) => {
                        setTargetingCounts((cur) => ({
                          ...cur,
                          routeCount: (routes?.routes ?? []).length,
                        }))
                      })
                      getCampaignZones(Number(id)).catch(() => ({ zones: [] })).then((zones) => {
                        setTargetingCounts((cur) => ({
                          ...cur,
                          zoneCount: (zones?.zones ?? []).length,
                        }))
                      })
                      getCampaignShelf(Number(id)).catch(() => ({ shelves: [] })).then((shelf) => {
                        setTargetingCounts((cur) => ({
                          ...cur,
                          hasShelf: (shelf?.shelves ?? []).length > 0,
                        }))
                      })
                    }}
                  />
                )}

                {activeTab === 'logs' && <CampaignLogsTab campaignId={Number(id)} />}

                {activeTab === 'products' && (
                  <CampaignProductsTab
                    products={sponsoredProducts}
                    sponsoredProductCount={campaign.sponsoredProductCount}
                    canEdit={['Inactive', 'Paused'].includes(campaign.status)}
                    campaignId={Number(id)}
                    brandId={campaign.brandId}
                    onChanged={fetchCampaign}
                  />
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Activate confirm modal — full breakdown */}
      {showActivateModal && (
        <ActivateConfirmModal
          campaign={{
            adCampaignId:   Number(id),
            campaignName:   campaign.campaignName,
            status:         campaign.status,
            brandId:        campaign.brandId,
            packageName:    currentPkg?.packageName ?? campaign.packageName,
            pricePackage:   currentPkg?.pricePackage,
            priceRoute:     currentPkg?.priceRoute,
            priceZone:      currentPkg?.priceZone,
            priceShelf:     currentPkg?.priceShelf,
            routeCount:     targetingCounts.routeCount,
            zoneCount:      targetingCounts.zoneCount,
            hasShelf:       targetingCounts.hasShelf,
          }}
          onClose={() => setShowActivateModal(false)}
          onActivated={() => {
            setActionError(null)
            fetchCampaign()
          }}
        />
      )}

      {/* Pause reason modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl">
            <header className="border-b border-smb-outline-variant px-6 py-4">
              <h2 className="text-base font-semibold text-smb-on-surface">Tạm dừng chiến dịch</h2>
              <p className="text-xs text-smb-on-surface-variant">Nhập lý do tạm dừng (tối đa 500 ký tự).</p>
            </header>
            <div className="space-y-3 px-6 py-4">
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Lý do tạm dừng..."
                className="w-full rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm focus:border-smb-primary-container focus:outline-none"
              />
              <p className="text-right text-xs text-smb-on-surface-variant">
                {pauseReason.length} / 500
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-smb-outline-variant bg-smb-surface-container px-6 py-3">
              <button
                type="button"
                onClick={() => { setShowPauseModal(false); setPauseReason('') }}
                disabled={actionLoading}
                className="rounded-lg border border-smb-outline-variant px-3 py-1.5 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container-lowest"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handlePause}
                disabled={actionLoading || !pauseReason.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading && <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>}
                Xác nhận tạm dừng
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvertisementUpdate
