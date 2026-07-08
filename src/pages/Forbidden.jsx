import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

/**
 * Forbidden — shown when a logged-in user tries to enter a page their role
 * isn't allowed to see. Stays mounted on top of the normal layout so the
 * user can navigate elsewhere without losing context.
 */
export function Forbidden() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleHome = () => navigate('/robots', { replace: true })
  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-smb-surface">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="max-w-md space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-smb-error-container text-smb-on-error-container">
            <Icon name="block" className="text-[36px]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-headline-lg text-smb-on-surface">Không có quyền truy cập</h1>
            <p className="text-sm text-smb-on-surface-variant">
              Tài khoản{' '}
              <span className="font-mono text-smb-on-surface">
                {user?.email || 'của bạn'}
              </span>{' '}
              không có quyền xem trang này. Vui lòng liên hệ quản trị viên nếu bạn
              cho rằng đây là nhầm lẫn.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleHome}
              className="inline-flex items-center gap-2 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container"
            >
              <Icon name="home" className="text-[18px]" />
              Về trang chính
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded bg-smb-error px-4 py-2 text-sm font-medium text-white hover:bg-smb-error/90"
            >
              <Icon name="logout" className="text-[18px]" />
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Forbidden