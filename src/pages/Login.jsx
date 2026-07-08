import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../features/auth/useAuth'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * Login page
 * POST /api/auth/login  → { email, password }  →  AuthResponseDto
 * On success: AuthContext.applySession() stores the JWT and we redirect to
 * the page the user came from (or /robots by default).
 */
export function Login() {
  const { isAuthenticated, bootstrapping, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (bootstrapping) return null
  if (isAuthenticated) {
    const dest = location.state?.from || '/robots'
    return <Navigate to={dest} replace />
  }

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = () => {
    if (!form.email.trim()) return 'Vui lòng nhập email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return 'Email không đúng định dạng.'
    if (!form.password) return 'Vui lòng nhập mật khẩu.'
    if (form.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.'
    return null
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login({ email: form.email.trim().toLowerCase(), password: form.password })
      const dest = location.state?.from || '/robots'
      navigate(dest, { replace: true })
    } catch (err) {
      const status = err?.response?.status
      const msg =
        status === 401
          ? 'Email hoặc mật khẩu không đúng.'
          : err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            'Đăng nhập thất bại. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left: branding panel — desktop only */}
        <aside className="relative hidden overflow-hidden bg-smb-primary-container text-smb-on-primary lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-smb-primary-container via-smb-primary-container to-smb-tertiary-container opacity-95" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.25) 0%, transparent 50%)',
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-white/15 smb-inset-highlight">
                <Icon name="storefront" className="text-[28px]" />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">SmartMarketBot</p>
                <p className="text-xs text-white/70">Admin Dashboard</p>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-display-lg max-w-md leading-tight">
                Vận hành siêu thị thông minh cùng đội robot tự hành.
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-white/80">
                Theo dõi vị trí robot, gán lộ trình, tối ưu hóa quảng cáo và quản lý
                sản phẩm — tất cả trong một bảng điều khiển duy nhất.
              </p>

              <ul className="space-y-2 text-sm text-white/85">
                <li className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[18px]" />
                  Giám sát đội robot theo thời gian thực
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[18px]" />
                  Quản lý chiến dịch quảng cáo &amp; ví nhãn hàng
                </li>
                <li className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[18px]" />
                  Phân tích dữ liệu bán hàng &amp; tồn kho
                </li>
              </ul>
            </div>

            <p className="text-xs text-white/60">
              © 2026 SmartMarketBot — Capstone Project
            </p>
          </div>
        </aside>

        {/* Right: form */}
        <main className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md space-y-8">
            <header className="space-y-2">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex size-9 items-center justify-center rounded-lg bg-smb-primary-container text-smb-on-primary">
                  <Icon name="storefront" className="text-[22px]" />
                </div>
                <p className="text-sm font-semibold text-smb-on-surface">
                  SmartMarketBot
                </p>
              </div>
              <h2 className="text-headline-lg text-smb-on-surface">Đăng nhập</h2>
              <p className="text-sm text-smb-on-surface-variant">
                Sử dụng tài khoản quản trị để truy cập bảng điều khiển.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Email"
                type="email"
                placeholder="admin@supermarket.vn"
                icon="mail"
                value={form.email}
                onChange={(e) => set({ email: e.target.value })}
                autoComplete="email"
                autoFocus
                required
              />

              <div>
                <Input
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  icon="lock"
                  value={form.password}
                  onChange={(e) => set({ password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-smb-on-surface-variant">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-smb-outline-variant accent-smb-primary-container"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                    />
                    Hiện mật khẩu
                  </label>
                  <Link
                    to="/forgot-password"
                    className="font-medium text-smb-primary-container hover:underline"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
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
                loading={submitting}
                icon={submitting ? undefined : 'login'}
              >
                {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </form>

            <p className="text-center text-sm text-smb-on-surface-variant">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="font-medium text-smb-primary-container hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Login