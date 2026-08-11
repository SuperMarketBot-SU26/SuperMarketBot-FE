/**
 * Beautiful chart components — pure SVG + Tailwind + CSS Grid.
 * No chart library dependency. Fully theme-aware.
 *
 * Layout strategy:
 *   - VerticalBarChart  → SVG with responsive width, fixed viewBox height
 *   - DonutChart        → SVG with fixed size
 *   - HorizontalBarChart→ CSS flexbox rows (no SVG coordinate math)
 *   - AreaChart         → SVG with preserveAspectRatio="none"
 *   - SparklineChart    → inline SVG, fixed size
 */

import React, { useId } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────────────────────────────────────── */
function formatK(v) {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(Math.round(v))
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tooltip (SVG foreignObject)
───────────────────────────────────────────────────────────────────────────── */
function ChartTooltip({ visible, x, y, content }) {
  if (!visible) return null
  return (
    <foreignObject x={x - 60} y={y - 44} width={120} height={40} style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          background: 'var(--color-smb-surface-container)',
          border: '1px solid var(--color-smb-outline-variant)',
          borderRadius: '8px',
          padding: '4px 8px',
          fontSize: '11px',
          fontWeight: 500,
          lineHeight: 1.4,
          color: 'var(--color-smb-on-surface)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}>
          {content}
        </div>
        <div style={{
          width: 8, height: 8, marginTop: -4,
          background: 'var(--color-smb-surface-container)',
          borderRight: '1px solid var(--color-smb-outline-variant)',
          borderBottom: '1px solid var(--color-smb-outline-variant)',
          transform: 'rotate(45deg)',
        }} />
      </div>
    </foreignObject>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   SparklineChart — tiny trend line, fixed inline SVG
───────────────────────────────────────────────────────────────────────────── */
export function SparklineChart({ data = [], color = '#5C6BC0', width = 80, height = 28 }) {
  if (data.length < 2) return <div style={{ width, height }} />
  const values = data.map(d => d.value ?? d)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - minV) / range) * (height - 4) - 2
    return `${x},${y}`
  })

  const fillPts = `0,${height} ${pts.join(' ')} ${width},${height}`
  const gradId = useId()

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#${gradId})`} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width} cy={parseFloat(pts[pts.length - 1].split(',')[1])}
        r="2.5" fill={color}
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   VerticalBarChart — CSS Grid + SVG
───────────────────────────────────────────────────────────────────────────── */
export function VerticalBarChart({
  data = [],
  color = '#5C6BC0',
  colorEnd = null,
  height = 220,
  barWidth = 40,
  gap = 12,
  showValues = true,
  formatValue = formatK,
  formatLabel,
}) {
  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, content: '' })
  const svgRef = React.useRef(null)
  const endColor = colorEnd || color

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-smb-on-surface-variant">
        <span className="material-symbols-outlined mr-1 text-lg opacity-50">bar_chart</span>
        Chưa có dữ liệu
      </div>
    )
  }

  const values = data.map(d => d.value ?? d)
  const maxV = Math.max(...values, 1)
  const gradId = useId()
  const PAD_LEFT = 36
  const PAD_RIGHT = 8
  const PAD_BOTTOM = 28
  const innerW = data.length * (barWidth + gap) - gap
  const svgW = PAD_LEFT + innerW + PAD_RIGHT
  const svgH = height

  return (
    <div className="relative" ref={svgRef} style={{ height }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height={svgH}
        style={{ overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={endColor} stopOpacity="0.65" />
          </linearGradient>
          <filter id={`bar-shadow-${gradId}`}>
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = (1 - pct) * (svgH - PAD_BOTTOM - 8) + 4
          const v = maxV * pct
          return (
            <text key={pct} x="2" y={y + 4}
              fontSize="9" fill="currentColor" className="text-smb-on-surface-variant"
              style={{ fontFamily: 'inherit' }}>
              {formatK(v)}
            </text>
          )
        })}

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = (1 - pct) * (svgH - PAD_BOTTOM - 8) + 4
          return (
            <line key={pct} x1={PAD_LEFT} y1={y} x2={svgW - PAD_RIGHT}
              y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
              className="text-smb-outline-variant"
            />
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const v = d.value ?? d
          const label = d.label ?? String(d)
          const pct = v / maxV
          const barH = Math.max(pct * (svgH - PAD_BOTTOM - 8), 6)
          const barX = PAD_LEFT + i * (barWidth + gap)
          const barY = svgH - PAD_BOTTOM - barH
          const svgX = barX + barWidth / 2

          return (
            <g key={i}
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect()
                const pctX = (e.clientX - (rect?.left ?? 0)) / (rect?.width ?? 1)
                const svgPctX = pctX * svgW
                setTooltip({ visible: true, x: svgPctX, y: barY - 8, content: `${label}: ${formatValue(v)}` })
              }}
              onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
              style={{ cursor: 'pointer' }}
            >
              {/* Bar */}
              <rect
                x={barX} y={barY} width={barWidth} height={barH}
                fill={`url(#${gradId})`}
                rx="6"
                filter={`url(#bar-shadow-${gradId})`}
                style={{ transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), y 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${i * 50}ms` }}
              />
              {/* Shine */}
              <rect
                x={barX + 3} y={barY + 3} width={barWidth / 3} height={Math.min(barH - 6, 14)}
                fill="white" fillOpacity="0.18" rx="4"
                style={{ transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), y 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${i * 50}ms` }}
              />
              {/* Value label */}
              {showValues && (
                <text
                  x={svgX} y={barY - 6}
                  textAnchor="middle"
                  fontSize="10" fontWeight="600"
                  fill="currentColor"
                  className="text-smb-on-surface"
                  style={{ fontFamily: 'inherit', transition: 'y 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${i * 50}ms` }}
                >
                  {formatValue(v)}
                </text>
              )}
              {/* X-axis label */}
              <text
                x={svgX} y={svgH - 4}
                textAnchor="middle"
                fontSize="9" fill="currentColor"
                className="text-smb-on-surface-variant"
                style={{ fontFamily: 'inherit' }}
              >
                {formatLabel ? formatLabel(label) : label}
              </text>
            </g>
          )
        })}

        <ChartTooltip {...tooltip} />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   DonutChart — fixed-size SVG, animated arcs
