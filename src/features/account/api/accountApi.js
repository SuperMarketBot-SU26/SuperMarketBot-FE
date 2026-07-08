/**
 * Admin Account API — maps to /api/v1/admin/users
 *
 * Backend endpoints (Authorize[Admin]):
 *   GET    /api/v1/admin/users                       → paginated list (filters: username, email, role, status)
 *   GET    /api/v1/admin/users/{id}                 → single user
 *   POST   /api/v1/admin/users                       → create
 *   PUT    /api/v1/admin/users/{id}                 → update (email required, other fields optional)
 *   PATCH  /api/v1/admin/users/{id}/role             → update role only
 *   PATCH  /api/v1/admin/users/{id}/status           → update status only
 *   DELETE /api/v1/admin/users/{id}                 → soft-delete (sets Status='Inactive')
 *
 * Paginated list response: { items: UserDto[], totalCount, pageNumber, pageSize, totalPages }
 * UserDto: { accountId, username, email, fullName?, phone?, status, role, createdAt }
 *
 * CreateUserRequestDto:   { username, email, password, fullName?, phone?, role, status }
 * UpdateUserRequestDto:   { email, fullName?, phone?, role?, status? }
 * UpdateUserRoleRequestDto:  { role }
 * UpdateUserStatusRequestDto: { status }
 */

import client from '../../../api/client'

const ENDPOINT = '/v1/admin/users'

export const getUsers = (params = {}) =>
  client.get(ENDPOINT, { params }).then((res) => res.data)

export const getUser = (accountId) =>
  client.get(`${ENDPOINT}/${accountId}`).then((res) => res.data)

export const createUser = (payload) =>
  client.post(ENDPOINT, payload).then((res) => res.data)

export const updateUser = (accountId, payload) =>
  client.put(`${ENDPOINT}/${accountId}`, payload).then((res) => res.data)

export const updateUserRole = (accountId, role) =>
  client.patch(`${ENDPOINT}/${accountId}/role`, { role }).then((res) => res.data)

export const updateUserStatus = (accountId, status) =>
  client.patch(`${ENDPOINT}/${accountId}/status`, { status }).then((res) => res.data)

export const deleteUser = (accountId) =>
  client.delete(`${ENDPOINT}/${accountId}`).then((res) => res.data)