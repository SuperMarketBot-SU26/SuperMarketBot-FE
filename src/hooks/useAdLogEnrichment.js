/**
 * useAdLogEnrichment — resolve zoneId/productId/robotId thành tên hiển thị
 *
 * BE log response chỉ trả về FK id (zoneId, productId, robotId, memberId)
 * nhưng không trả tên. Hook này fetch zones + products của campaign và build
 * map { id → displayName } để gắn vào log rows.
 *
 * Chỉ resolve zone/product thuộc campaign hiện tại (qua getCampaignZones +
 * getCampaignSponsoredProducts). Robot/member hiện không có endpoint resolve
 * nên hiển thị id kèm prefix ("Robot #1", "Thành viên #5").
 *
 * Cache theo campaignId — không refetch khi logs thay đổi (chỉ khi đổi campaign).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { getCampaignZones, getCampaignSponsoredProducts } from '../features/advertisement/api/adCampaignApi'

/**
 * @param {Array} logs - log rows từ BE
 * @param {number} campaignId - campaign id hiện tại
 * @returns {{
 *   enrichLog: (log) => object,   // gắn zoneName/productName/floorName/... vào log
 *   isReady: boolean,             // true khi đã fetch xong zones+products
 * }}
 */
export function useAdLogEnrichment(logs, campaignId) {
  const [zoneMap, setZoneMap] = useState({}) // { zoneId: { zoneName, floorName, floorId } }
  const [productMap, setProductMap] = useState({}) // { productId: { productName } }
  const [isReady, setIsReady] = useState(false)

  // Track campaignId đã fetch để tránh refetch khi logs đổi (pagination, filter)
  const fetchedFor = useRef(null)

  useEffect(() => {
    if (!campaignId || fetchedFor.current === campaignId) return
    fetchedFor.current = campaignId
    setIsReady(false)

    let cancelled = false
    Promise.allSettled([
      getCampaignZones(campaignId).catch(() => ({ zones: [] })),
      getCampaignSponsoredProducts(campaignId).catch(() => ({ products: [] })),
    ]).then(([zonesRes, productsRes]) => {
      if (cancelled) return
      const zMap = {}
      const zonesArr = zonesRes.value?.zones ?? zonesRes.value ?? []
      for (const z of zonesArr) {
        if (z?.zoneId != null) {
          zMap[z.zoneId] = {
            zoneName: z.zoneName || z.label || null,
            floorName: z.floorName || null,
            floorId: z.floorId ?? null,
          }
        }
      }
      const pMap = {}
      const productsArr = productsRes.value?.products ?? productsRes.value ?? []
      for (const p of productsArr) {
        if (p?.productId != null) {
          pMap[p.productId] = { productName: p.productName || p.name || null }
        }
      }
      setZoneMap(zMap)
      setProductMap(pMap)
      setIsReady(true)
    })

    return () => { cancelled = true }
  }, [campaignId])

  // Reset cache khi đổi campaign
  useEffect(() => {
    if (fetchedFor.current !== campaignId) {
      setZoneMap({})
      setProductMap({})
    }
  }, [campaignId])

  const enrichLog = useMemo(() => {
    return (log) => {
      if (!log) return log
      const z = log.zoneId != null ? zoneMap[log.zoneId] : null
      const p = log.productId != null ? productMap[log.productId] : null
      return {
        ...log,
        _zoneName: z?.zoneName || null,
        _floorName: z?.floorName || null,
        _productName: p?.productName || null,
      }
    }
  }, [zoneMap, productMap])

  return { enrichLog, isReady }
}

export default useAdLogEnrichment
