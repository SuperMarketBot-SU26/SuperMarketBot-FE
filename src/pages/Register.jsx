import React, { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../features/auth/useAuth'
import * as authApi from '../features/auth/api/authApi'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * Register page
 *
 * 2-step flow:
 *   1. POST /api/auth/register  { fullName, email, phone?, password }
 *      → BE hashes the password, stores OtpCode + OtpType = "Registration",
 *        sends an OTP email, marks the account Active.
 *   2. POST /api/auth/verify-otp { email, otpCode }
 *      → returns AuthResponseDto (JWT access + refresh tokens)
 *
 * UI shows both steps inline; the user stays on this page until they verify.
 */

const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60

export function Register() {
  const { isAuthenticated, bootstrapping, register, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Step 1 fields
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [step, setStep] = useState('form') // 'form' | 'otp'
  const [info, setInfo] = useState(null) // success message between steps

  // OTP state
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [verifying, setVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef([])

  // Resend cooldown ticker — placed before any early returns so the rules
  // of hooks aren't violated.
  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  if (bootstrapping) return null
  if (isAuthenticated) {
    const dest = location.state?.from || '/robots'
    return <Navigate to={dest} replace />
  }

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const validateForm = () => {
    if (!form.fullName.trim()) return 'Vui lòng nhập họ tên.'
    if (form.fullName.trim().length < 2) return 'Họ tên quá ngắn.'
    if (!form.email.trim()) return 'Vui lòng nhập email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'Email không đúng định dạng.'
    if (!form.password) return 'Vui lòng nhập mật khẩu.'
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.'
    if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.'
    if (form.phone && !/^[0-9+\-\s()]{8,20}$/.test(form.phone.trim()))
      return 'Số điện thoại không hợp lệ.'
    return null
  }

  const handleSubmitForm = async (e) => {
    e?.preventDefault?.()
    const v = validateForm()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      })
      setInfo('Mã OTP đã được gửi về email của bạn. Vui lòng kiểm tra hộp thư.')
      setStep('otp')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      // Focus first OTP cell after render.
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err) {
      const status = err?.response?.status
      const msg =
        status === 400
          ? err?.response?.data?.message ||
            err?.response?.data?.error ||
            'Email đã được sử dụng hoặc dữ liệu không hợp lệ.'
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Đăng ký thất bại. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    setOtp((prev) => {
      const next = [...prev]
      next[idx] = digit
      return next
    })
    if (digit && idx < OTP_LENGTH - 1) {
      otpRefs.current[idx + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && idx > 0) otpRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1)
      otpRefs.current[idx + 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    e.preventDefault()
    const next = Array(OTP_LENGTH).fill('')
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setOtp(next)
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleVerify = async (e) => {
    e?.preventDefault?.()
    const code = otp.join('')
    if (code.length !== OTP_LENGTH) {
      setError('Vui lòng nhập đủ 6 chữ số OTP.')
      return
    }
    setError(null)
    setVerifying(true)
    try {
      await verifyOtp({ email: form.email.trim().toLowerCase(), otpCode: code })
      const dest = location.state?.from || '/robots'
      navigate(dest, { replace: true })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Mã OTP không đúng hoặc đã hết hạn.'
      setError(msg)
      // Clear OTP on failure
      setOtp(Array(OTP_LENGTH).fill(''))
      otpRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError(null)
    setInfo(null)
    try {
      await authApi.resendOtp({ email: form.email.trim().toLowerCase() })
      setInfo('Đã gửi lại mã OTP mới.')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Không thể gửi lại OTP. Vui lòng thử lại sau.'
      setError(msg)
    }
  }

  const handleBackToForm = () => {
    setStep('form')
    setOtp(Array(OTP_LENGTH).fill(''))
    setError(null)
    setInfo(null)
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <div className="flex min-h-screen items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-lg space-y-8">
          <header className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-smb-primary-container text-smb-on-primary smb-elev-2">
              <Icon name="person_add" className="text-[28px]" />
            </div>
            <h2 className="text-headline-lg text-smb-on-surface">
              {step === 'form' ? 'Tạo tài khoản' : 'Xác thực email'}
            </h2>
            <p className="text-sm text-smb-on-surface-variant">
              {step === 'form'
                ? 'Đăng ký để truy cập bảng điều khiển SmartMarketBot.'
                : `Nhập mã 6 chữ số đã được gửi đến ${form.email.trim() || 'email của bạn'}.`}
            </p>
          </header>

          {/* Stepper */}
          <ol className="flex items-center gap-3 text-xs">
            <li className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === 'form'
                    ? 'bg-smb-primary-container text-smb-on-primary'
                    : 'bg-smb-success text-white'
                }`}
              >
                {step === 'form' ? '1' : <Icon name="check" className="text-[14px]" />}
              </span>
              <span
                className={
                  step === 'form'
                    ? 'font-medium text-smb-on-surface'
                    : 'text-smb-on-surface-variant'
                }
              >
                Thông tin
              </span>
            </li>
            <div className="h-px flex-1 bg-smb-outline-variant" />
            <li className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  step === 'otp'
                    ? 'bg-smb-primary-container text-smb-on-primary'
                    : 'bg-smb-surface-container-high text-smb-on-surface-variant'
                }`}
              >
                2
              </span>
              <span
                className={
                  step === 'otp'
                    ? 'font-medium text-smb-on-surface'
                    : 'text-smb-on-surface-variant'
                }
              >
                Xác thực OTP
              </span>
            </li>
          </ol>

          {/* ── STEP 1: form ──────────────────────────────────────── */}
          {step === 'form' && (
            <form onSubmit={handleSubmitForm} className="space-y-4" noValidate>
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                icon="person"
                value={form.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                autoComplete="name"
                autoFocus
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="admin@supermarket.vn"
                icon="mail"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                autoComplete="email"
                required
              />
              <Input
                label="Số điện thoại (tùy chọn)"
                type="tel"
                placeholder="0901 234 567"
                icon="call"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                autoComplete="tel"
              />
              <div>
                <Input
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 6 ký tự"
                  icon="lock"
                  value={form.password}
                  onChange={(e) => set({ password: e.target.value })}
                  autoComplete="new-password"
                  required
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-smb-on-surface-variant">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-smb-outline-variant accent-smb-primary-container"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Hiện mật khẩu
                </label>
              </div>
              <Input
                label="Xác nhận mật khẩu"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu"
                icon="lock_reset"
                value={form.confirmPassword}
                onChange={(e) => set({ confirmPassword: e.target.value })}
                autoComplete="new-password"
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded border border-smb-error bg-smb-error-container/40 px-3 py-2 text-xs text-smb-on-error-container">
                  <Icon name="error" className="mt-px text-[16px]" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={submitting}
                icon={submitting ? undefined : 'how_to_reg'}
              >
                {submitting ? 'Đang gửi OTP…' : 'Tiếp tục'}
              </Button>
            </form>
          )}

          {/* ── STEP 2: OTP ──────────────────────────────────────── */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-5" noValidate>
              {info && (
                <div className="flex items-start gap-2 rounded border border-smb-success bg-smb-success-bg/60 px-3 py-2 text-xs text-smb-success">
                  <Icon name="mark_email_read" className="mt-px text-[16px]" />
                  <span>{info}</span>
                </div>
              )}

              <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    aria-label={`OTP chữ số ${idx + 1}`}
                    className="size-12 rounded-lg border border-smb-outline-variant bg-smb-surface-container-lowest text-center text-xl font-semibold tabular-nums text-smb-on-surface focus:border-smb-primary-container focus:outline-none focus:ring-2 focus:ring-smb-primary-container/20 sm:size-14"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-smb-on-surface-variant">
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="inline-flex items-center gap-1 font-medium hover:text-smb-on-surface"
                >
                  <Icon name="arrow_back" className="text-[14px]" />
                  Đổi email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1 font-medium text-smb-primary-container hover:underline disabled:cursor-not-allowed disabled:text-smb-on-surface-variant disabled:no-underline"
                >
                  <Icon name="refresh" className="text-[14px]" />
                  {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : 'Gửi lại OTP'}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded border border-smb-error bg-smb-error-container/40 px-3 py-2 text-xs text-smb-on-error-container">
                  <Icon name="error" className="mt-px text-[16px]" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={verifying}
                icon={verifying ? undefined : 'verified'}
              >
                {verifying ? 'Đang xác thực…' : 'Xác nhận & đăng nhập'}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-smb-on-surface-variant">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="font-medium text-smb-primary-container hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register