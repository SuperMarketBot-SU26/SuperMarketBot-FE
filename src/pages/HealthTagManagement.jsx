import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { DataTable } from '../components/DataTable'
import { FormModal, FormField } from '../components/FormModal'
import { TableActions } from '../components/TableActions'
import {
  getAdminHealthTags,
  createAdminHealthTag,
  updateAdminHealthTag,
  deleteAdminHealthTag,
} from '../features/healthTag/api/adminHealthTagApi'

const TAG_TYPE_OPTIONS = [
  { value: 'Diet', label: 'Chế độ ăn' },
  { value: 'Allergen', label: 'Dị ứng' },
  { value: 'Ingredient', label: 'Thành phần' },
]

const EMPTY_FORM = {
  tagName: '',
  tagType: 'Diet',
}

const TAG_TYPE_LABELS = {
  Diet: { label: 'Chế độ ăn', icon: 'restaurant', cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
  Allergen: { label: 'Dị ứng', icon: 'warning', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
  Ingredient: { label: 'Thành phần', icon: 'science', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
}

function TagTypeBadge({ tagType }) {
  const cfg = TAG_TYPE_LABELS[tagType] || { label: tagType, icon: 'label', cls: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function StatCard({ icon, label, value, accent, loading }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl border bg-smb-surface-container-lowest px-5 py-4 shadow-sm transition-all ${accent}`}>
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${accent.replace('border-', 'bg-').replace('/60', '/10').replace('border-smb-outline-variant', 'bg-smb-surface-container')}`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-smb-on-surface-variant">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-16 rounded-lg smb-skeleton" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-smb-on-surface">{value}</p>
        )}
      </div>
    </div>
  )
}

export function HealthTagManagement() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Delete states
  const [deletingTag, setDeletingTag] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getAdminHealthTags()
      setTags(Array.isArray(data) ? data : [])
    } catch (err) {
      setFetchError(err?.response?.data?.error || err.message || 'Không thể tải danh sách health tag.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const filtered = tags.filter((t) => {
    const matchSearch = !search || t.tagName.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || t.tagType === typeFilter
    return matchSearch && matchType
  })

  const counts = {
    all: tags.length,
    diet: tags.filter((t) => t.tagType === 'Diet').length,
    allergen: tags.filter((t) => t.tagType === 'Allergen').length,
    ingredient: tags.filter((t) => t.tagType === 'Ingredient').length,
  }

  const openCreate = () => {
    setEditingTag(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (tag) => {
    setEditingTag(tag)
    setForm({ tagName: tag.tagName, tagType: tag.tagType })
    setFormError(null)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditingTag(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSubmit = async () => {
    setFormError(null)

    if (!form.tagName.trim()) {
      setFormError('Tên tag không được để trống.')
      return
    }
    if (form.tagName.trim().length < 2) {
      setFormError('Tên tag phải có ít nhất 2 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      if (editingTag) {
        await updateAdminHealthTag(editingTag.healthTagId, {
          tagName: form.tagName.trim(),
          tagType: form.tagType,
        })
        toast.success('Cập nhật health tag thành công!')
      } else {
        await createAdminHealthTag({
          tagName: form.tagName.trim(),
          tagType: form.tagType,
        })
        toast.success('Tạo health tag mới thành công!')
      }
      await fetchTags()
      closeModal()
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Lưu health tag thất bại.'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    setDeleting(true)
    try {
      await deleteAdminHealthTag(deletingTag.healthTagId)
      toast.success('Xóa health tag thành công!')
      await fetchTags()
      setDeletingTag(null)
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Xóa health tag thất bại.'
      toast.error(msg)
      setDeletingTag(null)
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    {
      key: 'tagName',
      label: 'Tên Tag',
      render: (val) => (
        <div>
          <span className="font-semibold text-smb-on-surface">{val}</span>
        </div>
      ),
    },
    {
      key: 'tagType',
      label: 'Loại',
      align: 'center',
      render: (val) => <TagTypeBadge tagType={val} />,
    },
    {
      key: 'healthTagId',
      label: '',
      align: 'center',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TableActions
            actions={[
              { label: 'Sửa', icon: 'edit', onClick: () => openEdit(row) },
              {
                label: 'Xóa',
                icon: 'delete',
                danger: true,
                onClick: () => setDeletingTag(row),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar activeItem="Quản Lý Health Tag" />

      <div className="pl-[264px]">
        <Navbar
          title="Quản Lý Health Tag"
          subtitle="Quản lý chế độ ăn, dị ứng và thành phần tránh cho sản phẩm"
        />

        <main className="px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-5">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon="label" label="Tổng" value={counts.all} accent="border-smb-outline-variant/60" loading={loading} />
              <StatCard icon="restaurant" label="Chế độ ăn" value={counts.diet} accent="border-blue-200/80 dark:border-blue-500/20" loading={loading} />
              <StatCard icon="warning" label="Dị ứng" value={counts.allergen} accent="border-amber-200/80 dark:border-amber-500/20" loading={loading} />
              <StatCard icon="science" label="Thành phần" value={counts.ingredient} accent="border-emerald-200/80 dark:border-emerald-500/20" loading={loading} />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-smb-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm kiếm tag..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest pl-9 pr-4 py-2 text-sm text-smb-on-surface placeholder:text-smb-on-surface-variant/50 focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 transition-all"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest px-4 py-2 text-sm text-smb-on-surface outline-none focus:border-smb-primary-container focus:ring-2 focus:ring-smb-primary-container/20 transition-all"
                >
                  <option value="">Tất cả loại</option>
                  <option value="Diet">Chế độ ăn</option>
                  <option value="Allergen">Dị ứng</option>
                  <option value="Ingredient">Thành phần</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" icon="refresh" size="sm" onClick={fetchTags} disabled={loading}>
                  Làm Mới
                </Button>
                <Button variant="primary" icon="add" size="sm" onClick={openCreate}>
                  Thêm Tag
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl p-3">
                    <div className="h-8 w-48 rounded smb-skeleton" />
                    <div className="h-6 w-24 rounded-full smb-skeleton ml-auto" />
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200/60 bg-rose-50/50 py-12 gap-4">
                <span className="material-symbols-outlined text-4xl text-smb-error">error</span>
                <p className="text-sm font-semibold text-smb-error">{fetchError}</p>
                <Button variant="secondary" onClick={fetchTags}>Thử lại</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-smb-outline-variant bg-smb-surface-container-lowest py-16 gap-4">
                <span className="material-symbols-outlined text-5xl text-smb-on-surface-variant">label_off</span>
                <p className="text-sm font-semibold text-smb-on-surface">
                  {search || typeFilter ? 'Không tìm thấy tag nào.' : 'Chưa có health tag nào.'}
                </p>
                {!search && !typeFilter && (
                  <Button variant="primary" icon="add" onClick={openCreate}>Thêm Tag Đầu Tiên</Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-smb-outline-variant/50 bg-smb-surface-container-lowest shadow-sm">
                <DataTable columns={columns} data={filtered} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <FormModal
          title={editingTag ? 'Sửa Health Tag' : 'Thêm Health Tag Mới'}
          onClose={closeModal}
          onSubmit={handleSubmit}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={closeModal} disabled={submitting}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                {editingTag ? 'Lưu Thay Đổi' : 'Tạo Tag'}
              </Button>
            </>
          }
        >
          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-400">
              <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
              <span>{formError}</span>
            </div>
          )}

          <FormField label="Tên Tag" required>
            <Input
              placeholder="VD: Không đường, Hạt điều, Vegan..."
              value={form.tagName}
              onChange={(e) => handleChange('tagName', e.target.value)}
              maxLength={100}
              required
            />
          </FormField>

          <FormField label="Loại Tag" required>
            <Select
              value={form.tagType}
              onChange={(v) => handleChange('tagType', v)}
              options={TAG_TYPE_OPTIONS}
            />
          </FormField>

          <div className="rounded-xl border border-smb-outline-variant/50 bg-smb-surface-container p-4 text-sm text-smb-on-surface-variant">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">info</span>
              <div>
                <p className="font-semibold text-smb-on-surface">Hướng dẫn các loại tag:</p>
                <ul className="mt-2 space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <TagTypeBadge tagType="Diet" />
                    <span>Chế độ ăn đặc biệt (Vegan, Keto, Gluten-free...)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <TagTypeBadge tagType="Allergen" />
                    <span>Chất gây dị ứng cần tránh (đậu phộng, hải sản, sữa...)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <TagTypeBadge tagType="Ingredient" />
                    <span>Thành phần trong sản phẩm (chất bảo quản, phẩm màu...)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {/* Delete Confirm Modal */}
      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 smb-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-smb-surface-container-lowest shadow-2xl smb-slide-up">
            <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-4 text-center">
              <div className="relative flex size-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
                <div className="absolute inset-0 rounded-full bg-rose-200/50 smb-pulse-ring dark:bg-rose-500/20" />
                <span className="material-symbols-outlined text-3xl text-rose-600 dark:text-rose-400">delete</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-smb-on-surface">Xóa health tag?</h3>
                <p className="mt-2 text-sm text-smb-on-surface-variant leading-relaxed">
                  Health tag <strong className="text-smb-on-surface">"{deletingTag.tagName}"</strong> sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setDeletingTag(null)}
                disabled={deleting}
              >
                Hủy
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                loading={deleting}
              >
                Xóa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthTagManagement
