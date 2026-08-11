import React, { useMemo } from 'react'
import { getRouteTypeMeta } from './RobotAssignmentPanel'

/**
 * EdgesLayer — pure SVG lines connecting two nodes by id.
 * Bidirectional edges are drawn as a single straight line.
 */
export function EdgesLayer({ nodes, edges, effScaleX, effScaleY }) {
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
            x1={effScaleX(a.xCoord)} y1={effScaleY(a.yCoord)}
            x2={effScaleX(b.xCoord)} y2={effScaleY(b.yCoord)}
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
 * Node name is only shown for the currently selected node.
 */
export function NodesLayer({ nodes, metersToPx, effScaleX, effScaleY, onNodeClick, selectedNodeId = null }) {
  return (
    <g>
      {nodes.map((n) => {
        const r = n.nodeType === 'dock' ? 7 : n.nodeType === 'poi' ? 6 : 5
        const isSelected = selectedNodeId === n.nodeId
        const cx = effScaleX ? effScaleX(n.xCoord) : metersToPx(n.xCoord)
        const cy = effScaleY ? effScaleY(n.yCoord) : metersToPx(n.yCoord)
        return (
          <g
            key={n.nodeId}
            transform={`translate(${cx}, ${cy})`}
            onClick={(e) => { onNodeClick?.(n); e.stopPropagation() }}
            className="cursor-pointer"
          >
            <circle
              r={r}
              fill={n.isBlocked ? '#ba1a1a' : isSelected ? '#22c55e' : '#3b82f6'}
              fillOpacity={0.9}
              stroke="#ffffff"
              strokeWidth={2}
            />
            {isSelected && (
              <text
                y={-12}
                textAnchor="middle"
                className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400 stroke-white stroke-2 paint-order-stroke"
              >
                {n.nodeName || n.label || `Node ${n.nodeId}`}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * RouteLayer — draws the waypoints of one route as a polyline + numbered dots.
 */
export function RouteLayer({ route, nodesById, effScaleX, effScaleY }) {
  if (!route?.waypoints?.length) return null

  const pts = route.waypoints
    .map((w) => nodesById.get(w.nodeId))
    .filter(Boolean)

  const polylinePts = pts
    .map((p) => `${effScaleX(p.xCoord)},${effScaleY(p.yCoord)}`)
    .join(' ')

  const stroke = getRouteTypeMeta(route.routeType).color

  return (
    <g pointerEvents="none">
      {/* Background glow stroke */}
      <polyline
        points={polylinePts}
        fill="none"
        stroke={stroke}
        strokeWidth={6}
        strokeOpacity={0.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Animated active dash flow */}
      <polyline
        points={polylinePts}
        fill="none"
        stroke={stroke}
        strokeWidth={3}
        strokeDasharray="8 6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-route-dash"
      />
      {pts.map((p, idx) => (
        <g key={`${route.robotRouteId}-${idx}`} transform={`translate(${effScaleX(p.xCoord)}, ${effScaleY(p.yCoord)})`}>
          <circle r={8} fill={stroke} fillOpacity={0.3} className="smb-pulse-ring" />
          <circle r={6} fill={stroke} />
          <text
            y={3.5} textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 9, fontWeight: 800 }}
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
export function SemanticObjectsLayer({ objects, effScaleX, effScaleY }) {
  if (!objects?.length) return null
  return (
    <g pointerEvents="none">
      {objects.map((o) => {
        // Since xMin and xMax might flip if width is negative after scaling (due to flips), we calculate width/height with absolute values
        const x1 = effScaleX(o.xMin);
        const y1 = effScaleY(o.yMin);
        const x2 = effScaleX(o.xMax);
        const y2 = effScaleY(o.yMax);
        
        return (
          <g key={o.objectId}>
            <rect
              x={Math.min(x1, x2)} y={Math.min(y1, y2)}
              width={Math.abs(x2 - x1)} height={Math.abs(y2 - y1)}
              fill="#d3e4fe" fillOpacity={0.55}
              stroke="#b6c8e1" strokeWidth={1}
              rx={3}
            />
            {o.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-smb-on-secondary-fixed-variant"
                style={{ fontSize: 10, fontWeight: 600 }}
              >
                {o.label}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
}
