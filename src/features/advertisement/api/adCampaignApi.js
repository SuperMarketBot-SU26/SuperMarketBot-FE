/**
 * AdCampaign API — maps to /api/v1/ad-campaigns
 *
 * Backend endpoints:
 *   GET    /api/v1/ad-campaigns                       → paginated list
 *   GET    /api/v1/ad-campaigns/{id}                 → single campaign
 *   POST   /api/v1/ad-campaigns                      → create (no products)
 *   POST   /api/v1/ad-campaigns/with-products        → create + add sponsored products
 *   PUT    /api/v1/ad-campaigns/{id}                 → update (semanticObjectId + zoneIds + routeIds)
 *   DELETE /api/v1/ad-campaigns/{id}                 → delete
 *   POST   /api/v1/ad-campaigns/{id}/cancel          → cancel
 *   POST   /api/v1/ad-campaigns/{id}/pause           → pause
 *   POST   /api/v1/ad-campaigns/{id}/activate        → activate (requires ≥1 targeting)
 *   GET    /api/v1/ad-campaigns/{id}/routes          → assigned routes (routeId, routeName, price)
 *   POST   /api/v1/ad-campaigns/{id}/routes          → assign routes (charge per route)
 *   GET    /api/v1/ad-campaigns/{id}/zones           → purchased zones (zonePriceCharged + purchasedAt)
 *   POST   /api/v1/ad-campaigns/{id}/zones           → buy & assign zones (charges new zones only)
 *   GET    /api/v1/ad-campaigns/{id}/shelves         → 0 or 1 assigned shelf
 *   POST   /api/v1/ad-campaigns/{id}/shelves         → assign shelf (exactly 1 id required)
 *   GET    /api/v1/ad-campaigns/{id}/logs            → paginated activity logs
 *   POST   /api/v1/ad-campaigns/{id}/impression      → track banner view (public, member optional)
 *   POST   /api/v1/ad-campaigns/{id}/click           → track banner click (public, member optional)
 *
 * Query params for list: pageNumber, pageSize, status, brandId, fromDate, toDate, searchTerm
 *
 * CampaignResponseDto fields:
 *   { adCampaignId, campaignName, packageId, packageName, brandId, brandName,
 *     semanticObjectId, startDate, endDate, status, sponsoredProductCount,
 *     totalSpent, routeIds[] }
 *
 * Note: zones & shelves are NOT in CampaignResponseDto — fetch via /zones and /shelves.
 */

import client from '../../../api/client'

const ENDPOINT = '/api/v1/ad-campaigns'

export const getCampaigns = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data)

export const getCampaign = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}`).then((res) => res.data)

export const createCampaign = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

export const createCampaignWithProducts = (payload) =>
  client.post(`${ENDPOINT}/with-products`, payload).then((res) => res.data)

export const updateCampaign = (campaignId, payload) =>
  client.put(`${ENDPOINT}/${campaignId}`, payload).then((res) => res.data)

export const deleteCampaign = (campaignId) =>
  client.delete(`${ENDPOINT}/${campaignId}`).then((res) => res.data)

export const cancelCampaign = (campaignId) =>
  client.post(`${ENDPOINT}/${campaignId}/cancel`).then((res) => res.data)

export const pauseCampaign = (campaignId, reason) =>
  client.post(`${ENDPOINT}/${campaignId}/pause`, reason ? { reason } : null).then((res) => res.data)

export const activateCampaign = (campaignId) =>
  client.post(`${ENDPOINT}/${campaignId}/activate`).then((res) => res.data)

export const completeCampaign = (campaignId) =>
  client.post(`${ENDPOINT}/${campaignId}/complete`).then((res) => res.data)

export const getCompletionStatus = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}/completion-status`).then((res) => res.data)

// ── Routes ───────────────────────────────────────────────────────────────────
export const getCampaignRoutes = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}/routes`).then((res) => res.data)

export const assignCampaignRoutes = (campaignId, routeIds) =>
  client.post(`${ENDPOINT}/${campaignId}/routes`, { routeIds }).then((res) => res.data)

// ── Zones ────────────────────────────────────────────────────────────────────
// POST returns { adCampaignId, brandId, zoneCount, totalZoneCharge, zones[] }
//   zones[] = { zoneId, zoneName, floorId, floorName, zonePriceCharged, purchasedAt }
// GET returns the same shape (no body).
export const getCampaignZones = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}/zones`).then((res) => res.data)

export const assignCampaignZones = (campaignId, zoneIds) =>
  client.post(`${ENDPOINT}/${campaignId}/zones`, { zoneIds }).then((res) => res.data)

