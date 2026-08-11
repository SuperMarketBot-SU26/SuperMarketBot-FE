import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { getCampaign, cancelCampaign, pauseCampaign, activateCampaign, completeCampaign } from '../features/advertisement/api/adCampaignApi'
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
  { id: 'overview',   label: 'Tổng quan',    icon: 'dashboard' },
  { id: 'products',   label: 'Sản phẩm',    icon: 'inventory_2' },
  { id: 'targeting',  label: 'Targeting',   icon: 'my_location' },
  { id: 'resources',  label: 'Resources',   icon: 'perm_media' },
  { id: 'logs',       label: 'Logs',        icon: 'history' },
]

export function CampaignDetail() {
  const { id } = useParams()
  const campaignId = Number(id)
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [actionLoading, setActionLoading] = useState(false)

  // Status action handlers
  const handleActivate = async () => {
    setActionLoading(true)
    try { await activateCampaign(campaignId); await refreshData(); } catch (e) { alert(e?.response?.data?.message || 'Lỗi kích hoạt') }
    finally { setActionLoading(false) }
  }
  const handlePause = async () => {
    setActionLoading(true)
    try { await pauseCampaign(campaignId); await refreshData(); } catch (e) { alert(e?.response?.data?.message || 'Lỗi tạm dừng') }
    finally { setActionLoading(false) }
  }
  const handleCancel = async () => {
    setActionLoading(true)
    try { await cancelCampaign(campaignId); await refreshData(); } catch (e) { alert(e?.response?.data?.message || 'Lỗi hủy') }
    finally { setActionLoading(false) }
  }
  const handleComplete = async () => {
    setActionLoading(true)
    try { await completeCampaign(campaignId); await refreshData(); } catch (e) { alert(e?.response?.data?.message || 'Lỗi hoàn thành') }
    finally { setActionLoading(false) }
  }

  // Refresh campaign data - defined outside useEffect so it can be used as callback
  const refreshData = React.useCallback(() => {
    if (!Number.isFinite(campaignId)) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getCampaign(campaignId)
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message ?? 'Không thể tải chiến dịch.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [campaignId])

  // Fetch campaign data - only when campaignId changes
  useEffect(() => {
    if (!Number.isFinite(campaignId)) {
      setError('ID chiến dịch không hợp lệ.')
      setLoading(false)
      return
    }
    
    let cancelled = false
    setLoading(true)
    setError(null)
    
    getCampaign(campaignId)
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message ?? 'Không thể tải chiến dịch.')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    
    return () => { cancelled = true }
  }, [campaignId])

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quảng Cáo" />

      <div className="pl-[260px]">
        <Navbar
          title={data?.campaignName || `Chiến dịch #${campaignId}`}
          subtitle="Quản lý chi tiết chiến dịch quảng cáo"
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
                        {data.status ?? 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-smb-on-surface-variant">
                      Brand: <strong className="text-smb-on-surface">{data.brandName ?? '—'}</strong>
                      {' · '}
                      Package: <strong className="text-smb-on-surface">{data.packageName ?? '—'}</strong>
                      {data.startDate && data.endDate && (
                        <> · {new Date(data.startDate).toLocaleDateString('vi-VN')} → {new Date(data.endDate).toLocaleDateString('vi-VN')}</>
                      )}
                    </p>
                  </div>
                  <CampaignStatusActions
                    status={data.status}
                    onActivate={handleActivate}
                    onPause={handlePause}
                    onCancel={handleCancel}
                    onComplete={handleComplete}
                    onViewLogs={() => setActiveTab('logs')}
                    loading={actionLoading}
                  />
                </div>

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
                  {activeTab === 'overview' && <CampaignInfo data={data} />}
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
                      priceRoute={data?.routePrice}
                      priceZone={data?.zonePrice}
                      priceShelf={data?.shelfPrice}
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
