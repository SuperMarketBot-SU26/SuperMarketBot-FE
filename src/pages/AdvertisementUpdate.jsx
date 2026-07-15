import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignInfo, CampaignEdit, CampaignStatusActions } from '../features/advertisement'
import {
  getCampaign,
  updateCampaign,
  activateCampaign,
  pauseCampaign,
  cancelCampaign,
} from '../features/advertisement/api/adCampaignApi'

export function AdvertisementUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [campaign, setCampaign] = useState(null)

  const editRef = useRef(null)

  const fetchCampaign = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getCampaign(Number(id))
      setCampaign(data)
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải chiến dịch.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

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

  // Activate only — "Tiếp Tục" must NOT auto-save. The BE's POST /activate
  // validates targeting and returns the error directly; no need to PUT first.
  const handleActivate = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      await activateCampaign(Number(id))
      await fetchCampaign()
      return true
    } catch (err) {
      const msg = err?.response?.data?.error
               || err?.response?.data?.message
               || err?.message
               || 'Kích hoạt chiến dịch thất bại.'
      setActionError(msg)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const STATUS_LABELS = {
    Inactive:  'Không Hoạt Động',
    Active:    'Hoạt Động',
    Paused:    'Tạm Dừng',
    Canceled:  'Đã Hủy',
    Completed: 'Hoàn Thành',
  }

  const handlePause = async () => {
    setActionLoading(true)
    setActionError(null)
    try {
      await pauseCampaign(Number(id), 'Tạm dừng thủ công bởi quản trị viên.')
      fetchCampaign()
    } catch (err) {
      setActionError(err?.response?.data?.error || err.message || 'Tạm dừng chiến dịch thất bại.')
      throw err
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
                onActivate={handleActivate}
                onPause={handlePause}
                onCancel={handleCancel}
                onViewLogs={handleViewLogs}
                loading={actionLoading}
              />
            </div>

            {/* Read-only campaign details */}
            <CampaignInfo data={campaign} />

            {/* Editable fields */}
            <CampaignEdit
              ref={editRef}
              data={campaign}
              onSave={handleSave}
              onDiscard={handleDiscard}
              lastUpdated={formatLastUpdated()}
              saving={actionLoading}
            />

          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementUpdate
