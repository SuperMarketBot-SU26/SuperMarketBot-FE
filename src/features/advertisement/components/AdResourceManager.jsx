import React, { useEffect, useRef, useState } from 'react'
import {
  getCampaignResources,
  uploadResource,
  createResourceLink,
  deleteResource,
  updateResource,
} from '../api/adResourcesApi'
import { getOriginalImageUrl } from '../../../utils/cloudinary'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const RESOURCE_TYPES = [
  { value: 'banner', label: 'Banner (Image)', mime: 'image/*' },
  { value: 'video', label: 'Video', mime: 'video/*' },
  { value: 'thumb', label: 'Thumbnail (Image nhỏ)', mime: 'image/*' },
]

const getTypeVariant = (rawType = '') => {
  const t = String(rawType).toLowerCase()
  if (t === 'video') return 'Video'
  if (t === 'audio') return 'Audio'
  return 'Image'
}

function formatBytes(bytes) {
  if (!bytes) return ''
  const mb = bytes / 1024 / 1024
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

// ── Delete Confirmation Modal ──────────────────────────────────
function DeleteConfirmModal({ isOpen, title, onConfirm, onCancel }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]">
      <div className="w-full max-w-sm mx-4 rounded-2xl bg-smb-surface-container-lowest shadow-2xl border border-smb-outline-variant overflow-hidden animate-[slideUp_200ms_cubic-bezier(0.34,1.56,0.64,1)]">
        <div className="p-6 pb-5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Icon name="delete_forever" className="text-3xl text-red-600" />
          </div>
          <h3 className="mb-2 text-center text-lg font-semibold text-smb-on-surface">
            Xác nhận xóa
          </h3>
          <p className="text-center text-sm text-smb-on-surface-variant">
            Bạn có chắc muốn xóa <span className="font-medium text-smb-on-surface">{title}</span> không?
          </p>
          <p className="mt-2 text-center text-xs text-red-500 flex items-center justify-center gap-1.5">
            <Icon name="warning" className="text-sm" />
            Hành động này không thể hoàn tác
          </p>
        </div>
        <div className="flex border-t border-smb-outline-variant">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-medium text-smb-on-surface-variant hover:bg-smb-surface-container transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-l border-smb-outline-variant"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Resource Card ───────────────────────────────────────────────
function ResourceCard({ resource, onDelete, onView }) {
  const variant = getTypeVariant(resource.resourceType)
  const isVideo = variant === 'Video'
  const isAudio = variant === 'Audio'
  const previewUrl = resource.mediaUrl || resource.localPreviewUrl || ''
  const hasPreview = !!previewUrl

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
      onClick={() => onView?.(resource)}
    >
      {/* Preview Area */}
      <div className="relative min-h-[180px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-smb-surface-container to-smb-surface-container-high">
        {!hasPreview ? (
          <div className="flex flex-col items-center justify-center gap-2 text-smb-on-surface-variant">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-smb-surface-container-high">
              <Icon name="image_not_supported" className="text-2xl" />
            </div>
            <span className="text-xs">Không có media</span>
          </div>
        ) : isVideo ? (
          <video 
            src={previewUrl} 
            className="max-w-full max-h-[180px] object-contain" 
            controls 
            preload="metadata"
            onClick={e => e.stopPropagation()}
          />
        ) : isAudio ? (
          <div className="flex h-full w-full items-center justify-center p-4">
            <audio src={previewUrl} controls className="w-full" onClick={e => e.stopPropagation()} />
          </div>
        ) : (
          <img
            src={getOriginalImageUrl(previewUrl)}
            alt={resource.contentText || resource.title || ''}
            className="max-w-full max-h-[180px] object-contain transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/placeholder-needs-reupload.png'
            }}
          />
        )}

        {/* Type Badge */}
        <span className="absolute top-3 left-3 rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white uppercase tracking-wide">
          {variant}
        </span>

        {/* Pending Badge */}
        {resource.pending && (
          <span className="absolute top-3 right-3 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white animate-pulse">
            Đang upload...
          </span>
        )}

        {/* Delete Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(resource)
          }}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-red-600 hover:scale-110 shadow-lg"
          title="Xoá"
        >
          <Icon name="delete" className="text-lg" />
        </button>
      </div>

      {/* Info Section */}
      <div className="flex flex-col gap-2 p-3.5">
        <span className="flex items-center gap-2 truncate text-sm font-medium text-smb-on-surface" title={resource.contentText || resource.title || ''}>
          {resource.contentText || resource.title || (
            <span className="flex items-center gap-1.5 text-smb-on-surface-variant">
              <Icon name="insert_drive_file" className="text-base" />
              File #{resource.resourceId}
            </span>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {resource.resolution && (
            <span className="rounded-md bg-smb-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-smb-on-surface">
              {resource.resolution}
            </span>
          )}
          {resource.durationSeconds != null && resource.durationSeconds !== '' && (
            <span className="flex items-center gap-1 text-[10px] text-smb-on-surface-variant">
              <Icon name="schedule" className="text-xs" />
              {resource.durationSeconds}s
            </span>
          )}
          {resource.status && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold ${resource.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${resource.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {resource.status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────
export default function AdResourceManager({ campaignId, disabled = false }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [linkForm, setLinkForm] = useState({
    title: '', mediaUrl: '', durationSeconds: '',
    resourceType: 'banner', contentText: '', resolution: '',
  })
  const fileInputRef = useRef(null)

  const [editingCaption, setEditingCaption] = useState(false)
  const [editCaptionValue, setEditCaptionValue] = useState('')
  const [savingCaption, setSavingCaption] = useState(false)

  const handleOpenDetail = (res) => {
    setSelectedResource(res)
    setEditCaptionValue(res.contentText || '')
    setEditingCaption(false)
  }

  const handleCloseDetail = () => {
    setSelectedResource(null)
    setEditingCaption(false)
    setEditCaptionValue('')
  }

  const handleSaveCaption = async () => {
    if (!selectedResource) return
    setSavingCaption(true)
    setError(null)
    try {
      const updated = await updateResource(selectedResource.resourceId, {
        contentText: editCaptionValue.trim() || null
      })
      toast.success('Cập nhật caption thành công!')
      setEditingCaption(false)
      setSelectedResource((prev) => ({
        ...prev,
        contentText: updated.contentText
      }))
      await fetchResources()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể cập nhật caption.')
      toast.error('Cập nhật caption thất bại!')
    } finally {
      setSavingCaption(false)
    }
  }

  const fetchResources = async () => {
    if (!campaignId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCampaignResources(campaignId)
      setResources(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể tải resources.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [campaignId])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !campaignId) return
    let resourceType = 'banner'
    if (file.type.startsWith('video')) resourceType = 'video'

    const tempId = `local-${Date.now()}`
    const localPreviewUrl = URL.createObjectURL(file)
    const optimistic = {
      resourceId: tempId,
      campaignId,
      resourceType,
      title: file.name,
      contentText: linkForm.contentText.trim() || '',
      resolution: linkForm.resolution.trim() || '',
      mediaUrl: '',
      localPreviewUrl,
      pending: true,
      createdAt: new Date().toISOString(),
    }
    setResources((prev) => [optimistic, ...prev])

    setUploading(true)
    setError(null)
    try {
      await uploadResource({
        campaignId,
        resourceType,
        file,
        contentText: linkForm.contentText.trim() || undefined,
        resolution: linkForm.resolution.trim() || undefined,
      })
      URL.revokeObjectURL(localPreviewUrl)
      await fetchResources()
      if (fileInputRef.current) fileInputRef.current.value = ''
      setLinkForm((p) => ({ ...p, contentText: '', resolution: '' }))
      toast.success('Upload thành công!')
    } catch (err) {
      setResources((prev) => prev.filter((r) => r.resourceId !== tempId))
      URL.revokeObjectURL(localPreviewUrl)
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Upload thất bại.')
      toast.error('Upload thất bại!')
    } finally {
      setUploading(false)
    }
  }

  const handleLinkSubmit = async (e) => {
    e.preventDefault()
    if (!campaignId) return
    const sanitized = getOriginalImageUrl(linkForm.mediaUrl.trim())
    if (!sanitized || sanitized.includes('placeholder-needs-reupload')) {
      setError('URL không hợp lệ. Vui lòng dùng Cloudinary URL hoặc upload file mới.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const beResourceType = {
        banner: 'IMAGE',
        video: 'VIDEO',
        thumb: 'IMAGE',
      }[linkForm.resourceType] || 'IMAGE'

      await createResourceLink({
        adCampaignId: campaignId,
        resourceType: beResourceType,
        title: linkForm.title.trim() || undefined,
        resourceUrl: sanitized,
        durationSeconds: linkForm.durationSeconds ? Number(linkForm.durationSeconds) : undefined,
      })
      setLinkForm({ title: '', mediaUrl: '', durationSeconds: '', resourceType: 'banner', contentText: '', resolution: '' })
      setShowLinkForm(false)
      await fetchResources()
      toast.success('Thêm link thành công!')
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể tạo resource.')
      toast.error('Không thể tạo resource!')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteResource(deleteTarget.resourceId)
      setResources((prev) => prev.filter((r) => r.resourceId !== deleteTarget.resourceId))
      toast.success('Đã xóa resource')
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể xóa resource.')
      toast.error('Không thể xóa resource!')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-smb-on-surface">
            <Icon name="perm_media" className="text-xl text-smb-primary" />
            Resources
            <span className="ml-1 rounded-full bg-smb-primary/10 px-2 py-0.5 text-xs font-bold text-smb-primary">
              {resources.length}
            </span>
          </h3>
          <p className="mt-0.5 text-sm text-smb-on-surface-variant">
            Upload ảnh/video cho chiến dịch.
          </p>
        </div>

        {!disabled && (
          <div className="flex flex-col gap-3">
            {/* Caption input + Upload button */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Caption cho file sắp upload"
                value={linkForm.contentText}
                onChange={(e) => setLinkForm((p) => ({ ...p, contentText: e.target.value }))}
                className="flex-1 rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest px-3.5 py-2.5 text-sm outline-none focus:border-smb-primary focus:ring-2 focus:ring-smb-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !campaignId}
                className="flex items-center gap-2 rounded-xl bg-linear-to-r from-smb-primary to-smb-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? (
                  <Icon name="progress_activity" className="animate-spin" />
                ) : (
                  <Icon name="cloud_upload" />
                )}
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={handleFileUpload}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <Icon name="error" className="text-red-500" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <Icon name="close" className="text-lg" />
          </button>
        </div>
      )}

      {/* Resource Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-smb-surface-container-high" />
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-smb-primary animate-spin" />
          </div>
          <span className="text-sm text-smb-on-surface-variant">Đang tải resources...</span>
        </div>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-smb-outline-variant py-16 gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-smb-surface-container-high">
            <Icon name="folder_open" className="text-4xl text-smb-on-surface-variant" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-smb-on-surface">Chưa có resource nào</p>
            <p className="mt-1 text-xs text-smb-on-surface-variant">Upload file để bắt đầu</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard 
              key={r.resourceId} 
              resource={r} 
              onDelete={(res) => setDeleteTarget(res)} 
              onView={handleOpenDetail} 
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.contentText || deleteTarget?.title || `Resource #${deleteTarget?.resourceId}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Detail Modal */}
      {selectedResource && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_150ms_ease-out]"
          onClick={handleCloseDetail}
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-auto rounded-2xl bg-smb-surface-container-lowest shadow-2xl animate-[slideUp_200ms_cubic-bezier(0.34,1.56,0.64,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-smb-outline-variant bg-smb-surface-container-lowest px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 rounded-lg bg-smb-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-smb-primary">
                  <Icon name={getTypeVariant(selectedResource.resourceType) === 'Video' ? 'videocam' : 'image'} className="text-sm" />
                  {getTypeVariant(selectedResource.resourceType)}
                </span>
                <h3 className="truncate max-w-[200px] sm:max-w-none font-semibold text-smb-on-surface">
                  {selectedResource.contentText || selectedResource.title || (
                    <span className="flex items-center gap-1.5 text-smb-on-surface-variant">
                      <Icon name="insert_drive_file" className="text-base" />
                      File #{selectedResource.resourceId}
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={handleCloseDetail}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-smb-surface-container-high transition-colors"
              >
                <Icon name="close" />
              </button>
            </div>

            {/* Preview */}
            <div className="p-5 pt-4">
              <div className="mb-5 flex min-h-[240px] items-center justify-center overflow-hidden rounded-xl bg-black">
                {selectedResource.mediaUrl || selectedResource.localPreviewUrl ? (
                  getTypeVariant(selectedResource.resourceType) === 'Video' ? (
                    <video 
                      src={selectedResource.mediaUrl || selectedResource.localPreviewUrl} 
                      controls 
                      className="max-w-full max-h-[60vh] object-contain" 
                    />
                  ) : (
                    <img
                      src={getOriginalImageUrl(selectedResource.mediaUrl || selectedResource.localPreviewUrl)}
                      alt={selectedResource.contentText || ''}
                      className="max-w-full max-h-[60vh] object-contain"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2 text-smb-on-surface-variant">
                    <Icon name="image_not_supported" className="text-4xl" />
                    <span>Không có media</span>
                  </div>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-smb-surface-container p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">ID</span>
                  <p className="mt-1 font-mono text-sm text-smb-on-surface">{selectedResource.resourceId}</p>
                </div>
                <div className="rounded-xl bg-smb-surface-container p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">Loại</span>
                  <p className="mt-1 text-sm font-medium text-smb-on-surface">{getTypeVariant(selectedResource.resourceType)}</p>
                </div>
                {selectedResource.resolution && (
                  <div className="rounded-xl bg-smb-surface-container p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">Resolution</span>
                    <p className="mt-1 text-sm font-medium text-smb-on-surface">{selectedResource.resolution}</p>
                  </div>
                )}
                {selectedResource.durationSeconds != null && (
                  <div className="rounded-xl bg-smb-surface-container p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">Duration</span>
                    <p className="mt-1 text-sm font-medium text-smb-on-surface">{selectedResource.durationSeconds}s</p>
                  </div>
                )}
                {selectedResource.status && (
                  <div className="rounded-xl bg-smb-surface-container p-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">Status</span>
                    <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${selectedResource.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${selectedResource.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {selectedResource.status}
                    </p>
                  </div>
                )}
              </div>

              {/* Caption Section */}
              <div className="mt-4 rounded-xl bg-smb-surface-container p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">Caption</span>
                  {!disabled && !editingCaption && (
                    <button
                      onClick={() => setEditingCaption(true)}
                      className="flex items-center gap-1 text-xs text-smb-primary hover:underline cursor-pointer"
                    >
                      <Icon name="edit" className="text-sm" />
                      Chỉnh sửa
                    </button>
                  )}
                </div>
                {editingCaption ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editCaptionValue}
                      onChange={(e) => setEditCaptionValue(e.target.value)}
                      className="w-full rounded-xl border border-smb-outline-variant bg-smb-surface-container-lowest px-3.5 py-2.5 text-sm outline-none focus:border-smb-primary focus:ring-2 focus:ring-smb-primary/20 transition-all text-smb-on-surface"
                      placeholder="Nhập caption cho file..."
                      disabled={savingCaption}
                    />
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        onClick={() => {
                          setEditingCaption(false)
                          setEditCaptionValue(selectedResource.contentText || '')
                        }}
                        disabled={savingCaption}
                        className="rounded-lg bg-smb-surface px-3 py-1.5 text-xs font-semibold text-smb-on-surface hover:bg-smb-surface-container-high transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveCaption}
                        disabled={savingCaption}
                        className="flex items-center gap-1 rounded-lg bg-smb-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-smb-primary/90 transition-colors cursor-pointer"
                      >
                        {savingCaption && <Icon name="progress_activity" className="animate-spin text-xs" />}
                        Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-smb-on-surface break-all">
                    {selectedResource.contentText || <span className="text-smb-on-surface-variant italic">Chưa có caption</span>}
                  </p>
                )}
              </div>

              {selectedResource.mediaUrl && (
                <div className="mt-4 rounded-xl bg-smb-surface-container p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-smb-on-surface-variant">URL</span>
                  <a 
                    href={selectedResource.mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="mt-1 flex items-center gap-1 text-sm text-smb-primary hover:underline break-all"
                  >
                    <Icon name="open_in_new" className="text-xs flex-shrink-0" />
                    {selectedResource.mediaUrl}
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex justify-end gap-3 border-t border-smb-outline-variant pt-4">
                <button
                  onClick={() => {
                    setSelectedResource(null)
                    setEditingCaption(false)
                    setDeleteTarget(selectedResource)
                  }}
                  className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <Icon name="delete" />
                  Xóa
                </button>
                <button
                  onClick={handleCloseDetail}
                  className="flex items-center gap-2 rounded-xl bg-smb-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-smb-primary/90 transition-all cursor-pointer"
                >
                  <Icon name="check" />
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
