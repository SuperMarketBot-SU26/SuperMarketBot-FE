import { useCallback, useEffect, useMemo, useReducer } from 'react'

const STORAGE_KEY = 'campaignWizardState'
const FLOOR_ID_DEFAULT = 1

const initialState = {
  step: 1,
  basics: {
    campaignName: '',
    brandId: null,
    packageId: null,
    startDate: '',
    endDate: '',
  },
  targeting: {
    routeIds: [],
    zoneIds: [],
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

  // ── Persist (chỉ phần user data, không persist submitting/errors) ──
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

  // ── Derived selectors ──
  const hasAnyTargeting = useMemo(
    () =>
      state.targeting.routeIds.length > 0 ||
      state.targeting.zoneIds.length > 0 ||
      state.targeting.semanticObjectId !== null,
    [state.targeting]
  )

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
      !!b.startDate &&
      !!b.endDate &&
      new Date(b.endDate) > new Date(b.startDate)
    )
  }, [state.basics])

  // ── Actions ──
  const setStep       = useCallback((step) => dispatch({ type: 'SET_STEP', step }), [])
  const setBasics     = useCallback((patch, errors) => dispatch({ type: 'PATCH_BASICS', patch, errors }), [])
  const setTargeting  = useCallback((patch, errors) => dispatch({ type: 'PATCH_TARGETING', patch, errors }), [])
  const setProducts   = useCallback((patch, errors) => dispatch({ type: 'PATCH_PRODUCTS', patch, errors }), [])
  const setErrors     = useCallback((errors) => dispatch({ type: 'SET_ERRORS', errors }), [])
  const clearErrors   = useCallback(() => dispatch({ type: 'CLEAR_ERRORS' }), [])
  const setSubmitting = useCallback((value) => dispatch({ type: 'SET_SUBMITTING', value }), [])
  const setServerError= useCallback((error) => dispatch({ type: 'SET_SERVER_ERROR', error }), [])
  const setCreatedId  = useCallback((id) => dispatch({ type: 'SET_CREATED_ID', id }), [])
  const reset         = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    floorId: FLOOR_ID_DEFAULT,
    hasAnyTargeting,
    hasProducts,
    basicsValid,
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
  { key: 1, label: 'Cơ Bản',   icon: 'info',           desc: 'Tên, Brand, Package, Ngày' },
  { key: 2, label: 'Targeting', icon: 'my_location',   desc: 'Chọn Route / Zone / Shelf' },
  { key: 3, label: 'Sản Phẩm', icon: 'inventory_2',   desc: 'Chọn ≥1 sản phẩm tài trợ' },
  { key: 4, label: 'Review & Tạo', icon: 'check_circle', desc: 'Xác nhận và tạo chiến dịch' },
]
