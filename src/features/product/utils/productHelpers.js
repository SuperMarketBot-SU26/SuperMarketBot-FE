export const formatVND = (value) =>
  Number(value || 0).toLocaleString('vi-VN')

export const statusVariant = (status) => ({
  Active: 'success',
  Inactive: 'neutral',
  Discontinued: 'error',
})[status] || 'neutral'

export const statusVariantInline = (status) => ({
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-gray-100 text-gray-600',
  Discontinued: 'bg-red-100 text-red-700',
})[status] || 'bg-gray-100 text-gray-600'

export const statusLabel = (status) => ({
  Active: 'Hoạt động',
  Inactive: 'Tạm dừng',
  Discontinued: 'Ngừng bán',
})[status] || status
