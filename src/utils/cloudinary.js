/**
 * Cloudinary URL helper.
 *
 * BE lưu media trên Cloudinary; URL trả về có dạng
 *   https://res.cloudinary.com/<cloud>/image/upload[/<transforms>]/v<version>/<folder>/<file>
 * hoặc cho video:
 *   https://res.cloudinary.com/<cloud>/video/upload[/<transforms>]/v<version>/<folder>/<file>
 *
 * Tuy nhiên, một số module của BE (đặc biệt là Product khi admin upload) vẫn lưu
 * ảnh vào local wwwroot và trả về RELATIVE PATH như `uploads/products/abc.jpg`
 * (không có `/` đầu). Các relative path này nếu để nguyên thì browser sẽ resolve
 * thành `http://localhost:5173/uploads/products/abc.jpg` → không tồn tại ở dev
 * (Vite SPA fallback trả index.html) và ở prod là URL gãy.
 *
 * Helper này:
 *  1. Nếu input là URL Cloudinary đầy đủ → thêm transform params
 *     (w_, h_, c_, q_, f_, ...). Cloudinary sẽ tự serve variant đã optimize.
 *  2. Nếu input là RELATIVE local path (vd. `uploads/products/abc.jpg`,
 *     `storage/app/public/...`) hoặc absolute local URL (wwwroot / localhost)
 *     → chuẩn hoá thành `/<path>` để đi qua Vite proxy (dev) hoặc cùng origin
 *     (prod build). Nếu URL cũ rõ ràng (có `wwwroot`, `localhost:5000`,
 *     `/storage/app/public`) thì trả placeholder "needs re-upload" + warn,
 *     vì ảnh đó thực sự không còn trên server nữa.
 *  3. Nếu input là URL lạ (YouTube, CDN khác, blob: blob URL, data:) → trả nguyên.
 *  4. Nếu input trống → trả placeholder.
 *
 * NOTE: project dùng thuần JS (không TS) — export đúng cú pháp ESM.
 */

const CLOUD_NAME = 'dg24w82y0'
const CLOUDINARY_HOST = 'res.cloudinary.com'

const PLACEHOLDER = '/placeholder.png'
const PLACEHOLDER_NEEDS_REUPLOAD = '/placeholder-needs-reupload.png'

/** Image-type detection: Cloudinary URLs starting with /image/upload/... */
const isCloudinaryImage = (url) => /res\.cloudinary\.com\/[^/]+\/image\/upload\//i.test(url)
/** Video-type detection: Cloudinary URLs starting with /video/upload/... */
const isCloudinaryVideo = (url) => /res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(url)

/**
 * Strip existing Cloudinary transforms from a URL so we can apply fresh ones.
 * Transforms look like: /upload/w_480,h_270,c_fill,q_auto/...
 */
