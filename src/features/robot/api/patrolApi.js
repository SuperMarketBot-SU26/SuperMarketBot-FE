import client from '../../../api/client'

const SHELF_SCANS_ENDPOINT = '/api/shelf-scans'
const STAFF_ENDPOINT = '/api/staff'
const PATROL_ENDPOINT = '/api/v1/shelf-patrol'
const NAVIGATION_ENDPOINT = '/api/v1/navigation'

/**
 * Lấy danh sách các lần quét kệ gần nhất của robot
 * @param {number} take - Số lượng bản ghi (mặc định 50)
 */
export const getRecentScans = async (take = 50) => {
  const res = await client.get(SHELF_SCANS_ENDPOINT, { params: { take } })
  return res.data
}

/**
 * Lấy mật độ chi tiết của toàn bộ 6 kệ hàng
 */
export const getShelfDensities = async () => {
  const res = await client.get(`${STAFF_ENDPOINT}/shelves/density`)
  return res.data
}

/**
 * Lấy danh sách nhiệm vụ bổ sung hàng (Restock Tasks) của nhân viên
 */
export const getRestockTasks = async () => {
  const res = await client.get(`${STAFF_ENDPOINT}/tasks`)
  return res.data
}

/**
 * Nhân viên / Admin xác nhận đã hoàn tất châm hàng tại kệ
 * @param {{ aisleId: number, aisleNodeId?: number, resolvedSlotIds?: number[] }} payload
 */
export const completeRestockTask = async (payload) => {
  const res = await client.post(`${STAFF_ENDPOINT}/tasks/complete`, payload)
  return res.data
}

/**
 * Xóa hoặc ẩn nhiệm vụ bổ sung hàng
 * @param {number} id
 */
export const deleteRestockTask = async (id) => {
  const res = await client.delete(`${STAFF_ENDPOINT}/tasks/${id}`)
  return res.data
}

/**
 * Lấy lịch sử bổ sung hàng / tương tác kệ của nhân viên đã hoàn tất
 * @param {number} take - Số lượng bản ghi (mặc định 50)
 */
export const getRestockHistory = async (take = 50) => {
  const res = await client.get(`${STAFF_ENDPOINT}/tasks/history`, { params: { take } })
  return res.data
}

/**
 * Báo cáo kệ hàng bị trống hoặc che khuất (Report OOS)
 * @param {{ shelfId: number, slotId?: number, aisleId?: number, robotId?: number, reporterNote?: string }} payload
 */
export const reportOutOfStock = async (payload) => {
  const res = await client.post(`${SHELF_SCANS_ENDPOINT}/report-oos`, payload)
  return res.data
}

/**
 * Kiểm tra trạng thái sẵn sàng của hệ thống tuần tra (DB, Gemini AI, Cloudinary)
 */
export const getPatrolReadiness = async () => {
  const res = await client.get(`${PATROL_ENDPOINT}/readiness`)
  return res.data
}

/**
 * Phát lệnh tuần tra tự hành cho Robot (theo RouteId hoặc theo danh sách NodeIds của kệ đã chọn)
 * @param {{ robotCode: string, flowType: 'patrol', robotRouteId?: number, nodeIds?: number[], floorId?: number }} payload
 */
export const dispatchPatrolMission = async (payload) => {
  const res = await client.post(`${NAVIGATION_ENDPOINT}/dispatch-autonomous`, {
    flowType: 'patrol',
    floorId: 1,
    ...payload,
  })
  return res.data
}

/**
 * Lấy danh sách tuyến đường tuần tra định sẵn
 */
export const getPatrolRoutes = async () => {
  const res = await client.get('/api/v1/robot-routes')
  return res.data
}

/**
 * Lấy danh sách toàn bộ kệ hàng trong siêu thị
 */
export const getShelves = async () => {
  const res = await client.get('/api/v1/shelves')
  return res.data
}

/**
 * Lấy lịch sử toàn bộ các hoạt động di chuyển tự hành (Dẫn đường, Quảng cáo, Tuần tra) từ mọi nguồn tương tác
 * @param {{ flowType?: string, source?: string, status?: string, take?: number }} params
 */
export const getAutonomousMissionsHistory = async (params = {}) => {
  const res = await client.get(`${NAVIGATION_ENDPOINT}/autonomous-missions/history`, { params })
  return res.data
}