// ── Shelves ──────────────────────────────────────────────────────────────────
// BE schema is SINGULAR: payload must contain exactly 1 id in semanticObjectIds[].
// POST returns { adCampaignId, brandId, shelfCount, totalShelfCharge, shelves[] }
//   shelves[] = { semanticObjectId, label, shelfPriceCharged, purchasedAt }
// GET returns the same shape — `shelves: []` when no shelf assigned.
export const getCampaignShelf = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}/shelves`).then((res) => res.data)

export const assignCampaignShelf = (campaignId, semanticObjectId) =>
  client.post(`${ENDPOINT}/${campaignId}/shelves`, { semanticObjectIds: [semanticObjectId] }).then((res) => res.data)

// ── Targeting context (single-fetch cho UI) ───────────────────────────────
// GET /api/v1/ad-campaigns/{id}/targeting-context?floorId=N
// → { mapId, floorId, shelves[], routes[], assignedRouteIds[] }
export const getTargetingContext = (campaignId, floorId) =>
  client
    .get(`${ENDPOINT}/${campaignId}/targeting-context`, { params: { floorId } })
    .then((res) => res.data)

// ── Brand wallet ───────────────────────────────────────────────────────────
// GET /api/v1/brands/{id}/wallet  → { brandId, balance, currency }
export const getBrandWallet = (brandId) =>
  client.get(`/api/v1/brands/${brandId}/wallet`).then((res) => res.data)

// ── Sponsored products ──────────────────────────────────────────────────────
// GET /api/v1/ad-campaigns/{id}/sponsored-products
// → { adCampaignId, brandId, products[]: { productId, productName, sku, imageUrl, price } } (assumed)
// POST /api/v1/ad-campaigns/{id}/sponsored-products { productIds } → assign products
export const getCampaignSponsoredProducts = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}/sponsored-products`).then((res) => res.data)

export const assignCampaignSponsoredProducts = (campaignId, productIds) =>
  client.post(`${ENDPOINT}/${campaignId}/sponsored-products`, { productIds }).then((res) => res.data)

export const getCampaignLogs = (campaignId, pageNumber = 1, pageSize = 20) =>
  client.get(`${ENDPOINT}/${campaignId}/logs`, { params: { pageNumber, pageSize } }).then((res) => res.data)

// ── Public tracking (impression + click) ────────────────────────────────────
// POST /api/v1/ad-campaigns/{id}/impression
//   body: { memberId?: number|null, zoneId?: number|null, productId?: number|null }
//   → 200 OK { success: true, message: "Impression logged" }
// POST /api/v1/ad-campaigns/{id}/click
//   body: { memberId?: number|null, zoneId?: number|null, productId?: number|null }
//   → 200 OK { success: true, message: "Click logged" }
// Notes:
//   - Public endpoints (no admin auth). BE accepts null memberId for guests.
//   - Send only fields you have; missing fields are null on BE side.
//   - These calls are fire-and-forget from FE; failures should NOT block UI.
//     Caller should wrap in try/catch (the `useAdTracking` hook does this).
export const trackImpression = (campaignId, payload = {}) =>
  client.post(`${ENDPOINT}/${campaignId}/impression`, payload).then((res) => res.data)

export const trackClick = (campaignId, payload = {}) =>
  client.post(`${ENDPOINT}/${campaignId}/click`, payload).then((res) => res.data)

// ── Robot events (admin / debug) ────────────────────────────────────────────
// POST /api/v1/robot-events
//   body: { robotId: number, zoneId: number, xCoord?: number, yCoord?: number, productId?: number }
//   → 200 OK { success: true, logId: number, campaignId: number|null, message: string }
// Notes:
//   - Public-ish endpoint used by robot fleet (no admin auth).
//   - BE auto-detects the active campaign in the zone and writes a RoutePass log.
//   - If no active campaign exists in the zone → returns 200 with campaignId: null
//     and message "No active campaign in zone #N".
export const recordRobotEvent = (payload) =>
  client.post('/api/v1/robot-events', payload).then((res) => res.data)

// ── AdCampaignLogResponseDto shape (for type hints / docs) ──────────────────
// {
//   id, adCampaignId, action, amount,
//   zoneId?, robotId?, productId?, memberId?,
//   performedBy?, performedByUserId?,   // populated from JWT when admin calls
//   description?, createdAt
// }
// - For human-driven events (Impression, Click): memberId set, robotId null.
// - For robot events (RoutePass): robotId + zoneId set, memberId null.
// - For admin actions (AssignZone, Activate, ...): performedBy set if JWT present.
// - performedByUserId is the admin's user id (FK to AspNetUsers).