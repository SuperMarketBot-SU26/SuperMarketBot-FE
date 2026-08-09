import client from '../../../api/client'

const ENDPOINT = '/v1/ad-packages'

export const getPackages = () => client.get(ENDPOINT).then((res) => res.data)
export const getPackage = (packageId) => client.get(`${ENDPOINT}/${packageId}`).then((res) => res.data)
export const createPackage = (payload) => client.post(ENDPOINT, payload).then((res) => res.data)
export const updatePackage = (packageId, payload) => client.put(`${ENDPOINT}/${packageId}`, payload).then((res) => res.data)
export const deletePackage = (packageId) => client.delete(`${ENDPOINT}/${packageId}`)
