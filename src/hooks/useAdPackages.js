import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '../api/client'

const endpoint = '/api/v1/ad-packages'

export const useAdPackages = () => useQuery({
  queryKey: ['ad-packages'],
  queryFn: async () => (await client.get(endpoint)).data,
})

export const useAdPackage = (packageId) => useQuery({
  queryKey: ['ad-packages', packageId],
  queryFn: async () => (await client.get(`${endpoint}/${packageId}`)).data,
  enabled: Boolean(packageId),
})

export const useCreateAdPackage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.post(endpoint, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-packages'] }),
  })
}

export const useUpdateAdPackage = (packageId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => client.put(`${endpoint}/${packageId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-packages'] })
      qc.invalidateQueries({ queryKey: ['ad-packages', packageId] })
    },
  })
}

export const useDeleteAdPackage = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => client.delete(`${endpoint}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-packages'] }),
  })
}
