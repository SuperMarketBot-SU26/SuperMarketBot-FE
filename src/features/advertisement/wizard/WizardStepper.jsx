import React from 'react'
import { WIZARD_STEPS } from './useCampaignWizard'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export function WizardStepper({ current, completed, onStepClick }) {
  return (
    <ol className="flex items-center justify-between gap-2 rounded-2xl border border-smb-outline-variant bg-smb-surface-container-lowest p-4 shadow-sm">
      {WIZARD_STEPS.map((step, idx) => {
        const isCurrent = current === step.key
        const isDone = completed.includes(step.key)
        const isReachable = isDone || isCurrent || step.key < current
        return (
          <React.Fragment key={step.key}>
            <li className="flex flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => isReachable && onStepClick?.(step.key)}
                disabled={!isReachable}
                aria-current={isCurrent ? 'step' : undefined}
                className={`
                  group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors
                  ${isReachable ? 'cursor-pointer hover:bg-smb-surface-container' : 'cursor-not-allowed'}
                `}
              >
                <span
                  className={`
                    flex size-9 items-center justify-center rounded-full border-2 text-sm font-semibold
                    ${isDone
                      ? 'border-smb-primary-container bg-smb-primary-container text-smb-on-primary-container'
                      : isCurrent
                        ? 'border-smb-primary-container bg-smb-surface-container-lowest text-smb-primary-container shadow-[0_0_0_3px_rgb(74_222_128/0.18)]'
                        : 'border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant'}
                  `}
                >
                  {isDone
                    ? <Icon name="check" className="text-[18px]" />
                    : <Icon name={step.icon} className="text-[18px]" />}
                </span>
                <span className="hidden flex-col sm:flex">
                  <span className={`text-sm font-medium ${isCurrent || isDone ? 'text-smb-on-surface' : 'text-smb-on-surface-variant'}`}>
                    Bước {step.key} · {step.label}
                  </span>
                  <span className="text-xs text-smb-on-surface-variant">{step.desc}</span>
                </span>
              </button>
            </li>
            {idx < WIZARD_STEPS.length - 1 && (
              <li
                aria-hidden="true"
                className={`hidden h-0.5 flex-1 sm:block ${
                  completed.includes(step.key) || current > step.key
                    ? 'bg-smb-primary-container'
                    : 'bg-smb-outline-variant'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </ol>
  )
}

export default WizardStepper
