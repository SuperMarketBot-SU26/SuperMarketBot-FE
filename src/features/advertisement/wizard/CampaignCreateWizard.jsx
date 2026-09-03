import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCampaignWizard, WIZARD_STEPS } from './useCampaignWizard'
import { WizardStepper } from './WizardStepper'
import { StepBasics } from './StepBasics'
import { StepTargeting } from './StepTargeting'
import { StepProducts } from './StepProducts'
import { StepReview } from './StepReview'
import { ConfirmModal } from '../../../components/ConfirmModal'
import { getErrorMessage } from '../../../api/client'
import { getPackages } from '../api/adPackageApi'
import { getBrands } from '../../brand/api/brandApi'
import { createCampaignWithProducts } from '../api/adCampaignApi'
import { uploadResource } from '../api/adResourcesApi'
import { toast } from 'react-toastify'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function CampaignCreateWizard() {
  const navigate = useNavigate()
  const wizard = useCampaignWizard()
  const {
    state,
    effectiveTargeting,
    deliveryMode,
    allowedTargets,
    hasAnyTargeting,
    hasProducts,
    basicsValid,
    basicsErrors,
    hasBasicsErrors,
  } = wizard

  const [brandOptions, setBrandOptions] = useState([])
  const [packages, setPackages] = useState([])
  const [confirmReset, setConfirmReset] = useState(false)


  // Load brands + packages cho Step 1/Step 3 review
  useEffect(() => {
    getBrands()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items ?? []
        setBrandOptions(list.map((b) => ({ value: b.brandId, label: b.brandName })))
      })
      .catch(() => setBrandOptions([]))
  }, [])

  useEffect(() => {
    getPackages()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items ?? []
        setPackages(list)
      })
      .catch(() => setPackages([]))
  }, [])

  const selectedPackage = useMemo(
    () => packages.find((p) => p.packageId === state.basics.packageId) ?? null,
    [packages, state.basics.packageId]
  )

  const completed = useMemo(() => {
    const done = []
    if (basicsValid) done.push(1)
    if (hasAnyTargeting) done.push(2)
    if (hasProducts) done.push(3)
    return done
  }, [basicsValid, hasAnyTargeting, hasProducts])

  // ── Step navigation ──
  const goNext = () => {
    if (state.step === 1) {
      // Realtime validate đã chạy ở useCampaignWizard; chỉ re-check thời điểm click.
      if (hasBasicsErrors) {
        wizard.setErrors(basicsErrors)
        return
      }
      wizard.setErrors({})
      wizard.setStep(2)
    } else if (state.step === 2) {
      if (!hasAnyTargeting) return
      wizard.setStep(3)
    } else if (state.step === 3) {
      if (!hasProducts) {
        wizard.setErrors({ products: 'Vui lòng chọn ít nhất 1 sản phẩm tài trợ.' })
        return
      }
      wizard.setErrors({})
      wizard.setStep(4)
    }
  }

  const goBack = () => {
    if (state.step > 1) wizard.setStep(state.step - 1)
  }

  const goToStep = (target) => {
    if (target < state.step || completed.includes(target)) {
      wizard.setStep(target)
    }
  }

  // ── Submit ──
  const handleSubmit = async () => {
    wizard.setSubmitting(true)
    wizard.setServerError(null)
    try {
      // CHỈ gửi ID thuộc deliveryMode hiện tại (effectiveTargeting)
      const basePayload = {
        packageId: Number(state.basics.packageId),
        brandId: Number(state.basics.brandId),
        campaignName: state.basics.campaignName.trim(),
        description: state.basics.description?.trim() || '',
        bannerUrl: state.basics.bannerUrl,
        videoUrl: state.basics.videoUrl,
        startDate: state.basics.startDate ? new Date(state.basics.startDate).toISOString() : null,
        endDate: state.basics.endDate ? new Date(state.basics.endDate).toISOString() : null,
        routeIds: effectiveTargeting.routeIds,
        zoneIds: effectiveTargeting.zoneIds,
        shelfIds: effectiveTargeting.shelfIds,
        semanticObjectId: effectiveTargeting.semanticObjectId,
        deliveryMode: state.basics.deliveryMode ?? 'Zone',
      }
      const productIds = state.products.productIds
      const res = await createCampaignWithProducts({ ...basePayload, productIds })
      const newId = res?.adCampaignId ?? res?.id
      wizard.setCreatedId(newId)

      // Reset wizard TRƯỚC KHI navigate, để lần sau vào là form trắng
      wizard.reset()

      navigate(`/advertisement/detail/${newId}`)
    } catch (err) {
      const msg = getErrorMessage(err, 'Tạo chiến dịch thất bại. Vui lòng thử lại.')
      wizard.setServerError(msg)
      if (/targeting|nhắm đích/i.test(msg)) {
        wizard.setStep(2)
      } else if (/ngày|date|brand|package/i.test(msg)) {
        wizard.setStep(1)
      } else if (/product|sản phẩm/i.test(msg)) {
        wizard.setStep(3)
      }
    } finally {
      wizard.setSubmitting(false)
    }
  }

  // ── Confirm reset (nút Huỷ) ──
  const handleCancelClick = () => {
    const isDirty =
      state.basics.campaignName.trim() !== '' ||
      state.basics.brandId !== null ||
      state.basics.packageId !== null ||
      state.targeting.routeIds.length > 0 ||
      state.targeting.zoneIds.length > 0 ||
      state.targeting.shelfIds.length > 0 ||
      state.targeting.semanticObjectId !== null ||
      state.products.productIds.length > 0
    if (isDirty) setConfirmReset(true)
    else navigate('/advertisement')
  }

  const confirmResetAction = () => {
    wizard.reset()
    setConfirmReset(false)
    navigate('/advertisement')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/advertisement')}
            className="flex items-center gap-1 text-sm text-smb-on-surface-variant hover:text-smb-primary-container"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            Quay lại danh sách
          </button>
          <h1 className="mt-1 text-2xl font-bold text-smb-on-surface">Tạo Chiến Dịch Quảng Cáo</h1>
          <p className="text-sm text-smb-on-surface-variant">
            Hoàn thành 4 bước để khởi tạo chiến dịch. Dữ liệu được tự động lưu khi bạn nhập.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancelClick}
          className="rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2 text-sm font-medium text-smb-on-surface hover:border-smb-error hover:text-smb-error"
        >
          Huỷ
        </button>
      </div>

      {/* Stepper */}
      <WizardStepper current={state.step} completed={completed} onStepClick={goToStep} />

      {/* Step content */}
      <div className="rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-6 shadow-sm">
        {state.step === 1 && (
          <StepBasics
            state={state}
            onChange={(patch, errors) => wizard.setBasics(patch, errors)}
            brandOptions={brandOptions}
            onNext={goNext}
            errors={state.errors}
            basicsErrors={basicsErrors}
          />
        )}
        {state.step === 2 && (
          <StepTargeting
            state={state}
            floorId={wizard.floorId}
            onChange={(patch) => wizard.setTargeting(patch)}
            hasAnyTargeting={hasAnyTargeting}
            onBack={goBack}
            onNext={goNext}
            deliveryMode={deliveryMode}
            allowedTargets={allowedTargets}
          />
        )}
        {state.step === 3 && (
          <StepProducts
            state={state}
            onChange={(patch) => wizard.setProducts(patch)}
            hasProducts={hasProducts}
            onBack={goBack}
            onNext={goNext}
          />
        )}
        {state.step === 4 && (
          <StepReview
            state={state}
            brandOptions={brandOptions}
            selectedPackage={selectedPackage}
            effectiveTargeting={effectiveTargeting}
            onBack={goBack}
            onSubmit={handleSubmit}
            submitting={state.submitting}
            serverError={state.serverError}
          />
        )}
      </div>

      {confirmReset && (
        <ConfirmModal
          message="Bạn có chắc muốn huỷ? Mọi dữ liệu đã nhập sẽ bị xoá."
          confirmText="Huỷ & Xoá"
          cancelText="Tiếp tục chỉnh"
          confirmVariant="danger"
          onConfirm={confirmResetAction}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  )
}

export default CampaignCreateWizard
