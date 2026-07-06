/**
 * Helpers shared by the Giám Sát Robot page.
 */

export const STATUS_COLORS = {
  Power_Off:         { bg: 'bg-smb-outline-variant',     text: 'text-smb-on-surface-variant', dot: 'bg-smb-outline' },
  Idle:              { bg: 'bg-smb-secondary-container', text: 'text-smb-on-secondary-container', dot: 'bg-smb-secondary-container' },
  Moving:            { bg: 'bg-smb-active-bg',           text: 'text-smb-primary-container',  dot: 'bg-smb-success' },
  Interacting:       { bg: 'bg-smb-tertiary-fixed',      text: 'text-smb-on-tertiary-fixed-variant', dot: 'bg-smb-tertiary-container' },
  Offline_Charging:  { bg: 'bg-smb-surface-container-high', text: 'text-smb-on-surface-variant', dot: 'bg-smb-outline-variant' },
  Unknown:           { bg: 'bg-smb-surface-container-high', text: 'text-smb-on-surface-variant', dot: 'bg-smb-outline-variant' },
}

export const statusPalette = (status) =>
  STATUS_COLORS[status] ?? STATUS_COLORS.Unknown

// Convert meters → pixels given a desired base scale (px per meter).
// Ex: scale = 32 → 1 meter = 32 px. 24m x 18m → 768px x 576px.
export const metersToPx = (meters, scale) => meters * scale

// Clamp zoom to a sane range.
export const clampZoom = (z, min = 0.5, max = 3) => Math.min(max, Math.max(min, z))

// Convert robot pose + scale into SVG transform {x, y} in pixels.
export const poseToPx = (pose, scale) => ({
  x: metersToPx(pose.x, scale),
  y: metersToPx(pose.y, scale),
})
