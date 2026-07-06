import React, { useMemo } from 'react'

/**
 * EdgesLayer — pure SVG lines connecting two nodes by id.
 * Bidirectional edges are drawn as a single straight line.
 */
export function EdgesLayer({ nodes, edges, metersToPx }) {
  const nodeById = useMemo(() => {
    const m = new Map()
    nodes.forEach((n) => m.set(n.nodeId, n))
    return m
  }, [nodes])

  return (
    <g pointerEvents="none">
      {edges.map((e) => {
        const a = nodeById.get(e.fromNodeId)
        const b = nodeById.get(e.toNodeId)
        if (!a || !b) return null
        return (
          <line
            key={e.edgeId}
            x1={metersToPx(a.xCoord)} y1={metersToPx(a.yCoord)}
            x2={metersToPx(b.xCoord)} y2={metersToPx(b.yCoord)}
            stroke="#c5c5d3" strokeWidth={2}
            strokeDasharray={e.isBidirectional ? '0' : '6 4'}
          />
        )
      })}
    </g>
  )
}

/**
 * NodesLayer — paints each NavigationNode as a clickable dot.
 * Blocked nodes glow red.
 */
export function NodesLayer({ nodes, metersToPx, onNodeClick }) {
  return (
    <g>
      {nodes.map((n) => {
        const r = n.nodeType === 'dock' ? 7 : n.nodeType === 'poi' ? 6 : 4.5
        return (
          <g
            key={n.nodeId}
            transform={`translate(${metersToPx(n.xCoord)}, ${metersToPx(n.yCoord)})`}
            onClick={() => onNodeClick?.(n)}
            className="cursor-pointer"
          >
            <circle
              r={r}
              fill={n.isBlocked ? '#ba1a1a' : '#ffffff'}
              stroke={n.isBlocked ? '#93000a' : '#264191'}
              strokeWidth={2}
            />
            <text
              y={r + 12}
              textAnchor="middle"
              className="select-none fill-smb-on-surface-variant"
              style={{ fontSize: 10, fontWeight: 500 }}
            >
              {n.nodeName}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/**
 * RouteLayer — draws the waypoints of one route as a polyline + numbered dots.
 */
export function RouteLayer({ route, nodesById, metersToPx }) {
  if (!route?.waypoints?.length) return null

  const pts = route.waypoints
    .map((w) => nodesById.get(w.nodeId))
    .filter(Boolean)

  const polylinePts = pts
    .map((p) => `${metersToPx(p.xCoord)},${metersToPx(p.yCoord)}`)
    .join(' ')

  return (
    <g pointerEvents="none">
      <polyline
        points={polylinePts}
        fill="none"
        stroke="#264191"
        strokeWidth={3}
        strokeDasharray="6 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, idx) => (
        <g key={`${route.robotRouteId}-${idx}`} transform={`translate(${metersToPx(p.xCoord)}, ${metersToPx(p.yCoord)})`}>
          <circle r={6} fill="#264191" />
          <text
            y={3} textAnchor="middle"
            className="fill-smb-on-primary"
            style={{ fontSize: 10, fontWeight: 700 }}
          >
            {idx + 1}
          </text>
        </g>
      ))}
    </g>
  )
}

/**
 * SemanticObjectsLayer — paints shelves / checkpoints as semi-transparent rects.
 */
export function SemanticObjectsLayer({ objects, metersToPx }) {
  if (!objects?.length) return null
  return (
    <g pointerEvents="none">
      {objects.map((o) => (
        <g key={o.objectId}>
          <rect
            x={metersToPx(o.xMin)} y={metersToPx(o.yMin)}
            width={metersToPx(o.xMax - o.xMin)} height={metersToPx(o.yMax - o.yMin)}
            fill="#d3e4fe" fillOpacity={0.55}
            stroke="#b6c8e1" strokeWidth={1}
            rx={3}
          />
          {o.label && (
            <text
              x={metersToPx((o.xMin + o.xMax) / 2)}
              y={metersToPx((o.yMin + o.yMax) / 2)}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-smb-on-secondary-fixed-variant"
              style={{ fontSize: 10, fontWeight: 600 }}
            >
              {o.label}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}
