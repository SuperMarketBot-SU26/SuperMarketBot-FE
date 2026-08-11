import React, { useCallback, useEffect, useState } from 'react'
import {
  getSlotsByShelf,
  createSlot,
  updateSlot,
  deleteSlot,
  assignProductToSlot,
  unassignProductFromSlot,
} from '../api/slotsApi'
import { getProducts } from '../../product/api/productApi'
import { ConfirmModal } from '../../../components/ConfirmModal'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function SlotManager({ shelfId, shelfName }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ slotCode: '', rowIndex: 1, columnIndex: 1, capacity: '' })
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [assigningSlot, setAssigningSlot] = useState(null)
  const [products, setProducts] = useState([])
  const [assignForm, setAssignForm] = useState({ productId: '', quantity: 1 })

  const fetchSlots = useCallback(async () => {
    if (!shelfId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getSlotsByShelf(shelfId)
      setSlots(Array.isArray(data) ? data : [])
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
  }, [assigningSlot])

  const resetForm = () => {
    setForm({ slotCode: '', rowIndex: 1, columnIndex: 1, capacity: '' })
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
        rowIndex: Number(form.rowIndex) || 1,
        columnIndex: Number(form.columnIndex) || 1,
        capacity: form.capacity === '' ? null : Number(form.capacity),
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
      rowIndex: slot.rowIndex ?? 1,
      columnIndex: slot.columnIndex ?? 1,
      capacity: slot.capacity ?? '',
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
    try {
      await assignProductToSlot(assigningSlot.slotId, {
        productId: Number(assignForm.productId),
        quantity: Number(assignForm.quantity) || 1,
      })
      setAssigningSlot(null)
      setAssignForm({ productId: '', quantity: 1 })
      await fetchSlots()
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Không thể gán sản phẩm.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-smb-on-surface">
          Slots {shelfName && <span className="text-smb-on-surface-variant">— {shelfName}</span>}
        </h4>
      </div>

      {error && (
        <div className="rounded-lg bg-smb-error-container px-3 py-2 text-xs text-smb-on-error-container">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        <input
          type="text"
          required
          placeholder="Slot code (VD: S01-L1)"
          value={form.slotCode}
          onChange={(e) => setForm((p) => ({ ...p, slotCode: e.target.value }))}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-smb-primary"
        />
        <input
          type="number"
          min="1"
          placeholder="Hàng"
          value={form.rowIndex}
          onChange={(e) => setForm((p) => ({ ...p, rowIndex: e.target.value }))}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-smb-primary"
        />
        <input
          type="number"
          min="1"
          placeholder="Cột"
          value={form.columnIndex}
          onChange={(e) => setForm((p) => ({ ...p, columnIndex: e.target.value }))}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-smb-primary"
        />
        <input
          type="number"
          min="0"
          placeholder="Sức chứa"
          value={form.capacity}
          onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-smb-primary"
        />
        <div className="flex gap-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-smb-primary px-3 py-2 text-xs font-medium text-smb-on-primary hover:bg-smb-primary/90 disabled:opacity-50"
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

      {/* List */}
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
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-center">Hàng</th>
                <th className="px-3 py-2 text-center">Cột</th>
                <th className="px-3 py-2 text-center">Sức chứa</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-smb-outline-variant/50">
              {slots.map((slot) => (
                <tr key={slot.slotId} className="hover:bg-smb-surface-container/50">
                  <td className="px-3 py-2 font-medium text-smb-on-surface">{slot.slotCode}</td>
                  <td className="px-3 py-2 text-center text-smb-on-surface-variant">{slot.rowIndex}</td>
                  <td className="px-3 py-2 text-center text-smb-on-surface-variant">{slot.columnIndex}</td>
                  <td className="px-3 py-2 text-center text-smb-on-surface-variant">{slot.capacity ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setAssigningSlot(slot)}
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
            <div className="flex flex-col gap-3">
              <select
                required
                value={assignForm.productId}
                onChange={(e) => setAssignForm((p) => ({ ...p, productId: e.target.value }))}
                className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2 text-sm outline-none focus:border-smb-primary"
              >
                <option value="">-- Chọn sản phẩm --</option>
                {products.map((p) => (
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
            </div>
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
                className="rounded-lg bg-smb-primary px-4 py-2 text-sm font-medium text-smb-on-primary hover:bg-smb-primary/90"
              >
                Gán
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default SlotManager
