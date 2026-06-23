/**
 * AdPackage API — maps directly to /api/v1/ad-packages
 *
 * BE expects:
 *   Create/Update: { packageName, pricePackage, priceRoute, basePriceClick, adScore, status? }
 *   Response item: { packageId, packageName, pricePackage, priceRoute, basePriceClick, adScore, status, activeCampaignCount }
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/ad-packages'

export const getPackages = () =>
  client.get(ENDPOINT).then((res) => res.data)

export const getPackage = (packageId) =>
  client.get(`${ENDPOINT}/${packageId}`).then((res) => res.data)

export const createPackage = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

export const updatePackage = (packageId, payload) =>
  client.put(`${ENDPOINT}/${packageId}`, payload).then((res) => res.data)

export const deletePackage = (packageId) =>
  client.delete(`${ENDPOINT}/${packageId}`).then((res) => res.data)
