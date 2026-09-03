import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import {
  getCampaign,
  cancelCampaign,
  pauseCampaign,
  activateCampaign,
  completeCampaign,
  updateCampaign,
  getCompletionStatus,
} from '../features/advertisement/api/adCampaignApi'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { CampaignInfo } from '../features/advertisement/components/CampaignInfo'
import CampaignProductsTab from '../features/advertisement/components/CampaignProductsTab'
import { CampaignLogsTab } from '../features/advertisement/components/CampaignLogsTab'
import TargetingManager from '../features/advertisement/components/TargetingManager'
import AdResourceManager from '../features/advertisement/components/AdResourceManager'
import { CampaignStatusActions } from '../features/advertisement/components/CampaignStatusActions'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const TABS = [
  { id: 'overview',   label: 'Tổng quan',  icon: 'dashboard' },
  { id: 'products',   label: 'Sản phẩm',  icon: 'inventory_2' },
  { id: 'targeting',  label: 'Targeting', icon: 'my_location' },
  { id: 'resources',  label: 'Resources', icon: 'perm_media' },
  { id: 'logs',       label: 'Logs',      icon: 'history' },
]

const STATUS_LABELS = {
  Draft:     'Bản Thảo (Draft)',
  Inactive:  'Không Hoạt Động',
  Active:    'Hoạt Động',
  Paused:    'Tạm Dừng',
  Canceled:  'Đã Hủy',
  Completed: 'Hoàn Thành',
}

function toDateInput(val) {
  if (!val) return ''
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0]
  return val
}

