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
export function FloorplanLayer({ map, scale = 64, viewMode = '3d', onEffectiveSize }) {
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

  useEffect(() => {
    if (!onEffectiveSize) return
    if (natural) {
      onEffectiveSize({
        widthMeters: natural.w / scale,
        heightMeters: natural.h / scale,
        widthPx: natural.w,
        heightPx: natural.h,
      })
    } else {
      onEffectiveSize({
        widthMeters,
        heightMeters,
        widthPx: widthMeters * scale,
        heightPx: heightMeters * scale,
      })
    }
  }, [natural, scale, widthMeters, heightMeters, onEffectiveSize])

  const wPx = natural ? natural.w : widthMeters * scale
  const hPx = natural ? natural.h : heightMeters * scale

  if (viewMode === '3d') {
    return (
      <g>
        {/* Sleek 3D Isometric Architectural Supermarket Floorplan Image */}
        <image
          href="/supermarket_3d_map.jpg"
          x={0}
          y={0}
          width={wPx}
          height={hPx}
          preserveAspectRatio="none"
        />

        {/* Subtle SLAM Grid Overlay for Node Precision Alignment */}
        {url && (
          <image
            href={url}
            x={0}
            y={0}
            width={wPx}
            height={hPx}
            opacity={0.08}
            preserveAspectRatio="none"
          />
        )}

        {/* Mini Subtle Zone Markers (High-end UI Pins) */}
        <g pointerEvents="none" className="select-none font-bold text-[10px]">
          {/* Zone 1 Pin */}
          <g transform={`translate(${wPx * 0.15}, ${hPx * 0.15})`}>
            <rect x={-8} y={-12} width={110} height={20} fill="#0f172a" fillOpacity={0.8} rx={6} stroke="#f59e0b" strokeWidth={1} />
            <text x={47} y={2} textAnchor="middle" fill="#fbbf24" className="text-[9px] font-bold">🌾 Zone 1: Đồ Khô</text>
          </g>

          {/* Zone 2 Pin */}
          <g transform={`translate(${wPx * 0.65}, ${hPx * 0.15})`}>
            <rect x={-8} y={-12} width={120} height={20} fill="#0f172a" fillOpacity={0.8} rx={6} stroke="#0284c7" strokeWidth={1} />
            <text x={52} y={2} textAnchor="middle" fill="#38bdf8" className="text-[9px] font-bold">🧃 Zone 2: Nước Uống</text>
          </g>

          {/* Zone 3 Pin */}
          <g transform={`translate(${wPx * 0.15}, ${hPx * 0.75})`}>
            <rect x={-8} y={-12} width={120} height={20} fill="#0f172a" fillOpacity={0.8} rx={6} stroke="#16a34a" strokeWidth={1} />
            <text x={52} y={2} textAnchor="middle" fill="#4ade80" className="text-[9px] font-bold">🧼 Zone 3: Gia Dụng</text>
          </g>

          {/* Zone 4 Pin */}
          <g transform={`translate(${wPx * 0.65}, ${hPx * 0.75})`}>
            <rect x={-8} y={-12} width={130} height={20} fill="#0f172a" fillOpacity={0.8} rx={6} stroke="#e11d48" strokeWidth={1} />
            <text x={57} y={2} textAnchor="middle" fill="#fb7185" className="text-[9px] font-bold">🔥 Zone 4: Khuyến Mãi</text>
          </g>
        </g>
      </g>
    )
  }

  // Pure SLAM Mode
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