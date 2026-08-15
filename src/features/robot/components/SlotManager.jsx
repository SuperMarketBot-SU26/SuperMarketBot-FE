import React, { useCallback, useEffect, useState } from 'react'
import {
  getSlotsByShelf,
  getSlot,
  createSlot,
  updateSlot,
  deleteSlot,
  assignProductToSlot,
  unassignProductFromSlot,
} from '../api/slotsApi'
import { getProducts, getProductTypes } from '../../product/api/productApi'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function SlotManager({ shelfId, shelfName }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ slotCode: '' })
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [assigningSlot, setAssigningSlot] = useState(null)
  const [products, setProducts] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [typeFilter, setTypeFilter] = useState('')
  const [assignForm, setAssignForm] = useState({ productId: '', quantity: 1 })
  const [assigning, setAssigning] = useState(false)

  const fetchSlots = useCallback(async () => {
    if (!shelfId) return
    setLoading(true)
    setError(null)
    try {
      const summaries = await getSlotsByShelf(shelfId)
      if (!Array.isArray(summaries)) {
        setSlots([])
        return
      }
      const details = await Promise.all(
        summaries.map((s) => getSlot(s.slotId).catch(() => s))
      )
      setSlots(details)
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể tải slots.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [shelfId])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  useEffect(() => {
    if (!assigningSlot) return
    getProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      
    getProductTypes()
      .then((data) => setProductTypes(Array.isArray(data) ? data : []))
      .catch(() => setProductTypes([]))
  }, [assigningSlot])

  const filteredProducts = products.filter(p => !typeFilter || p.productTypeId === Number(typeFilter))

  const resetForm = () => {
    setForm({ slotCode: '' })
    setEditing(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.slotCode.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        shelfId,
        slotCode: form.slotCode.trim(),
      }
      if (editing) {
        await updateSlot(editing.slotId, payload)
      } else {
        await createSlot(payload)
      }
      resetForm()
      await fetchSlots()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể lưu slot.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (slot) => {
    setEditing(slot)
    setForm({
      slotCode: slot.slotCode ?? '',
    })
  }

  const handleConfirmDelete = async () => {
    if (!deletingId) return
    try {
      await deleteSlot(deletingId)
      await fetchSlots()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể xoá slot.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assigningSlot || !assignForm.productId) return
    setAssigning(true)
    setError(null)
    try {
      await assignProductToSlot(assigningSlot.slotId, {
        slotId: assigningSlot.slotId,
        productId: Number(assignForm.productId),
        quantity: Number(assignForm.quantity) || 1,
      })
      toast.success('Đã gán sản phẩm vào slot.')
      setAssigningSlot(null)
      setAssignForm({ productId: '', quantity: 1 })
      await fetchSlots()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể gán sản phẩm.')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (slotId, productId) => {
    if (!window.confirm('Bạn có chắc muốn gỡ sản phẩm này khỏi slot?')) return
    setError(null)
    try {
      await unassignProductFromSlot(slotId, productId)
      toast.success('Đã gỡ sản phẩm khỏi slot.')
      await fetchSlots()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể gỡ sản phẩm.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-smb-on-surface">
          Slots {shelfName && <span className="text-smb-on-surface-variant">— {shelfName}</span>}
        </h4>
      </div>

      {error && !assigningSlot && (
        <div className="rounded-lg bg-smb-error-container px-3 py-2 text-xs text-smb-on-error-container">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          placeholder="Mã (VD: S1)"
          value={form.slotCode}
          onChange={(e) => setForm((p) => ({ ...p, slotCode: e.target.value }))}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-smb-primary w-48"
        />
        <div className="flex gap-1 w-full sm:w-auto mt-2 sm:mt-0">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 sm:flex-none rounded-lg bg-smb-primary px-4 py-2 text-xs font-medium text-smb-on-primary hover:bg-smb-primary/90 disabled:opacity-50"
          >
            {editing ? 'Lưu' : 'Thêm'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg px-3 py-2 text-xs text-smb-on-surface-variant hover:bg-smb-surface-container"
            >
              Huỷ
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-6">
          <Icon name="progress_activity" className="animate-spin text-2xl text-smb-on-surface-variant" />
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-smb-outline-variant py-6 text-center text-sm text-smb-on-surface-variant">
          Chưa có slot nào trên kệ này.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-smb-outline-variant">
          <table className="w-full text-sm">
            <thead className="bg-smb-surface-container text-xs uppercase text-smb-on-surface-variant">
              <tr>
                <th className="px-3 py-2 text-left">Code & Sản phẩm</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-smb-outline-variant/50">
              {slots.map((slot) => (
                <tr key={slot.slotId} className="hover:bg-smb-surface-container/50 align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-smb-on-surface mb-1">{slot.slotCode}</div>
                    {slot.products && slot.products.length > 0 ? (
                      <div className="flex flex-col gap-1 mt-2">
                        {slot.products.map((p) => (
                          <div key={p.productId} className="flex items-center gap-2 text-xs text-smb-on-surface-variant bg-smb-surface-container-lowest px-2 py-1 rounded border border-smb-outline-variant/50 w-fit group">
                            <span className="font-medium text-smb-primary line-clamp-1 max-w-[150px]">{p.productName}</span>
                            <span className="text-[10px] bg-smb-surface-container px-1 rounded">x{p.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUnassign(slot.slotId, p.productId)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-smb-error hover:text-smb-on-error-container"
                              title="Gỡ sản phẩm"
                            >
                              <Icon name="close" className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-smb-on-surface-variant/70 italic mt-1">Trống</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAssigningSlot(slot)
                          setError(null)
                        }}
                        className="rounded p-1 text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-primary"
                        title="Gán sản phẩm"
                      >
                        <Icon name="add_link" className="text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(slot)}
                        className="rounded p-1 text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-primary"
                        title="Sửa"
                      >
                        <Icon name="edit" className="text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(slot.slotId)}
                        className="rounded p-1 text-smb-on-surface-variant hover:bg-smb-error-container hover:text-smb-on-error-container"
                        title="Xoá"
                      >
                        <Icon name="delete" className="text-base" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingId && (
        <ConfirmModal
          message="Xoá slot này? Sản phẩm đang được gán vào slot sẽ bị gỡ."
          confirmText="Xoá"
          confirmVariant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Assign product modal */}
      {assigningSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleAssign}
            className="w-full max-w-sm rounded-xl bg-smb-surface-container-lowest p-6 shadow-xl"
          >
            <h3 className="mb-4 text-base font-semibold text-smb-on-surface">
              Gán sản phẩm vào {assigningSlot.slotCode}
            </h3>
            
            {error && (
              <div className="mb-4 rounded-lg bg-smb-error-container px-3 py-2 text-xs text-smb-on-error-container">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setAssignForm((p) => ({ ...p, productId: '' })) // Reset product when type changes
                }}
                className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
              >
                <option value="">-- Tất cả Loại Sản Phẩm --</option>
                {productTypes.map((t) => (
                  <option key={t.productTypeId} value={t.productTypeId}>{t.typeName}</option>
                ))}
              </select>

              <select
                required
                value={assignForm.productId}
                onChange={(e) => setAssignForm((p) => ({ ...p, productId: e.target.value }))}
                className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {filteredProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>{p.productName}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                required
                placeholder="Số lượng"
                value={assignForm.quantity}
                onChange={(e) => setAssignForm((p) => ({ ...p, quantity: e.target.value }))}
                className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningSlot(null)}
                  className="rounded-lg px-4 py-2 text-sm text-smb-on-surface-variant hover:bg-smb-surface-container"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="rounded-lg bg-smb-primary px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary/90 disabled:opacity-50"
                >
                  {assigning ? 'Đang gán...' : 'Gán'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default SlotManager
