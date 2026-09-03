import { useCallback, useEffect, useMemo, useReducer } from 'react'

const STORAGE_KEY = 'campaignWizardState_v2'
const FLOOR_ID_DEFAULT = 1

/**
 * Step 2 Targeting — 3 loại hình quảng cáo ĐỘC LẬP:
 *   - Route: ad phát khi robot đi theo tuyến (toàn bộ siêu thị).
 *   - Zone:  ad phát khi robot dừng ở khu vực.
 *   - Shelf: ad phát khi robot ghé kệ cụ thể.
 *
 * `deliveryMode` quyết định cho phép loại nào (Route | Zone | Both):
 *   - 'Route' → chỉ routeIds (toàn bộ siêu thị)
 *   - 'Zone'  → zoneIds + shelfIds
 *   - 'Both'  → cả 3
 */

const initialState = {
  step: 1,
  basics: {
    campaignName: '',
    description: '',
    bannerUrl: '',
    videoUrl: '',
    brandId: null,
    packageId: null,
    startDate: '',
    endDate: '',
    deliveryMode: 'Zone', // 'Route' | 'Zone' | 'Both'
  },
  targeting: {
    routeIds: [],
    zoneIds: [],
    shelfIds: [],
    semanticObjectId: null,
  },
  products: {
    productIds: [],
  },
  errors: {},
  submitting: false,
  serverError: null,
  lastCreatedId: null,
}

function hydrateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const saved = JSON.parse(raw)
    return {
      ...initialState,
      step: saved.step ?? 1,
      basics: { ...initialState.basics, ...(saved.basics ?? {}) },
      targeting: { ...initialState.targeting, ...(saved.targeting ?? {}) },
      products: { ...initialState.products, ...(saved.products ?? {}) },
      errors: saved.errors ?? {},
    }
  } catch {
    return initialState
  }
}

/**
 * Lọc target theo deliveryMode (chỉ áp dụng khi build payload gửi BE).
 * - 'Route' → chỉ giữ routeIds (toàn bộ siêu thị).
 * - 'Zone'  → chỉ giữ zoneIds + shelfIds.
 * - 'Both'  → giữ nguyên.
 */
