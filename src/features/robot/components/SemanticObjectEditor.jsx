/**
 * SemanticObjectEditor
 *
 * Floating panel that appears when an admin clicks a shelf (semantic object)
 * on the map. Shows the shelf's current assignment and lets them:
 *   - View/edit the product type assigned to it
 *   - See related metadata (aisle, zone, coordinates)
 *   - Unassign the product type
 *
 * Props:
 *   object        — the semantic object from the map (shape from BE)
 *   productTypes  — array from GET /api/products/product-types  { productTypeId, name, ... }
 *   onAssign      — (objectId, productTypeId) => Promise
 *   onUnassign    — (objectId) => Promise
 *   onClose       — () => void
 *   position      — {{ x, y }} in pixels — where to render the panel
 */

import React, { useState } from 'react'
import { assignProductType, unassignProductType } from '../api/zonesApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

const OBJECT_TYPE_LABELS = {
  shelf: 'Kệ hàng',
  charger: 'Trạm sạc',
  entrance: 'Lối vào',
  exit: 'Lối ra',
  display: 'Kệ trưng bày',
}

export function SemanticObjectEditor({
  object,
  productTypes = [],
  onAssign,
  onUnassign,
  onClose,
  position = { x: 0, y: 0 },
}) {
  const [selectedTypeId, setSelectedTypeId] = useState(
    object.productTypeId ?? object.assignedProductTypeId ?? null
  )
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null) // null | { type: 'success'|'error', msg }

  if (!object) return null

  const objectTypeLabel = OBJECT_TYPE_LABELS[object.objectType] || object.objectType || 'Đối tượng'
  const assignedType = productTypes.find((pt) => pt.productTypeId === selectedTypeId)

  const handleAssign = async () => {
    if (selectedTypeId == null) return
    setSaving(true)
    setStatus(null)
    try {
      await assignProductType(object.objectId ?? object.id, selectedTypeId)
      setStatus({ type: 'success', msg: `Đã gán "${assignedType?.name || `#${selectedTypeId}`}" vào kệ` })
      onAssign?.(object.objectId ?? object.id, selectedTypeId)
    } catch (e) {
      setStatus({ type: 'error', msg: e?.response?.data?.message || e.message || 'Lỗi gán sản phẩm' })
    } finally {
      setSaving(false)
    }
  }

  const handleUnassign = async () => {
    setSaving(true)
    setStatus(null)
    try {
      await unassignProductType(object.objectId ?? object.id)
      setSelectedTypeId(null)
      setStatus({ type: 'success', msg: 'Đã gỡ gán loại sản phẩm khỏi kệ' })
      onUnassign?.(object.objectId ?? object.id)
    } catch (e) {
      setStatus({ type: 'error', msg: e?.response?.data?.message || e.message || 'Lỗi gỡ gán' })
    } finally {
      setSaving(false)
    }
  }

  // Panel width ~280px — flip horizontally if near right edge
  const style = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 300),
    top: Math.min(position.y, window.innerHeight - 400),
    zIndex: 50,
  }

  return (
    <div
      style={style}
      className="w-72 rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-smb-outline-variant/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-smb-primary/10">
            <Icon name="inventory_2" className="text-[18px] text-smb-primary" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-smb-on-surface leading-tight">
              {object.label || object.objectName || `${objectTypeLabel} #${object.objectId ?? object.id}`}
            </h4>
            <p className="text-[10px] text-smb-on-surface-variant">{objectTypeLabel}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-smb-on-surface-variant hover:bg-smb-surface-container hover:text-smb-on-surface"
        >
          <Icon name="close" className="text-[16px]" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-3 px-4 py-3">
        {/* Metadata */}
        {(object.xMin != null || object.yMin != null) && (
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-smb-surface-container p-2.5 text-[10px]">
            <MetaField label="X" value={object.xMin?.toFixed(1)} unit="m" />
            <MetaField label="Y" value={object.yMin?.toFixed(1)} unit="m" />
            {object.xMax != null && <MetaField label="Rộng" value={(object.xMax - object.xMin)?.toFixed(1)} unit="m" />}
            {object.yMax != null && <MetaField label="Cao" value={(object.yMax - object.yMin)?.toFixed(1)} unit="m" />}
            {object.productTypeId && <MetaField label="Type ID" value={String(object.productTypeId)} />}
          </div>
        )}

        {/* Current assignment */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
            Loại sản phẩm trên kệ
          </p>
          {assignedType ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <Icon name="category" className="text-[16px] text-emerald-600" />
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-700">{assignedType.name}</p>
                {assignedType.description && (
                  <p className="text-[10px] text-emerald-600">{assignedType.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-smb-outline-variant bg-smb-surface-container px-3 py-2">
              <Icon name="help" className="text-[16px] text-smb-on-surface-variant" />
              <p className="text-xs text-smb-on-surface-variant">Chưa gán loại sản phẩm</p>
            </div>
          )}
        </div>

        {/* Product type selector */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-smb-on-surface-variant">
            {assignedType ? 'Đổi loại sản phẩm' : 'Gán loại sản phẩm'}
          </p>
          <select
            value={selectedTypeId ?? ''}
            onChange={(e) => setSelectedTypeId(e.target.value ? Number(e.target.value) : null)}
            disabled={saving}
            className="w-full rounded-xl border border-smb-outline-variant bg-smb-surface-container px-3 py-2 text-xs font-medium text-smb-on-surface outline-none focus:border-smb-primary"
          >
            <option value="">— Chọn loại sản phẩm —</option>
            {productTypes.map((pt) => (
              <option key={pt.productTypeId} value={pt.productTypeId}>
                {pt.name || `Loại #${pt.productTypeId}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status message */}
        {status && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              status.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <Icon
              name={status.type === 'success' ? 'check_circle' : 'error'}
              className="text-[14px] shrink-0"
            />
            {status.msg}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t border-smb-outline-variant/60 px-4 py-3">
        {selectedTypeId != null && selectedTypeId !== (object.productTypeId ?? object.assignedProductTypeId) && (
          <button
            onClick={handleAssign}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-smb-primary py-2 text-xs font-bold text-white hover:bg-smb-primary/90 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Icon name="progress_activity" className="animate-spin text-[14px]" /> : <Icon name="check" className="text-[14px]" />}
            {saving ? 'Đang lưu…' : 'Lưu gán'}
          </button>
        )}
        {selectedTypeId != null && (
          <button
            onClick={handleUnassign}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-95 disabled:opacity-50"
          >
            <Icon name="link_off" className="text-[14px]" />
            Gỡ gán
          </button>
        )}
      </div>
    </div>
  )
}

function MetaField({ label, value, unit }) {
  if (value == null) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-smb-on-surface-variant">{label}</span>
      <span className="font-mono font-semibold text-smb-on-surface">
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}