const stripCloudinaryTransforms = (url) => {
  return url.replace(/\/upload\/[^/]+\//i, '/upload/')
}

/**
 * Normalize a bare domain-or-path string into an absolute same-origin path or
 * an HTTPS URL. Called AFTER legacy patterns are ruled out, so anything here
 * is either a local relative path (uploads/, storage/, images/) or an
 * external URL that was stored without its https:// prefix.
 *
 * Detection heuristic: starts with letters/digits and contains at least one
 * dot → treat as a bare domain (needs https://). Otherwise → local path.
 *
 * Examples:
 *   uploads/products/abc.jpg  → /uploads/products/abc.jpg   (same-origin)
 *   storage/images/foo.jpg    → /storage/images/foo.jpg    (same-origin)
 *   example.com/image.jpg     → https://example.com/image.jpg  (external)
 *   cdnv2.tgdd.vn/foo.jpg    → https://cdnv2.tgdd.vn/foo.jpg  (external)
 *   hituor.vn/uploads/...    → https://hituor.vn/uploads/... (external)
 */
const normalizeBareUrl = (s) => {
  const looksAbsoluteHttp = /^https?:\/\//i.test(s)
  if (looksAbsoluteHttp) return null // already absolute

  // If it looks like a domain (has a dot, starts with alphanumeric)
  // → it needs an https:// scheme.
  // Note: this is safe because our local prefixes (uploads/, storage/, images/)
  // never contain a dot, so paths like `foo.bar/uploads/xyz.jpg` are impossible.
  if (/^[a-z0-9].*\.[a-z]/i.test(s)) {
    return `https://${s}`
  }

  // Local relative path — leave for caller to decide (prefix with / if needed).
  return null
}

/**
 * Patterns where a non-Cloudinary URL is KNOWN to be dead/legacy
 * (the file no longer lives at that location).
 */
const LEGACY_LOCAL_PATTERNS = [
  /wwwroot/i,
  /localhost:(5000|5173|3000|8080)/i,
  /\/storage\/app\/public\//i,            // Laravel legacy
  /\/storage\/smartmarketbot\//i,         // older BE convention
]

/**
 * Bare relative paths (no scheme, no leading slash) that the BE stores for
 * media uploaded to its local wwwroot. We must prefix `/` so they flow through
 * the Vite proxy (dev) or hit the same origin (prod). Pattern is intentionally
 * permissive — anything that LOOKS like a path under `uploads/` or
 * `storage/...` is treated as same-origin.
 */
const RELATIVE_LOCAL_PREFIXES = [
  'uploads/',
  'storage/',
  'images/',
  'products/',
]

/**
 * @typedef {Object} BuildImageOptions
 * @property {number}  [width]   - w_<n>
 * @property {number}  [height]  - h_<n>
 * @property {'fill'|'fit'|'scale'|'thumb'|'pad'} [crop] - c_<mode>
 * @property {'auto'|'eco'|'low'|'good'|'best'|number} [quality] - q_<...>
 * @property {'auto'|'webp'|'jpg'|'png'|'avif'|'mp4'|'webm'} [format] - f_<...>
 * @property {number}  [dpr]     - dpr_<n> for retina
 * @property {string}  [gravity] - g_<mode> ('auto', 'face', 'north', ...)
 * @property {string}  [effect]  - e_<effect> (e.g. 'grayscale', 'sepia')
 */

/**
 * Transform a media URL into a usable browser URL.
 * @param {string|null|undefined} originalUrl
 * @param {BuildImageOptions} [options]
 * @returns {string}
 */
export function buildImageUrl(originalUrl, options = {}) {
  if (!originalUrl) return PLACEHOLDER
  const s = String(originalUrl).trim()
  if (!s) return PLACEHOLDER

  // 1. Already a Cloudinary URL → strip any existing transforms then inject fresh ones
  if (isCloudinaryImage(s) || isCloudinaryVideo(s)) {
    const transforms = buildTransforms(options)
    // Remove BE's hardcoded transforms so we can apply our own
    const cleanUrl = stripCloudinaryTransforms(s)
    if (transforms.length === 0) return cleanUrl

    // Insert transforms after `/upload/`. For both image and video Cloudinary uses
    // the same `/upload/` segment, so this single replacement works for both.
    return cleanUrl.replace('/upload/', `/upload/${transforms.join(',')}/`)
  }

  // 2a. Legacy / dead local URL → placeholder + warn
  if (LEGACY_LOCAL_PATTERNS.some((re) => re.test(s))) {
    // eslint-disable-next-line no-console
    console.warn(`[Cloudinary] URL cũ cần re-upload: ${s}`)
    return PLACEHOLDER_NEEDS_REUPLOAD
  }

  // 2b. Local relative path (bare, e.g. `uploads/products/abc.jpg`) →
  //     normalize to `/uploads/products/abc.jpg` so it flows through the
  //     Vite proxy in dev and resolves to same-origin in prod.
  if (RELATIVE_LOCAL_PREFIXES.some((p) => s.startsWith(p))) {
    return `/${s}`
  }
  // 2c. Already starts with `/uploads/`, `/storage/`, etc. → use as-is.
  if (/^\/(uploads|storage|images)\//.test(s)) {
    return s
  }
  // 2d. Bare domain or path without scheme (e.g. `example.com/img.jpg`,
  //     `cdnv2.tgdd.vn/foo.jpg`, `hituor.vn/uploads/...`) → add https://.
  const httpsFallback = normalizeBareUrl(s)
  if (httpsFallback) return httpsFallback

  // 3. Everything else (blob:, data:, already-absolute http(s)://, ...) → as-is
  return s
}

/** Build Cloudinary transform segment string from options. */
function buildTransforms(options) {
  const t = []
  if (options.width) t.push(`w_${options.width}`)
  if (options.height) t.push(`h_${options.height}`)
  if (options.crop) t.push(`c_${options.crop}`)
  if (options.quality) t.push(`q_${options.quality}`)
  if (options.format) t.push(`f_${options.format}`)
  if (options.dpr) t.push(`dpr_${options.dpr}`)
  if (options.gravity) t.push(`g_${options.gravity}`)
  if (options.effect) t.push(`e_${options.effect}`)
  return t
}

/**
 * Get original image URL without any transforms.
 * Strips BE's hardcoded transforms to show the image at its native resolution.
 */
export function getOriginalImageUrl(cloudinaryUrl) {
  if (!cloudinaryUrl) return PLACEHOLDER
  if (isCloudinaryImage(cloudinaryUrl) || isCloudinaryVideo(cloudinaryUrl)) {
    return stripCloudinaryTransforms(cloudinaryUrl)
  }
  return cloudinaryUrl
}

/** Convenience constant — exported for places that need to build URLs from scratch. */
export const CLOUDINARY_CONFIG = Object.freeze({
  cloudName: CLOUD_NAME,
  baseUrl: `https://res.${CLOUDINARY_HOST}/${CLOUD_NAME}`,
  imageBase: `https://res.${CLOUDINARY_HOST}/${CLOUD_NAME}/image/upload`,
  videoBase: `https://res.${CLOUDINARY_HOST}/${CLOUD_NAME}/video/upload`,
  folders: Object.freeze({
    adResources: 'smartmarketbot/ad-resources',
    memberAvatars: 'member_avatars',
    memberFaces: 'member_faces',
    aisleScans: 'aisle_scans',
  }),
  placeholders: Object.freeze({
    missing: PLACEHOLDER,
    needsReupload: PLACEHOLDER_NEEDS_REUPLOAD,
  }),
})
