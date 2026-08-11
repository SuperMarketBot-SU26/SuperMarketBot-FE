/**
 * Slots API — /api/v1/slots and /api/v1/shelves/{shelfId}/slots
 *
 * Backend endpoints (SlotsController.cs):
 *   GET    /api/v1/shelves/{shelfId}/slots     → SlotDto[] (slots under a shelf)
 *   GET    /api/v1/slots/{slotId}              → SlotDto (single slot detail)
 *   POST   /api/v1/slots                       → create
 *   PUT    /api/v1/slots/{slotId}              → update
 *   DELETE /api/v1/slots/{slotId}              → delete
 *   POST   /api/v1/slots/{slotId}/products     → assign a product with quantity
 *   DELETE /api/v1/slots/{slotId}/products/{productId} → unassign product
 *   GET    /api/v1/products/{productId}/slots  → find slots containing a product
 *
 * SlotDto: { slotId, shelfId, slotCode, rowIndex, columnIndex, capacity?, currentQuantity? }
 *
 * CreateSlotRequestDto:        { shelfId, slotCode, rowIndex, columnIndex, capacity? }
 * UpdateSlotRequestDto:        { slotCode?, rowIndex?, columnIndex?, capacity? }
 * AssignProductToSlotRequestDto: { productId, quantity }
 */

import client from '../../../api/client'

const SLOTS_ENDPOINT = '/api/v1/slots'
const SHELVES_SLOTS_ENDPOINT = (shelfId) => `/api/v1/shelves/${shelfId}/slots`

/** List slots under a shelf. */
export const getSlotsByShelf = async (shelfId) => {
  const res = await client.get(SHELVES_SLOTS_ENDPOINT(shelfId))
  return Array.isArray(res.data) ? res.data : []
}

/** Get a single slot. */
export const getSlot = async (slotId) => {
  const res = await client.get(`${SLOTS_ENDPOINT}/${slotId}`)
  return res.data
}

/** Create a new slot. */
export const createSlot = async (payload) => {
  const res = await client.post(SLOTS_ENDPOINT, payload)
  return res.data
}

/** Update an existing slot. */
export const updateSlot = async (slotId, payload) => {
  const res = await client.put(`${SLOTS_ENDPOINT}/${slotId}`, payload)
  return res.data
}

/** Delete a slot. */
export const deleteSlot = async (slotId) => {
  const res = await client.delete(`${SLOTS_ENDPOINT}/${slotId}`)
  return res.data ?? { success: true }
}

/**
 * Assign a product to a slot (with quantity).
 * @param {number} slotId
 * @param {{ productId: number, quantity: number }} payload
 */
export const assignProductToSlot = async (slotId, payload) => {
  const res = await client.post(`${SLOTS_ENDPOINT}/${slotId}/products`, payload)
  return res.data
}

/** Unassign a product from a slot. */
export const unassignProductFromSlot = async (slotId, productId) => {
  const res = await client.delete(`${SLOTS_ENDPOINT}/${slotId}/products/${productId}`)
  return res.data ?? { success: true }
}

/** Find which slots contain a given product. */
export const getSlotsByProduct = async (productId) => {
  const res = await client.get(`/api/v1/products/${productId}/slots`)
  return Array.isArray(res.data) ? res.data : []
}
