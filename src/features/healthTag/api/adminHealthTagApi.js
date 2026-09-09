/**
 * Admin HealthTag API — maps to /api/v1/admin/health-tags
 *
 * Backend endpoints (Authorize[Admin]):
 *   GET    /api/v1/admin/health-tags              → list all health tags
 *   POST   /api/v1/admin/health-tags              → create new tag
 *   PUT    /api/v1/admin/health-tags/{id}        → update tag
 *   DELETE /api/v1/admin/health-tags/{id}        → delete tag
 */

import client from '../../../api/client'

const ADMIN_HEALTH_TAGS_ENDPOINT = '/api/v1/admin/health-tags'

export const getAdminHealthTags = () =>
  client.get(ADMIN_HEALTH_TAGS_ENDPOINT).then((res) => res.data)

export const createAdminHealthTag = (payload) =>
  client.post(ADMIN_HEALTH_TAGS_ENDPOINT, payload).then((res) => res.data)

export const updateAdminHealthTag = (tagId, payload) =>
  client.put(`${ADMIN_HEALTH_TAGS_ENDPOINT}/${tagId}`, payload).then((res) => res.data)

export const deleteAdminHealthTag = (tagId) =>
  client.delete(`${ADMIN_HEALTH_TAGS_ENDPOINT}/${tagId}`).then((res) => res.data)

export const importHealthTags = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client
    .post(`${ADMIN_HEALTH_TAGS_ENDPOINT}/import`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
}

export const downloadHealthTagImportTemplate = () =>
  client
    .get(`${ADMIN_HEALTH_TAGS_ENDPOINT}/import-template`, { responseType: 'blob' })
    .then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'health_tags_import_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    })

export const exportHealthTags = () =>
  client
    .get(`${ADMIN_HEALTH_TAGS_ENDPOINT}/export`, { responseType: 'blob' })
    .then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'health_tags_full_export.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    })

