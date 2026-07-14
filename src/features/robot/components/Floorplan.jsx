import React, { useEffect, useState } from 'react'

/**
 * FloorplanPlaceholder — paints a grid + the floor outline. Drawn with origin
 * (0,0) at the floorplan's top-left to match the DB convention: NavigationNode,
 * SemanticObject, and ROBOT_LOG coords are all stored in
 * [0, widthMeters] × [0, heightMeters].
 */
export function FloorplanPlaceholder({ widthMeters, heightMeters, metersToPx }) {
  const w = metersToPx(widthMeters)
  const h = metersToPx(heightMeters)

  // 1m grid lines
  const grid = []
  for (let x = 0; x <= widthMeters; x += 1) {
    grid.push(
      <line
        key={`vx-${x}`}
        x1={metersToPx(x)} y1={0}
        x2={metersToPx(x)} y2={h}
        stroke="#e7e8e9" strokeWidth={x % 5 === 0 ? 1 : 0.5}
      />
    )
  }
  for (let y = 0; y <= heightMeters; y += 1) {
    grid.push(
      <line
        key={`hy-${y}`}
        x1={0} y1={metersToPx(y)}
        x2={w} y2={metersToPx(y)}
        stroke="#e7e8e9" strokeWidth={y % 5 === 0 ? 1 : 0.5}
      />
    )
  }

  return (
    <g pointerEvents="none">
      {/* Floor background */}
      <rect x={0} y={0} width={w} height={h} fill="#f8f9fa" />
      {/* Outer wall */}
      <rect
        x={0} y={0} width={w} height={h}
        fill="none" stroke="#444651" strokeWidth={4} rx={6}
      />
      {/* Grid */}
      {grid}
    </g>
  )
}

/**
 * FloorplanLayer — paints the floorplan and resolves any mismatch between the
 * BE-supplied `widthMeters/heightMeters` and the loaded image's actual aspect
 * ratio.
 *
 * Why this matters:
 *   The editor sets `widthMeters = img.width / SCALE` and
 *   `heightMeters = img.height / SCALE`, so aspect ratios should match.
 *   In practice three things can drift them apart:
 *     1. The user re-uploads the image (without re-syncing the map) — the BE
 *        updates only `FloorplanImageUrl`, leaving meters stale.
 *     2. SCALE doesn't divide image dimensions cleanly, so the multiplied-back
 *        pixel size is off by a pixel.
 *     3. Cloudinary / delivery transforms reshape the image.
 *
 *   If we draw the image at `width = widthMeters * scale, height = ... * scale`
 *   with `preserveAspectRatio="xMidYMid meet"` and the aspects don't match, the
 *   image shrinks inside its box. Nodes (which are drawn at `coord * scale`)
 *   then fall outside the visible image. That's the symptom on the monitor
 *   page.
 *
 * Fix: load the image, learn its *natural* pixel size, and use it as the
 * rendered box. We then expose `effectiveMeters` (which is `widthMeters` /
 * `heightMeters` adjusted to match the image) back to the parent so all other
 * layers (nodes, edges, semantic objects, routes) line up with the image.
 */
export function FloorplanLayer({ map, scale = 64, onEffectiveSize }) {
  const url = map?.floorplanImageUrl
  const widthMeters = map?.widthMeters || 20
  const heightMeters = map?.heightMeters || 15
  const [natural, setNatural] = useState(null)

  useEffect(() => {
    if (!url) {
      setNatural(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      if (!cancelled) setNatural(null)
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url])

  // Report the effective rendered size (in pixels and meters) up so the parent
  // can size its viewport, fit-to-view transform, and other layers consistently.
  useEffect(() => {
    if (!onEffectiveSize) return
    if (natural) {
      // Image-driven: effective meters are exactly what produces the natural
      // pixel size at the current scale. This keeps node coords aligned with
      // the image edges.
      onEffectiveSize({
        widthMeters: natural.w / scale,
        heightMeters: natural.h / scale,
        widthPx: natural.w,
        heightPx: natural.h,
      })
    } else {
      // No image yet (or failed to load): fall back to BE meters verbatim.
      onEffectiveSize({
        widthMeters,
        heightMeters,
        widthPx: widthMeters * scale,
        heightPx: heightMeters * scale,
      })
    }
  }, [natural, scale, widthMeters, heightMeters, onEffectiveSize])

  if (url && natural) {
    return (
      <image
        href={url}
        x={0}
        y={0}
        width={natural.w}
        height={natural.h}
        preserveAspectRatio="none"
      />
    )
  }

  return (
    <FloorplanPlaceholder
      widthMeters={widthMeters}
      heightMeters={heightMeters}
      metersToPx={(m) => m * scale}
    />
  )
}