function filterTargetingByDeliveryMode(targeting, deliveryMode) {
  if (deliveryMode === 'Route') {
    return {
      routeIds: targeting.routeIds ?? [],
      zoneIds: [],
      shelfIds: [],
      semanticObjectId: null,
    }
  }
  if (deliveryMode === 'Zone') {
    return {
      routeIds: [],
      zoneIds: targeting.zoneIds ?? [],
      shelfIds: targeting.shelfIds ?? [],
      semanticObjectId: targeting.shelfIds?.[0] ?? null,
    }
  }
  // 'Both' (hoặc fallback)
  return {
    routeIds: targeting.routeIds ?? [],
    zoneIds: targeting.zoneIds ?? [],
    shelfIds: targeting.shelfIds ?? [],
    semanticObjectId: targeting.semanticObjectId ?? null,
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step, errors: {}, serverError: null }

    case 'PATCH_BASICS':
      return {
        ...state,
        basics: { ...state.basics, ...action.patch },
        errors: { ...state.errors, ...(action.errors ?? {}) },
      }

    case 'PATCH_TARGETING':
      return {
        ...state,
        targeting: { ...state.targeting, ...action.patch },
        errors: { ...state.errors, ...(action.errors ?? {}) },
      }

    case 'PATCH_PRODUCTS':
      return {
        ...state,
        products: { ...state.products, ...action.patch },
        errors: { ...state.errors, ...(action.errors ?? {}) },
      }

    case 'SET_ERRORS':
      return { ...state, errors: { ...state.errors, ...action.errors } }

    case 'CLEAR_ERRORS':
      return { ...state, errors: {}, serverError: null }

    case 'SET_SUBMITTING':
      return { ...state, submitting: !!action.value }

    case 'SET_SERVER_ERROR':
      return { ...state, serverError: action.error }

    case 'SET_CREATED_ID':
      return { ...state, lastCreatedId: action.id }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

export function useCampaignWizard() {
  const [state, dispatch] = useReducer(reducer, undefined, hydrateFromStorage)

  // ── Persist ──
  useEffect(() => {
    try {
      const { step, basics, targeting, products, errors } = state
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ step, basics, targeting, products, errors })
      )
    } catch {
      // localStorage có thể đầy — bỏ qua
    }
  }, [state.step, state.basics, state.targeting, state.products, state.errors])

  // ── Effective targeting (filter theo deliveryMode để build payload) ──
  const deliveryMode = state.basics.deliveryMode ?? 'Zone'
  const effectiveTargeting = useMemo(
    () => filterTargetingByDeliveryMode(state.targeting, deliveryMode),
    [state.targeting, deliveryMode]
  )

  // ── Allowed targeting theo deliveryMode (cho UI enable/disable tab) ──
  const allowedTargets = useMemo(() => {
    if (deliveryMode === 'Route') return { route: true, zone: false, shelf: false }
    if (deliveryMode === 'Zone') return { route: false, zone: true, shelf: true }
    return { route: true, zone: true, shelf: true } // 'Both'
  }, [deliveryMode])

  // ── Derived selectors ──
  const hasAnyTargeting = useMemo(() => {
    return (
      effectiveTargeting.routeIds.length > 0 ||
      effectiveTargeting.zoneIds.length > 0 ||
      effectiveTargeting.shelfIds.length > 0
    )
  }, [effectiveTargeting])

  const hasProducts = useMemo(
    () => state.products.productIds.length > 0,
    [state.products]
  )

  const basicsValid = useMemo(() => {
    const b = state.basics
    return (
      b.campaignName.trim().length > 0 &&
      b.brandId !== null &&
      b.packageId !== null &&
      (!!b.bannerUrl || !!b.videoUrl)
    )
  }, [state.basics])

  // ── Validation realtime (cho Step 1 UX) ──
  const basicsErrors = useMemo(() => {
    const b = state.basics
    const errs = {}
    if (!b.campaignName.trim()) errs.campaignName = 'Vui lòng nhập tên chiến dịch.'
    if (!b.brandId) errs.brandId = 'Vui lòng chọn thương hiệu.'
    if (!b.packageId) errs.packageId = 'Vui lòng chọn gói quảng cáo.'
    if (!b.bannerUrl && !b.videoUrl) {
      errs.media = 'Vui lòng tải lên ít nhất Banner hoặc Video quảng cáo.'
    }
    return errs
  }, [state.basics])
  const hasBasicsErrors = useMemo(() => Object.keys(basicsErrors).length > 0, [basicsErrors])

  // ── Actions ──
  const setStep = useCallback((step) => dispatch({ type: 'SET_STEP', step }), [])
  const setBasics = useCallback((patch, errors) => dispatch({ type: 'PATCH_BASICS', patch, errors }), [])
  const setTargeting = useCallback((patch, errors) => dispatch({ type: 'PATCH_TARGETING', patch, errors }), [])
  const setProducts = useCallback((patch, errors) => dispatch({ type: 'PATCH_PRODUCTS', patch, errors }), [])
  const setErrors = useCallback((errors) => dispatch({ type: 'SET_ERRORS', errors }), [])
  const clearErrors = useCallback(() => dispatch({ type: 'CLEAR_ERRORS' }), [])
  const setSubmitting = useCallback((value) => dispatch({ type: 'SET_SUBMITTING', value }), [])
  const setServerError = useCallback((error) => dispatch({ type: 'SET_SERVER_ERROR', error }), [])
  const setCreatedId = useCallback((id) => dispatch({ type: 'SET_CREATED_ID', id }), [])
  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    floorId: FLOOR_ID_DEFAULT,
    deliveryMode,
    effectiveTargeting,
    allowedTargets,
    hasAnyTargeting,
    hasProducts,
    basicsValid,
    basicsErrors,
    hasBasicsErrors,
    setStep,
    setBasics,
    setTargeting,
    setProducts,
    setErrors,
    clearErrors,
    setSubmitting,
    setServerError,
    setCreatedId,
    reset,
  }
}

export const WIZARD_STEPS = [
  { key: 1, label: 'Cơ Bản',       icon: 'info',         desc: 'Tên, Brand, Package, Ngày' },
  { key: 2, label: 'Targeting',    icon: 'my_location',  desc: 'Chọn Route / Zone / Shelf' },
  { key: 3, label: 'Sản Phẩm',     icon: 'inventory_2',  desc: 'Chọn ≥1 sản phẩm tài trợ' },
  { key: 4, label: 'Review & Tạo', icon: 'check_circle', desc: 'Xác nhận và tạo chiến dịch' },
]
