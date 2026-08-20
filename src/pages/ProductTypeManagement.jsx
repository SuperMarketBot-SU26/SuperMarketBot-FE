import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

import Sidebar from '../components/Sidebar'
import { ConfirmModal } from '../components/ConfirmModal'
import { Button } from '../components/ui/Button'
import { getProductTypes, getSubcategories } from '../features/product/api/productApi'
import {
  createAdminProductType,
  updateAdminProductType,
  deleteAdminProductType,
} from '../features/product/api/adminProductApi'

const EMPTY_FORM = {
  subcategoryId: '',
  typeName: '',
}

export function ProductTypeManagement() {
  const navigate = useNavigate()

  const [productTypes, setProductTypes] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // Delete states
  const [deletingType, setDeletingType] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ptRes, subRes] = await Promise.all([
        getProductTypes(),
        getSubcategories()
      ])
      setProductTypes(Array.isArray(ptRes) ? ptRes : [])
      setSubcategories(Array.isArray(subRes) ? subRes : [])
    } catch (err) {
      setError(err?.message || 'Không thể tải dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get Subcategory Name helper
  const getSubcategoryName = (subId) => {
    const sub = subcategories.find(s => s.subcategoryId === subId)
    return sub ? sub.subcategoryName : 'Không xác định'
  }

  const filteredTypes = productTypes.filter((pt) =>
    !search || pt.typeName.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => {
    setEditingType(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (pt) => {
    setEditingType(pt)
    setForm({
      subcategoryId: pt.subcategoryId,
      typeName: pt.typeName,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.typeName.trim() || !form.subcategoryId) {
      toast.warning('Vui lòng nhập tên loại và chọn danh mục con.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        subcategoryId: parseInt(form.subcategoryId, 10),
        typeName: form.typeName.trim(),
      }

      if (editingType) {
        await updateAdminProductType(editingType.productTypeId, payload)
        toast.success('Cập nhật thành công!')
      } else {
        await createAdminProductType(payload)
        toast.success('Thêm mới thành công!')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingType) return
    setDeleting(true)
    try {
      await deleteAdminProductType(deletingType.productTypeId)
      toast.success('Xóa loại sản phẩm thành công!')
      setDeletingType(null)
      fetchData()
    } catch (err) {
      // Backend will return BadRequestException (which maps to 400 with a message) if products exist
      toast.error(err?.response?.data?.message || err?.message || 'Không thể xóa loại sản phẩm.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-screen bg-smb-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-smb-outline-variant/30 bg-smb-surface/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-smb-on-surface">Quản Lý Loại Sản Phẩm</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/products')} size="sm">
              Quản Lý Sản Phẩm
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl">
            
            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-smb-on-surface-variant">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm loại sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-72 rounded-xl border border-smb-outline-variant/60 bg-smb-surface-container-lowest pl-9 pr-4 py-2 text-sm text-smb-on-surface outline-none focus:border-smb-primary-container focus:ring-2 focus:ring-smb-primary-container/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" icon="refresh" size="sm" onClick={fetchData} disabled={loading}>
                  Làm Mới
                </Button>
                <Button variant="primary" icon="add" size="sm" onClick={openCreate}>
                  Thêm Loại
                </Button>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-smb-error/20 bg-smb-error-container/50 px-4 py-3 text-sm text-smb-on-error-container">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center p-12">
                <div className="size-8 animate-spin rounded-full border-4 border-smb-primary border-t-transparent" />
              </div>
            ) : (
              <div className="rounded-2xl border border-smb-outline-variant/40 bg-smb-surface-container-lowest shadow-sm smb-fade-in overflow-hidden">
                <table className="w-full text-left text-sm text-smb-on-surface">
                  <thead className="bg-smb-surface-container/30 text-xs font-semibold uppercase text-smb-on-surface-variant">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Tên Loại Sản Phẩm</th>
                      <th className="px-6 py-4">Danh Mục Con (Subcategory)</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-smb-outline-variant/30">
                    {filteredTypes.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-smb-on-surface-variant">
                          Không tìm thấy loại sản phẩm nào.
                        </td>
                      </tr>
                    ) : (
                      filteredTypes.map((pt) => (
                        <tr key={pt.productTypeId} className="hover:bg-smb-surface-container-lowest/80 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-smb-on-surface-variant">
                            #{pt.productTypeId}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {pt.typeName}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-lg bg-smb-surface-container-low px-2 py-1 text-xs font-medium text-smb-on-surface">
                              {getSubcategoryName(pt.subcategoryId)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEdit(pt)}
                                className="flex size-8 items-center justify-center rounded-lg border border-smb-outline-variant bg-smb-surface hover:bg-smb-surface-container hover:text-smb-primary transition-colors text-smb-on-surface-variant"
                                title="Chỉnh sửa"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => setDeletingType(pt)}
                                className="flex size-8 items-center justify-center rounded-lg border border-smb-error/30 bg-smb-error-container/20 text-smb-error hover:bg-smb-error hover:text-white transition-colors"
                                title="Xóa"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 smb-fade-in">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-2xl bg-smb-surface-container-lowest p-6 shadow-xl smb-slide-up"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-smb-on-surface">
                {editingType ? 'Chỉnh Sửa Loại Sản Phẩm' : 'Thêm Loại Sản Phẩm Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-smb-surface hover:bg-smb-surface-container text-smb-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-smb-on-surface">Tên Loại Sản Phẩm *</span>
                <input
                  required
                  type="text"
                  value={form.typeName}
                  onChange={(e) => setForm((p) => ({ ...p, typeName: e.target.value }))}
                  className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
                  placeholder="Ví dụ: Nước ngọt có gas"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-smb-on-surface">Danh Mục Con (Subcategory) *</span>
                <select
                  required
                  value={form.subcategoryId}
                  onChange={(e) => setForm((p) => ({ ...p, subcategoryId: e.target.value }))}
                  className="rounded-xl border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
                >
                  <option value="">-- Chọn danh mục con --</option>
                  {subcategories.map((s) => (
                    <option key={s.subcategoryId} value={s.subcategoryId}>
                      {s.subcategoryName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu Lại'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingType && (
        <ConfirmModal
          message={`Bạn có chắc chắn muốn xóa loại sản phẩm "${deletingType.typeName}"? Thao tác này không thể hoàn tác.`}
          confirmText="Xóa"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeletingType(null)}
          loading={deleting}
        />
      )}
    </div>
  )
}
