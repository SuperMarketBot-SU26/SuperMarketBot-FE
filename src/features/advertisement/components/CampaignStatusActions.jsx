import React, { useState } from 'react'
import Button from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ConfirmModal'

const STATUS_CONFIG = {
  Draft:     { label: 'Bản Thảo (Draft)', icon: 'edit_note',       color: 'neutral'  },
  Inactive:  { label: 'Không Hoạt Động', icon: 'cancel',           color: 'danger'   },
  Active:    { label: 'Hoạt Động',        icon: 'check_circle',    color: 'success'  },
  Paused:    { label: 'Tạm Dừng',         icon: 'pause_circle',    color: 'warning'  },
  Canceled:  { label: 'Đã Hủy',           icon: 'block',           color: 'danger'   },
  Completed: { label: 'Hoàn Thành',       icon: 'task_alt',        color: 'neutral'  },
}

const colorMap = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  danger:  'bg-red-100 text-red-700 border-red-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
}

export function CampaignStatusActions({ status, completionStatus, onActivate, onPause, onCancel, onComplete, onViewLogs, loading }) {
  const [confirmAction, setConfirmAction] = useState(null)

  const handleConfirm = async () => {
    if (!confirmAction) return
    const result = await confirmAction.handler()
    setConfirmAction(null)
    return result
  }

  const config = STATUS_CONFIG[status] || { label: status, icon: 'help', color: 'neutral' }
  const isEnded = completionStatus?.isExpired || completionStatus?.isCompleted

  // Actions are available for: Draft, Inactive, Active, Paused (and not ended)
  const isActionable = ['Draft', 'Inactive', 'Active', 'Paused'].includes(status) && !isEnded
  const isActive     = status === 'Active'
  const isPaused     = status === 'Paused'
  const isInactive   = status === 'Inactive' || status === 'Draft'
  const isCompletable = status === 'Active' && !isEnded

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold border ${colorMap[config.color] || colorMap.neutral}`}>
          <span className="material-symbols-outlined text-[18px]">{isEnded ? 'event_busy' : config.icon}</span>
          {isEnded ? 'Đã kết thúc' : config.label}
        </div>

        {/* Action buttons */}
        {isActionable && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              icon="history"
              size="sm"
              disabled={loading}
              onClick={() => onViewLogs?.()}
            >
              Xem Nhật Ký
            </Button>

            {/* Activate — shown for Inactive.
                Per BE, Activate takes only the campaign id — it operates on
                whatever targeting was last persisted via the Update button.
                If no targeting was saved, the BE returns a localized 400 and
                the parent's error banner surfaces it. */}
            {isInactive && (
              <Button
                variant="success"
                icon="play_arrow"
                size="sm"
                disabled={loading}
                onClick={() => setConfirmAction({
                  type: 'activate',
                  message: 'Bạn có chắc muốn kích hoạt chiến dịch này?',
                  handler: onActivate,
                })}
              >
                Kích Hoạt
              </Button>
            )}

            {/* Pause — shown for Active */}
            {isActive && (
              <>
                <Button
                  variant="info"
                  icon="task_alt"
                  size="sm"
                  disabled={loading || isEnded}
                  onClick={() => setConfirmAction({
                    type: 'complete',
                    message: isEnded
                      ? 'Chiến dịch đã kết thúc, không thể đánh dấu hoàn thành.'
                      : 'Bạn có chắc muốn đánh dấu chiến dịch này là hoàn thành?',
                    handler: isEnded ? () => {} : onComplete,
                  })}
                >
                  Hoàn Thành
                </Button>
                <Button
                  variant="warning"
                  icon="pause"
                  size="sm"
                  disabled={loading}
                  onClick={() => setConfirmAction({
                    type: 'pause',
                    message: 'Bạn có chắc muốn tạm dừng chiến dịch này?',
                    handler: onPause,
                  })}
                >
                  Tạm Dừng
                </Button>
              </>
            )}

            {/* Resume (activate after pause) — shown for Paused */}
            {isPaused && (
              <Button
                variant="success"
                icon="play_arrow"
                size="sm"
                disabled={loading}
                onClick={() => setConfirmAction({
                  type: 'activate',
                  message: 'Bạn có chắc muốn tiếp tục chiến dịch này?',
                  handler: onActivate,
                })}
              >
                Tiếp Tục
              </Button>
            )}

            {/* Cancel — always shown for Inactive / Active / Paused */}
            <Button
              variant="danger"
              icon="cancel"
              size="sm"
              disabled={loading}
              onClick={() => setConfirmAction({
                type: 'cancel',
                message: 'Bạn có chắc muốn hủy chiến dịch này? Hành động này không thể hoàn tác.',
                handler: onCancel,
              })}
            >
              Hủy Chiến Dịch
            </Button>
          </div>
        )}
      </div>

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  )
}

export default CampaignStatusActions