export function CampaignDetail() {
  const { id } = useParams()
  const campaignId = Number(id)
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [actionLoading, setActionLoading] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completionStatus, setCompletionStatus] = useState(null)
  const [billingResult, setBillingResult] = useState(null)

  // Billing result types:
  // Activate: { adCampaignId, campaignName, previousStatus, newStatus, amountCharged, remainingWalletBalance, totalDays, prorataMultiplier, packageCostCharged }
  // Cancel: { adCampaignId, campaignName, newStatus, refundedAmount, daysUsed, daysRemaining }

  // Form edit state — chỉ khởi tạo 1 lần từ data đầu tiên
  const [editForm, setEditForm] = useState({
    campaignName: '',
    startDate: '',
    endDate: '',
  })
  const [editInitialized, setEditInitialized] = useState(false)

  const refreshData = useCallback(() => {
    if (!Number.isFinite(campaignId)) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getCampaign(campaignId),
      getCompletionStatus(campaignId).catch(() => null),
    ]).then(([result, completion]) => {
      if (cancelled) return
      setData(result)
      setCompletionStatus(completion)
      if (!editInitialized) {
        setEditForm({
          campaignName: result?.campaignName ?? '',
          startDate: toDateInput(result?.startDate),
          endDate: toDateInput(result?.endDate),
        })
        setEditInitialized(true)
      }
    }).catch((err) => {
      if (cancelled) return
      setError(err?.response?.data?.message ?? 'Không thể tải chiến dịch.')
    }).finally(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [campaignId, editInitialized])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Status action handlers — tách riêng để message lỗi action
  // không bị "nuốt" bởi lỗi refresh, và ngược lại.
  const runStatusAction = async (action, label) => {
    setActionLoading(true)
    setBillingResult(null)
    let actionOk = false
    try {
      const result = await action()
      actionOk = true
      // Capture billing result for success display
      if (result) {
        setBillingResult(result)
        // Auto-hide after 8 seconds
        setTimeout(() => setBillingResult(null), 8000)
      }
    } catch (e) {
      const status = e?.response?.status
      const msg = e?.response?.data?.message
               ?? e?.response?.data?.error
               ?? e?.message
               ?? `Lỗi ${label}`
      alert(`${status ? `[${status}] ` : ''}${msg}`)
    }
    // Refresh bất kể action thành công/thất bại — server là source of truth.
    // Lỗi refresh KHÔNG được hiện alert (action alert đã rồi, hoặc server đã OK).
    if (actionOk) {
      try {
        await refreshData()
      } catch (refreshErr) {
        console.warn('refresh failed after action', refreshErr)
      }
    } else {
      // Action fail → vẫn thử refresh để UI khớp server (status có thể đã đổi 1 phần).
      try { await refreshData() } catch { /* silent */ }
    }
    setActionLoading(false)
  }
  const handleActivate = () =>
    runStatusAction(() => activateCampaign(campaignId), 'kích hoạt')
  const handlePause = () =>
    runStatusAction(() => pauseCampaign(campaignId), 'tạm dừng')
  const handleCancel = () =>
    runStatusAction(() => cancelCampaign(campaignId), 'hủy')
  const handleComplete = () =>
    runStatusAction(() => completeCampaign(campaignId), 'hoàn thành')

  // Save edit form
  const handleSaveEdit = async (e) => {
    e?.preventDefault?.()
    setSaveError(null)
    setSaveSuccess(false)

    if (!editForm.campaignName.trim()) {
      setSaveError('Tên chiến dịch không được để trống.')
      return
    }

    setSaving(true)
    try {
      await updateCampaign(campaignId, {
        campaignName: editForm.campaignName.trim(),
        description: editForm.description?.trim() || null,
        // Giữ nguyên targeting — tab Targeting đã có UI riêng (TargetingManager)
        routeIds: data?.routeIds ?? null,
        zoneIds: data?.zoneIds ?? null,
        semanticObjectId: data?.semanticObjectId ?? null,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      await refreshData()
    } catch (err) {
      const msg = err?.response?.data?.error
               || err?.response?.data?.message
               || err?.message
               || 'Cập nhật chiến dịch thất bại.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardEdit = () => {
    setEditForm({
      campaignName: data?.campaignName ?? '',
      startDate: toDateInput(data?.startDate),
      endDate: toDateInput(data?.endDate),
    })
    setSaveError(null)
    setSaveSuccess(false)
  }

  const isLocked = data?.status === 'Active' || data?.status === 'Canceled' || data?.status === 'Completed'

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quảng Cáo" />

      <div className="pl-[260px]">
        <Navbar
          title={data?.campaignName || `Chiến dịch #${campaignId}`}
          subtitle={`${STATUS_LABELS[data?.status] ?? data?.status ?? '—'} · Quản lý chi tiết chiến dịch quảng cáo`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate('/advertisement')}
              className="flex items-center gap-1 text-sm text-smb-on-surface-variant hover:text-smb-primary-container"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              Quay lại danh sách
            </button>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <Icon name="progress_activity" className="animate-spin text-3xl text-smb-on-surface-variant" />
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-smb-error-container px-4 py-3 text-sm text-smb-on-error-container">
                {error}
              </div>
            )}

            {!loading && data && (
              <>
                {/* Header card with status actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-smb-on-surface">{data.campaignName}</h2>
                      <span className="rounded-full bg-smb-surface-container-high px-2.5 py-0.5 text-xs font-medium text-smb-on-surface">
                        {STATUS_LABELS[data.status] ?? data.status ?? 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-smb-on-surface-variant">
                      Brand: <strong className="text-smb-on-surface">{data.brandName ?? '—'}</strong>
                      {' · '}
                      Package: <strong className="text-smb-on-surface">{data.packageName ?? '—'}</strong>
                      {' · '}
                      Thời gian: <span className="italic text-smb-on-surface-variant">Theo ngân sách (Tự động dừng khi hết Budget)</span>
                    </p>
                  </div>
                  <CampaignStatusActions
                    status={data.status}
                    completionStatus={completionStatus}
                    onActivate={handleActivate}
                    onPause={handlePause}
                    onCancel={handleCancel}
                    onComplete={handleComplete}
                    onViewLogs={() => setActiveTab('logs')}
                    loading={actionLoading}
                  />
                </div>

                {/* Billing result toast */}
                  {billingResult && (
                    <div className="rounded-xl border bg-smb-surface-container-lowest p-4 shadow-lg animate-in slide-in-from-top-2">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                          <span className="material-symbols-outlined text-xl text-green-600">check_circle</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-smb-on-surface">
                            {billingResult.refundedAmount !== undefined ? 'Chiến dịch đã hủy' : 'Chiến dịch đã kích hoạt'}
                          </h4>
                          <div className="mt-1 space-y-0.5 text-sm text-smb-on-surface-variant">
                            {billingResult.amountCharged !== undefined && (
                              <>
                                <p>Đã trừ: <strong className="text-smb-on-surface">{billingResult.amountCharged?.toLocaleString('vi-VN')}₫</strong></p>
                                {billingResult.totalDays > 0 && (
                                  <p className="text-xs">
                                    Pro-rata: {billingResult.packageCostCharged?.toLocaleString('vi-VN')}₫ × {billingResult.totalDays}/30 ngày
                                    {(billingResult.prorataMultiplier * 100).toFixed(1)}%
                                  </p>
                                )}
                              </>
                            )}
                            {billingResult.refundedAmount !== undefined && (
                              <>
                                <p>Đã hoàn: <strong className="text-green-600">{billingResult.refundedAmount?.toLocaleString('vi-VN')}₫</strong></p>
                                <p className="text-xs">
                                  Đã dùng: {billingResult.daysUsed} ngày · Còn lại: {billingResult.daysRemaining} ngày
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setBillingResult(null)}
                          className="text-smb-on-surface-variant hover:text-smb-on-surface"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>
                    </div>
                  )}

                {/* Tabs */}
                <div className="flex flex-wrap gap-1 border-b border-smb-outline-variant">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'border-smb-primary text-smb-primary'
                          : 'border-transparent text-smb-on-surface-variant hover:text-smb-on-surface'
                      }`}
                    >
                      <Icon name={tab.icon} className="text-[18px]" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div>
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <CampaignInfo data={data} />

                      {/* Edit form */}
                      <div className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest p-6">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-smb-primary-container/10">
                            <span className="material-symbols-outlined text-xl text-smb-primary-container">
                              edit_note
                            </span>
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-smb-on-surface">Chỉnh Sửa Thông Tin</h3>
                            <p className="text-sm text-smb-on-surface-variant">Cập nhật tên và thời gian chiến dịch</p>
                          </div>
                        </div>

                        {saveError && (
                          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {saveError}
                          </div>
                        )}
                        {saveSuccess && (
                          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Cập nhật chiến dịch thành công!
                          </div>
                        )}

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                          <Input
                            label="Tên Chiến Dịch"
                            placeholder="Nhập tên chiến dịch"
                            value={editForm.campaignName}
                            onChange={(e) => setEditForm((p) => ({ ...p, campaignName: e.target.value }))}
                            disabled={isLocked}
                          />



                          {isLocked && (
                            <div className="flex items-start gap-2 rounded-lg border border-smb-primary-container/30 bg-smb-primary-container/5 p-3">
                              <span className="material-symbols-outlined mt-0.5 text-[16px] text-smb-primary-container">info</span>
                              <p className="text-xs text-smb-on-surface-variant">
                                Chiến dịch đang ở trạng thái <strong className="text-smb-primary-container">{STATUS_LABELS[data.status] ?? data.status}</strong> — không thể chỉnh sửa.
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              icon="close"
                              size="sm"
                              onClick={handleDiscardEdit}
                              disabled={saving}
                            >
                              Hủy Thay Đổi
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              icon="save"
                              disabled={saving || isLocked}
                            >
                              {saving ? 'Đang Lưu...' : 'Lưu Cập Nhật'}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {activeTab === 'products' && (
                    <CampaignProductsTab
                      campaignId={campaignId}
                      brandId={data?.brandId}
                      sponsoredProductCount={data?.sponsoredProductCount}
                      onChanged={refreshData}
                    />
                  )}
                  {activeTab === 'targeting' && (
                    <TargetingManager
                      campaign={data}
                      campaignId={campaignId}
                      status={data?.status}
                      priceRoute={data?.routeUnitPrice ?? data?.priceRoute ?? data?.package?.routeUnitPrice ?? data?.package?.priceRoute}
                      priceZone={data?.zoneUnitPrice ?? data?.priceZone ?? data?.package?.zoneUnitPrice ?? data?.package?.priceZone}
                      priceShelf={data?.shelfUnitPrice ?? data?.priceShelf ?? data?.package?.shelfUnitPrice ?? data?.package?.priceShelf}
                      onChanged={refreshData}
                    />
                  )}
                  {activeTab === 'resources' && <AdResourceManager campaignId={campaignId} />}
                  {activeTab === 'logs' && <CampaignLogsTab campaignId={campaignId} />}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default CampaignDetail
