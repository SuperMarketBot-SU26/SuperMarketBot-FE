import React, { useEffect } from 'react'

/**
 * Floorplan placeholder — paints a grid + the floor outline + shelf silhouettes.
 * Used when backend doesn't yet ship a real map image so the page still looks like a map.
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
 * FloorplanImage — paints the backend-supplied floorplan image if any.
 * Otherwise renders FloorplanPlaceholder.
 */
export function FloorplanLayer({ map, metersToPx }) {
  if (map?.floorplanImageUrl) {
    const w = metersToPx(map.widthMeters)
    const h = metersToPx(map.heightMeters)
    return (
      <image
        href={map.floorplanImageUrl}
        x={0} y={0}
        width={w} height={h}
        preserveAspectRatio="xMidYMid meet"
      />
    )
  }
  return <FloorplanPlaceholder {...{ widthMeters: map.widthMeters, heightMeters: map.heightMeters, metersToPx }} />
}
