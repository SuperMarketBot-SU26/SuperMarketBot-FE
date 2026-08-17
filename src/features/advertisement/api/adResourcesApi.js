/**
 * Ad Resources API — /api/v1/ad-resources
 *
 * Backend endpoints (AdResourcesController.cs):
 *   GET    /api/v1/ad-resources/campaign/{campaignId}  → PaginatedResponse<AdResourceDto>
 *   GET    /api/v1/ad-resources/{resourceId}           → AdResourceDto
 *   POST   /api/v1/ad-resources/upload                  → multipart/form-data (deprecated — use Cloudinary upload)
 *   POST   /api/v1/ad-resources                         → JSON (link external / saves Cloudinary URL)
 *   DELETE /api/v1/ad-resources/{resourceId}            → delete
 *
 * IMAGE UPLOAD STRATEGY (2026-08-11):
 * The BE's Cloudinary credentials are misconfigured (api_secret mismatch on signed upload).
 * Instead, FE uploads directly to Cloudinary using the unsigned preset `smartmarket_unsigned`,
 * then calls POST /api/v1/ad-resources (createResourceLink) with the returned secure_url.
 * This bypasses the BE entirely for the upload step.
 *
 * AdResourceDto:
 *   {
 *     resourceId, campaignId (=adCampaignId), resourceType,
 *     title, mediaUrl (=resourceUrl - absolute or relative),
 *     durationSeconds?, fileSizeBytes?, contentType?, createdAt
 *   }
 *
 * Media URLs: now served from Cloudinary. We normalize every `resourceUrl` through
 * `buildImageUrl()` so that:
 *   - Cloudinary URLs get auto-optimize transforms (q_auto, f_auto, w_*, ...)
 *   - Legacy wwwroot / localhost URLs render as a "needs re-upload" placeholder
 *   - Cache-bust ?v=<resourceId> keeps re-uploads visible.
 */

import client from '../../../api/client'
import { buildImageUrl } from '../../../utils/cloudinary'
import { uploadToCloudinary } from '../../../utils/cloudinaryUpload'

const ENDPOINT = '/api/v1/ad-resources'

/** Pick the first non-empty string from a list of candidate keys on a row.
 *  Defensive against BE returning different field names per endpoint/version.
 */
const pickField = (row, keys) => {
  for (const k of keys) {
    const v = row?.[k]
    if (v != null && v !== '') return v
  }
  return ''
}

/**
 * Build a Cloudinary-ready URL with thumb-friendly transform defaults.
 * Used by the campaign-resources card grid — cards are ~16:9 small previews.
 */
const toMediaUrl = (rawPath, cacheBustKey) => {
  if (!rawPath) return ''
  const cached = buildImageUrl(rawPath, {
    width: 480,
    height: 270,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  })
  if (cacheBustKey == null || cacheBustKey === '') return cached
  const sep = cached.includes('?') ? '&' : '?'
  return `${cached}${sep}v=${encodeURIComponent(cacheBustKey)}`
}

/** List all resources for a campaign. */
export const getCampaignResources = async (campaignId) => {
  const res = await client.get(`${ENDPOINT}/campaign/${campaignId}`)
  const items = res?.data?.items ?? res?.data ?? []
  // Normalize API response → AdResourceDto shape (defensive against BE field-name drift)
  return items.map((r) => {
    const rawUrl = pickField(r, [
      'resourceUrl', 'mediaUrl', 'url', 'filePath', 'path',
      'ResourceUrl', 'MediaUrl', 'Url', 'FilePath', 'Path',
    ])
    const resourceId = r.resourceId ?? r.ResourceId
    return {
      resourceId,
      campaignId: r.adCampaignId ?? r.campaignId ?? r.AdCampaignId,
      resourceType: r.resourceType ?? r.ResourceType,
      title: r.title ?? r.Title ?? '',
      mediaUrl: toMediaUrl(rawUrl, resourceId ?? Date.now()),
      durationSeconds: r.durationSeconds ?? r.DurationSeconds,
      fileSizeBytes: r.fileSizeBytes ?? r.FileSizeBytes,
      contentType: r.contentType ?? r.ContentType,
      createdAt: r.createdAt ?? r.CreatedAt,
      // Pass through optional metadata for richer cards
      contentText: r.contentText ?? r.ContentText ?? '',
      resolution: r.resolution ?? r.Resolution ?? '',
      status: r.status ?? r.Status ?? '',
    }
  })
}

/** Single resource detail. */
export const getResource = async (resourceId) => {
  const res = await client.get(`${ENDPOINT}/${resourceId}`)
  return res.data
}

/**
 * Upload an image/video/audio file for a campaign.
 *
 * FE uploads directly to Cloudinary using the unsigned preset, then creates
 * a resource link via the JSON endpoint. This bypasses the BE's broken
 * Cloudinary config (api_secret mismatch) and missing static-file serving.
 *
 * @param {{
 *   campaignId: number,
 *   resourceType: 'banner'|'video'|'thumb',
 *   file: File,
 *   contentText?: string,
 *   resolution?: string,  // e.g. '1920x1080' | '1080x1920'
 * }} payload
 * @returns {Promise<AdResourceDto>} saved resource from BE
 */
export const uploadResource = async ({ campaignId, resourceType, file, contentText, resolution }) => {
  // Determine Cloudinary folder based on resource type.
  const folder =
    resourceType === 'video' ? 'smartmarketbot/ad-videos'
      : resourceType === 'banner' ? 'smartmarketbot/ad-banners'
      : 'smartmarketbot/ad-resources'

  const uploadResult = await uploadToCloudinary(file, {
    folder,
    transforms:
      resourceType === 'banner' ? { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
        : resourceType === 'thumb' ? { width: 480, height: 270, crop: 'fill', quality: 'auto' }
        : {},
  })

  // Derive a display title from filename if no contentText.
  const displayTitle = contentText || file.name.replace(/\.[^.]+$/, '')

  // Map FE resourceType to BE's expected enum values (uppercase: IMAGE, VIDEO, VOICE_TEXT).
  const beResourceType = {
    banner: 'IMAGE',
    video: 'VIDEO',
    thumb: 'IMAGE',
  }[resourceType] || 'IMAGE'

  return createResourceLink({
    adCampaignId: campaignId,
    resourceType: beResourceType,
    title: displayTitle,
    resourceUrl: uploadResult.secure_url,
    durationSeconds: null,
    contentText: contentText || null, // Lưu caption riêng
  })
}

/**
 * Create a resource linking to an external media URL (no upload).
 *
 * BE expects PascalCase field names:
 *   adCampaignId (NOT campaignId)
 *   resourceType: "IMAGE" | "VIDEO" | "VOICE_TEXT" (uppercase)
 *   resourceUrl: absolute URL string
 *   title: string
 *   durationSeconds?: number
 *
 * @param {{
 *   adCampaignId: number,
 *   resourceType: 'IMAGE'|'VIDEO'|'VOICE_TEXT',
 *   title: string,
 *   resourceUrl: string,
 *   durationSeconds?: number,
 * }} payload
 */
export const createResourceLink = async (payload) => {
  const res = await client.post(ENDPOINT, payload)
  return res.data
}

/** Delete a resource by id. */
export const deleteResource = async (resourceId) => {
  const res = await client.delete(`${ENDPOINT}/${resourceId}`)
  return res.data ?? { success: true }
}

/** Update resource details (e.g. caption). */
export const updateResource = async (resourceId, payload) => {
  const res = await client.put(`${ENDPOINT}/${resourceId}`, payload)
  return res.data
}