───────────────────────────────────────────────────────────────────────────── */
export function DonutChart({
  data = [],
  colors = ['#5C6BC0', '#26A69A', '#EF5350', '#FFA726', '#66BB6A', '#AB47BC', '#42A5F5'],
  size = 160,
  thickness = 28,
  showLegend = true,
  showCenter = true,
}) {
  const [hovered, setHovered] = React.useState(null)
  const [animate, setAnimate] = React.useState(false)
  React.useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80)
    return () => clearTimeout(t)
  }, [])

  const active = data.filter(d => (d.value ?? 0) > 0)
  const total = active.reduce((s, d) => s + (d.value ?? 0), 0)

  if (!active.length || total === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-smb-on-surface-variant">
        <span className="material-symbols-outlined text-2xl opacity-50">pie_chart</span>
        <span>Chưa có dữ liệu</span>
      </div>
    )
  }

  const r = size / 2
  const innerR = r - thickness
  const cx = r, cy = r

  let cumulativeAngle = -90
  const segments = active.map((d, i) => {
    const pct = (d.value ?? 0) / total
    const angle = pct * 360
    const startA = cumulativeAngle
    const endA = cumulativeAngle + angle
    cumulativeAngle = endA
    return { ...d, pct, startA, endA, angle, color: d.color ?? colors[i % colors.length] }
  })

  const toRad = (deg) => (deg * Math.PI) / 180
  const polar = (angle) => ({ x: cx + r * Math.cos(toRad(angle)), y: cy + r * Math.sin(toRad(angle)) })

  const describeArc = (start, end, isLarge) => {
    const s = polar(start), e = polar(end)
    const ix1 = cx + innerR * Math.cos(toRad(start))
    const iy1 = cy + innerR * Math.sin(toRad(start))
    const ix2 = cx + innerR * Math.cos(toRad(end))
    const iy2 = cy + innerR * Math.sin(toRad(end))
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${isLarge ? 1 : 0} 1 ${e.x} ${e.y} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${isLarge ? 1 : 0} 0 ${ix1} ${iy1} Z`
  }

  return (
    <div className="flex items-center gap-6 px-2">
      {/* Donut */}
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
          <defs>
            {segments.map((seg, i) => (
              <radialGradient key={i} id={`dg-${i}`} cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
                <stop offset="100%" stopColor={seg.color} stopOpacity="0.7" />
              </radialGradient>
            ))}
            <filter id="donut-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {segments.map((seg, i) => {
            const isLarge = seg.angle > 180
            const mid = (seg.startA + seg.endA) / 2
            const centX = cx + (r - thickness / 2) * Math.cos(toRad(mid))
            const centY = cy + (r - thickness / 2) * Math.sin(toRad(mid))
            const isH = hovered === i
            const arc = describeArc(seg.startA, seg.endA - 0.3, isLarge)
            return (
              <g key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <path d={arc} fill={`url(#dg-${i})`}
                  filter="url(#donut-shadow)"
                  style={{
                    transform: animate ? `translate(${(centX - cx) * (isH ? 0.06 : 0)}px, ${(centY - cy) * (isH ? 0.06 : 0)}px) scale(${isH ? 1.04 : 1})` : 'scale(0.7)',
                    transformOrigin: `${cx}px ${cy}px`,
                    opacity: animate ? 1 : 0,
                    transition: `transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 400ms ease-out`,
                    transitionDelay: `${i * 70}ms`,
                  }}
                />
                <path d={arc} fill="none" stroke="white" strokeWidth="2" strokeOpacity={isH ? 0.35 : 0.15}
                  strokeLinecap="round"
                  style={{
                    transform: animate ? `translate(${(centX - cx) * (isH ? 0.06 : 0)}px, ${(centY - cy) * (isH ? 0.06 : 0)}px) scale(${isH ? 1.04 : 1})` : 'scale(0.7)',
                    transformOrigin: `${cx}px ${cy}px`,
                    opacity: animate ? 1 : 0,
                    transition: `transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease`,
                  }}
                />
              </g>
            )
          })}

          {/* Center bg */}
          <circle cx={cx} cy={cy} r={innerR - 2} style={{ fill: 'var(--color-smb-surface-container-lowest)' }} />
          <circle cx={cx} cy={cy} r={innerR - 2} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-smb-outline-variant" />

          {showCenter && (
            <>
              <text x={cx} y={cy - 6} textAnchor="middle"
                fontSize="22" fontWeight="800"
                fill="var(--color-smb-on-surface)"
                style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                {total >= 1000 ? formatK(total) : total}
              </text>
              <text x={cx} y={cy + 12} textAnchor="middle"
                fontSize="9" fontWeight="500"
                fill="var(--color-smb-on-surface-variant)"
                style={{ fontFamily: 'inherit', letterSpacing: '0.05em' }}>
                TỔNG
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      {showLegend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {segments.map((seg, i) => (
            <div key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 8px',
                borderRadius: 8,
                background: hovered === i ? 'var(--color-smb-surface-container-high)' : 'transparent',
                transition: 'background 150ms',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${seg.color}, ${seg.color}77)`,
                boxShadow: `0 0 4px ${seg.color}66`,
              }} />
              <span style={{
                fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: hovered === i ? 'var(--color-smb-on-surface)' : 'var(--color-smb-on-surface-variant)',
                transition: 'color 150ms',
              }}>
                {seg.label}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                color: hovered === i ? seg.color : 'var(--color-smb-on-surface)',
                transition: 'color 150ms',
              }}>
                {(seg.pct * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   HorizontalBarChart — pure CSS flexbox, NO SVG coordinate math
───────────────────────────────────────────────────────────────────────────── */
export function HorizontalBarChart({
  data = [],
  color = '#5C6BC0',
  colorEnd = null,
  height = 44,
  showValues = true,
  formatValue = formatK,
  formatLabel,
  rankColors = ['#5C6BC0', '#26A69A', '#EF5350', '#FFA726', '#66BB6A'],
}) {
  const [hoveredIdx, setHoveredIdx] = React.useState(null)

  if (!data.length) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-smb-on-surface-variant">
        Chưa có dữ liệu
      </div>
    )
  }

  const values = data.map(d => d.value ?? d)
  const maxV = Math.max(...values, 1)
  const endColor = colorEnd || color

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => {
        const v = d.value ?? d
        const label = d.label ?? String(d)
        const pct = maxV > 0 ? (v / maxV) * 100 : 0
        const rankColor = rankColors[i] || color
        const isH = hoveredIdx === i

        return (
          <div key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, height,
              padding: '0 4px',
              borderRadius: 8,
              background: isH ? 'var(--color-smb-surface-container-low)' : 'transparent',
              transition: 'background 150ms',
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Rank badge */}
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: rankColor, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 6px ${rankColor}66`,
              fontSize: 10, fontWeight: 700, color: '#fff',
              fontFamily: 'inherit',
            }}>
              {i + 1}
            </div>

            {/* Label */}
            <div style={{
              width: 80, flexShrink: 0, fontSize: 11, fontWeight: 500,
              color: isH ? 'var(--color-smb-on-surface)' : 'var(--color-smb-on-surface-variant)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'color 150ms',
            }}
              title={label}
            >
              {formatLabel ? formatLabel(label) : label.length > 10 ? label.slice(0, 10) + '…' : label}
            </div>

            {/* Bar track */}
            <div style={{
              flex: 1, height: 12, background: 'var(--color-smb-surface-container-high)',
              borderRadius: 6, overflow: 'hidden', position: 'relative',
            }}>
              {/* Bar fill */}
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${pct}%`,
                background: `linear-gradient(to right, ${color}, ${endColor})`,
                borderRadius: 6,
                boxShadow: isH ? `0 0 8px ${color}44` : 'none',
                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transitionDelay: `${i * 60}ms`,
                overflow: 'hidden',
              }}>
                {/* Shine */}
                <div style={{
                  position: 'absolute', left: 0, top: 0,
                  width: '40%', height: '100%',
                  background: 'linear-gradient(to right, rgba(255,255,255,0.2), transparent)',
                  borderRadius: 6,
                }} />
              </div>
            </div>

            {/* Value */}
            {showValues && (
              <div style={{
                width: 52, flexShrink: 0, textAlign: 'right',
                fontSize: 11, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: isH ? rankColor : 'var(--color-smb-on-surface)',
                transition: 'color 150ms',
              }}>
                {formatValue(v)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   AreaChart — SVG with preserveAspectRatio="none" for true responsive
───────────────────────────────────────────────────────────────────────────── */
export function AreaChart({
  data = [],
  color = '#5C6BC0',
  colorEnd = null,
  height = 160,
  showDots = false,
  showGrid = true,
  showArea = true,
  formatX,
  formatY = formatK,
  valuePrefix = '',
  valueSuffix = '',
}) {
  const [tooltip, setTooltip] = React.useState({ visible: false, x: 0, y: 0, content: '' })
  const [hoveredIdx, setHoveredIdx] = React.useState(null)
  const svgRef = React.useRef(null)

  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-smb-on-surface-variant">
        <span className="material-symbols-outlined mr-1 text-lg opacity-50">show_chart</span>
        Chưa có dữ liệu
      </div>
    )
  }

  const values = data.map(d => d.value ?? d)
  const minV = Math.min(...values)
  const maxV = Math.max(...values, 1)
  const range = maxV - minV || 1
  const padL = 12, padR = 12, padT = 16, padB = 32
  const VW = 100, VH = 100 // viewBox units

  const toX = (i) => padL + (i / (data.length - 1)) * (VW - padL - padR)
  const toY = (v) => padT + (1 - (v - minV) / range) * (VH - padT - padB)

  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`)
  const linePath = `M ${pts.join(' L ')}`
  const areaPath = `${linePath} L ${toX(data.length - 1)},${VH - padB} L ${toX(0)},${VH - padB} Z`
  const gradId = useId()
  const endColor = colorEnd || color

  return (
    <div className="relative" ref={svgRef} style={{ height }}>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ overflow: 'visible', display: 'block' }}
        onMouseLeave={() => { setTooltip({ visible: false, x: 0, y: 0, content: '' }); setHoveredIdx(null) }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="85%" stopColor={endColor} stopOpacity="0.04" />
            <stop offset="100%" stopColor={endColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padT + (1 - pct) * (VH - padT - padB)
          return (
            <line key={pct} x1={padL} y1={y} x2={VW - padR} y2={y}
              stroke="currentColor" strokeOpacity="0.06" strokeWidth="0.3"
              className="text-smb-outline-variant"
            />
          )
        })}

        {/* Area */}
        {showArea && <path d={areaPath} fill={`url(#${gradId})`} />}

        {/* Line */}
        <path d={linePath}
          fill="none" stroke={color} strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Dots + hover */}
        {data.map((d, i) => {
          const v = d.value ?? d
          const label = d.label ?? ''
          const x = toX(i), y = toY(v)
          const isH = hoveredIdx === i
          return (
            <g key={i}
              onMouseEnter={(e) => {
                const rect = svgRef.current?.getBoundingClientRect()
                const svgX = ((e.clientX - (rect?.left ?? 0)) / (rect?.width ?? 1)) * VW
                const svgY = ((e.clientY - (rect?.top ?? 0)) / (rect?.height ?? 1)) * VH
                setTooltip({ visible: true, x: svgX, y: y - 4, content: `${formatX ? formatX(label) : label ? `${label}: ` : ''}${valuePrefix}${formatY(v)}${valueSuffix}` })
                setHoveredIdx(i)
              }}
              onMouseLeave={() => { setTooltip({ visible: false, x: 0, y: 0, content: '' }); setHoveredIdx(null) }}
              style={{ cursor: 'crosshair' }}
            >
              {isH && (
                <line x1={x} y1={padT} x2={x} y2={VH - padB}
                  stroke={color} strokeWidth="0.5" strokeDasharray="2,2" strokeOpacity="0.4"
                />
              )}
              <circle cx={x} cy={y} r={isH ? 3 : showDots ? 2 : 0}
                fill={color} stroke="white" strokeWidth="0.8"
              />
              {isH && <circle cx={x} cy={y} r={6} fill={color} fillOpacity="0.15" stroke="none" />}
            </g>
          )
        })}

        {/* X labels */}
        {data.map((d, i) => {
          const label = d.label ?? ''
          const x = toX(i)
          if (i === 0 || i === data.length - 1 || data.length <= 7 || i % Math.ceil(data.length / 5) === 0) {
            return (
              <text key={i} x={x} y={VH - padB + 12}
                textAnchor="middle" fontSize="9" fill="currentColor"
                className="text-smb-on-surface-variant"
                style={{ fontFamily: 'inherit' }}>
                {formatX ? formatX(label) : label}
              </text>
            )
          }
          return null
        })}

        <ChartTooltip {...tooltip} />
      </svg>
    </div>
  )
}
