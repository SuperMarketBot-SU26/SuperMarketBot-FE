import client from './client'

const ENDPOINT = '/api/v1/import-history'

/**
 * Lấy danh sách lịch sử import Excel
 * @param {string|null} type - "PRODUCT" | "BRAND" | null (tất cả)
 * @param {number} limit - số lượng bản ghi (mặc định 20)
 */
export const getImportHistories = (type = null, limit = 20) => {
  const params = { limit }
  if (type) params.type = type
  return client.get(ENDPOINT, { params }).then((res) => res.data)
}

/**
 * Lấy chi tiết một đợt import kèm danh sách lỗi chi tiết
 * @param {number} id - ImportID
 */
export const getImportHistoryDetail = (id) =>
  client.get(`${ENDPOINT}/${id}`).then((res) => res.data)
