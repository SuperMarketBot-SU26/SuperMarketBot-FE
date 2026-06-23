import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { CampaignEdit } from '../features/advertisement'
import { StatCard } from '../components/StatCard'
import { getCampaign, updateCampaign } from '../features/advertisement/api/adCampaignApi'

const ROBOT_STATS = [
  { label: 'Robot Đang Hoạt Động', value: 0, icon: 'smart_toy', color: 'success' },
  { label: 'Khu Vực', value: '—', icon: 'location_on', color: 'info' },
]

export function AdvertisementUpdate() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [originalData, setOriginalData] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    internalId: '',
    description: '',
    budget: '',
    dailyMaxBudget: '',
    warehouses: [],
    minStock: '',
    startDate: '',
    endDate: '',
    status: '',
  })

  const [robotStats, setRobotStats] = useState(ROBOT_STATS)

  const fetchCampaign = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getCampaign(Number(id))

      const norm = {
        name: data.campaignName,
        internalId: `ADV-${id}-${new Date(data.startDate).getFullYear()}`,
        description: '',
        budget: '',
        dailyMaxBudget: '',
        warehouses: [],
        minStock: '',
        startDate: data.startDate ? data.startDate.split('T')[0] : '',
        endDate: data.endDate ? data.endDate.split('T')[0] : '',
        status: data.status,
      }

      setFormData(norm)
      setOriginalData(norm)
      setRobotStats([
        { label: 'Robot Đang Hoạt Động', value: 0, icon: 'smart_toy', color: 'success' },
        { label: 'Khu Vực', value: data.robotZoneId ? `Zone #${data.robotZoneId}` : '—', icon: 'location_on', color: 'info' },
      ])
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải chiến dịch.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCampaign()
  }, [fetchCampaign])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setSaveError('Tên chiến dịch không được để trống.')
      return
    }
    if (!formData.startDate) {
      setSaveError('Ngày bắt đầu là bắt buộc.')
      return
    }
    if (!formData.endDate) {
      setSaveError('Ngày kết thúc là bắt buộc.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await updateCampaign(Number(id), {
        campaignName: formData.name.trim(),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        robotZoneId: null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      fetchCampaign()
    } catch (err) {
      setSaveError(err?.response?.data?.error || err.message || 'Cập nhật chiến dịch thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = () => {
    if (originalData) setFormData({ ...originalData })
  }

  const handleDiscard = () => {
    navigate(-1)
  }

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
          <button onClick={() => navigate(-1)} className="text-smb-primary underline"> Quay lại</button>
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
          subtitle={`Chỉnh sửa chiến dịch: ${formData.name}`}
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {saveError && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {robotStats.map((stat, idx) => (
                <StatCard
                  key={idx}
                  title={stat.label}
                  value={String(stat.value)}
                  icon={stat.icon}
                  color={stat.color}
                />
              ))}
            </div>

            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Cập nhật chiến dịch thành công!
              </div>
            )}

            <CampaignEdit
              data={formData}
              onChange={setFormData}
              onSave={handleSave}
              onRestore={handleRestore}
              onDiscard={handleDiscard}
              lastUpdated={formatLastUpdated()}
              saving={saving}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdvertisementUpdate
