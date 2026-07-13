/**
 * AdCampaign API — maps to /api/v1/ad-campaigns
 *
 * Backend endpoints:
 *   GET    /api/v1/ad-campaigns              → paginated list
 *   GET    /api/v1/ad-campaigns/{id}        → single campaign
 *   POST   /api/v1/ad-campaigns             → create
 *   PUT    /api/v1/ad-campaigns/{id}        → update (semanticObjectId + zoneIds + routeIds)
 *   DELETE /api/v1/ad-campaigns/{id}        → delete
 *   POST   /api/v1/ad-campaigns/{id}/cancel → cancel
 *   POST   /api/v1/ad-campaigns/{id}/pause  → pause
 *   POST   /api/v1/ad-campaigns/{id}/activate → activate (requires ≥1 targeting)
 *   GET    /api/v1/ad-campaigns/{id}/routes → assigned routes (routeId, routeName, price)
 *   POST   /api/v1/ad-campaigns/{id}/routes  → assign routes
 *
 * Query params for list: pageNumber, pageSize, status, brandId, fromDate, toDate, searchTerm
 *
 * CampaignResponseDto fields:
 *   { adCampaignId, campaignName, packageId, packageName, brandId, brandName,
 *     semanticObjectId, startDate, endDate, status, sponsoredProductCount,
 *     totalSpent, routeIds[] }
 *
 * Note: zoneIds is NOT in CampaignResponseDto — derive from GET /campaigns/{id}/routes
 *       or from GET /routes (each route has zoneId/zoneName).
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/ad-campaigns'

export const getCampaigns = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data)

export const getCampaign = (campaignId) =>
  client.get(`${ENDPOINT}/${campaignId}`).then((res) => res.data)

export const createCampaign = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

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
