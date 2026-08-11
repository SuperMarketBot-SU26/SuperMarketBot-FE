/**
 * Dashboard API — /api/dashboard
 *
 * Backend endpoints (DashboardController.cs):
 *   GET /api/dashboard/revenue       → RevenueReportDto
 *   GET /api/dashboard/out-of-stock  → OutOfStockReportDto[]
 *   GET /api/dashboard/robots        → RobotPerformanceReportDto[]
 *
 * RevenueReportDto:
 *   { totalRevenueVnd, byDay: [{ date, revenueVnd }],
 *     byBrand: [{ brandId, brandName, revenueVnd }] }
 *
 * OutOfStockReportDto:
 *   { productId, productName, outOfStockCount, lastRestockAt? }
 *
 * RobotPerformanceReportDto:
 *   { robotCode, robotName, uptimePercent, distanceKm,
 *     tasksCompleted, batteryAvg, lastSeenAt }
 *
 * All endpoints require Admin role (BE-side guard).
 * Query params supported (per BE):
 *   revenue:       fromDate, toDate, groupBy (day|week|month)
 *   out-of-stock:  limit (default 20)
 *   robots:        fromDate, toDate
 */

import client from '../../../api/client'

const ENDPOINT = '/dashboard'

/**
 * Get revenue report.
 * @param {{ fromDate?: string, toDate?: string, groupBy?: 'day'|'week'|'month' }} params
 */
export const getRevenueReport = (params = {}) =>
  client.get(`${ENDPOINT}/revenue`, { params }).then((res) => res.data ?? null)

/**
 * Get top out-of-stock products.
 * @param {{ limit?: number }} params
 */
export const getOutOfStockReport = (params = {}) =>
  client.get(`${ENDPOINT}/out-of-stock`, { params }).then((res) => res.data ?? [])

/**
 * Get robot performance metrics.
 * @param {{ fromDate?: string, toDate?: string }} params
 */
export const getRobotPerformance = (params = {}) =>
  client.get(`${ENDPOINT}/robots`, { params }).then((res) => res.data ?? [])
