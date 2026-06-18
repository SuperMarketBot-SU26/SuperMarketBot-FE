const navItems = [
  { icon: 'inventory_2', label: 'Quản Lý Kho Hàng', active: true },
  { icon: 'smart_toy', label: 'Giám Sát Robot' },
  { icon: 'groups', label: 'Quản Lý Khách Hàng' },
  { icon: 'sell', label: 'Khuyến Mãi & Trợ Giá' },
  { icon: 'gpp_maybe', label: 'Chống Gian Lận' },
  { icon: 'account_balance_wallet', label: 'Đối Soát Ví Brand' },
  { icon: 'reviews', label: 'Đánh Giá & Phản Hồi' },
  { icon: 'tune', label: 'Cấu Hình Thuật Toán' },
  { icon: 'manage_accounts', label: 'Quản Lý Tài Khoản' },
  { icon: 'history', label: 'Nhật Ký Hệ Thống' },
]

const stats = [
  {
    label: 'Tổng mặt hàng',
    icon: 'inventory',
    value: '1,248',
    trend: '+12 mặt hàng mới',
    trendIcon: 'trending_up',
    trendColor: 'text-smb-success',
  },
  {
    label: 'Sắp hết hàng',
    icon: 'warning',
    value: '42',
    trend: 'Cần nhập thêm ngay',
    trendColor: 'text-smb-on-tertiary-container',
    accent: true,
  },
  {
    label: 'Trạng thái API',
    icon: 'cloud_done',
    value: 'Ổn định',
    trend: 'Đồng bộ hóa 2 phút trước',
    trendColor: 'text-smb-on-surface-variant',
    statusOk: true,
  },
]

const products = [
  {
    sku: 'SMB-0012',
    name: 'Sữa Tươi Tiệt Trùng 1L',
    stock: 542,
    apiOk: true,
    tags: ['Bình thường', 'Sắp hết hàng', 'Tồn kho nhiều'],
    activeTag: 0,
    priority: '+120',
  },
  {
    sku: 'SMB-0455',
    name: 'Nước Giải Khát Lon 330ml',
    stock: 1890,
    apiOk: true,
    tags: ['Bình thường', 'Sắp hết hàng', 'Tồn kho nhiều'],
    activeTag: 2,
    priority: '+450',
  },
  {
    sku: 'SMB-0091',
    name: 'Cà Phê Rang Xay 500g',
    stock: 14,
    apiOk: false,
    tags: ['Bình thường', 'Sắp hết hàng', 'Tồn kho nhiều'],
    activeTag: 1,
    priority: '+85',
  },
  {
    sku: 'SMB-0772',
    name: 'Ngũ Cốc Ăn Kiêng 400g',
    stock: 0,
    apiOk: false,
    tags: ['Sắp hết hàng'],
    activeTag: 0,
    priority: '-9999',
    outOfStock: true,
  },
  {
    sku: 'SMB-0115',
    name: 'Tai Nghe Không Dây Pro',
    stock: 88,
    apiOk: true,
    tags: ['Bình thường', 'Sắp hết hàng', 'Tồn kho nhiều'],
    activeTag: 0,
    priority: '+205',
  },
]

const chartBars = [
  { day: 'T2', value: 62, label: '450 SP' },
  { day: 'T3', value: 48 },
  { day: 'T4', value: 71 },
  { day: 'T5', value: 85, current: true },
  { day: 'T6', value: 55 },
  { day: 'T7', value: 40 },
  { day: 'CN', value: 35 },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-smb-outline-variant bg-smb-surface-container-lowest">
      <div className="flex items-center gap-3 border-b border-smb-outline-variant px-6 py-5">
        <div className="flex size-9 items-center justify-center rounded bg-smb-primary-container text-smb-on-primary">
          <Icon name="storefront" className="text-[22px]" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-smb-on-surface">
            SmartMarketBot
          </p>
          <p className="text-xs font-medium text-smb-on-surface-variant">
            Admin Dashboard
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={`relative flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-smb-active-bg text-smb-primary-container'
                    : 'text-smb-on-surface-variant hover:bg-smb-surface-container-low hover:text-smb-on-surface'
                }`}
              >
                {item.active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-smb-primary-container" />
                )}
                <Icon
                  name={item.icon}
                  className={`text-[20px] ${item.active ? 'text-smb-primary-container' : ''}`}
                />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-smb-outline-variant p-4">
        <div className="flex items-center gap-3 rounded border border-smb-outline-variant bg-smb-surface-container-low px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-smb-secondary-container text-xs font-semibold text-smb-on-secondary-container">
            TH
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-smb-on-surface">
              Trần Hoàng Nam
            </p>
            <p className="truncate text-xs text-smb-on-surface-variant">
              Quản trị viên
            </p>
          </div>
          <Icon name="unfold_more" className="text-[18px] text-smb-outline" />
        </div>
      </div>
    </aside>
  )
}

function StatCard({ stat }) {
  return (
    <div className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-smb-on-surface-variant">
          {stat.label}
        </span>
        <Icon
          name={stat.icon}
          className={`text-[22px] ${
            stat.accent
              ? 'text-smb-on-tertiary-container'
              : stat.statusOk
                ? 'text-smb-success'
                : 'text-smb-primary-container'
          }`}
        />
      </div>
      <p className="text-[28px] font-semibold leading-9 tracking-tight text-smb-on-surface">
        {stat.value}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${stat.trendColor}`}>
        {stat.trendIcon && <Icon name={stat.trendIcon} className="text-[16px]" />}
        {stat.trend}
      </p>
    </div>
  )
}

function TagPill({ label, active, warning }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
        warning
          ? 'bg-smb-error-container text-smb-on-error-container'
          : active
            ? 'bg-smb-secondary-container text-smb-on-secondary-container'
            : 'bg-smb-surface-container text-smb-on-surface-variant'
      }`}
    >
      {label}
    </span>
  )
}

function ProductTable() {
  return (
    <div className="overflow-hidden rounded border border-smb-outline-variant bg-smb-surface-container-lowest">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-smb-outline-variant bg-smb-surface-container-low">
              {['SKU', 'Sản Phẩm', 'Tồn Kho', 'Trạng Thái API', 'Nhãn Ngữ Cảnh', 'Điểm Priority'].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-smb-on-surface-variant"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr
                key={product.sku}
                className="border-b border-smb-outline-variant last:border-b-0 hover:bg-smb-surface-container-low/60"
              >
                <td className="px-4 py-3 text-sm font-medium tabular-nums text-smb-primary-container">
                  {product.sku}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-smb-on-surface">{product.name}</p>
                  {product.outOfStock && (
                    <p className="mt-0.5 text-xs font-medium text-smb-error">
                      Hết hàng trên kệ
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums text-smb-on-surface">
                  {product.stock.toLocaleString('vi-VN')}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <Icon
                      name={product.apiOk ? 'cloud_done' : 'cloud_off'}
                      className={`text-[18px] ${product.apiOk ? 'text-smb-success' : 'text-smb-error'}`}
                    />
                    <span className="text-smb-on-surface-variant">
                      {product.apiOk ? 'Đồng bộ' : 'Lỗi'}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map((tag, i) => (
                      <TagPill
                        key={tag}
                        label={tag}
                        active={i === product.activeTag}
                        warning={product.outOfStock && i === 0}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      product.priority.startsWith('-')
                        ? 'text-smb-error'
                        : 'text-smb-primary-container'
                    }`}
                  >
                    {product.priority}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-smb-outline-variant px-4 py-3">
        <p className="text-sm text-smb-on-surface-variant">
          Đang hiển thị <span className="font-medium text-smb-on-surface">1–5</span> trong số{' '}
          <span className="font-medium text-smb-on-surface">1,248</span> SKU
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
          >
            <Icon name="chevron_left" className="text-[18px]" />
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              type="button"
              className={`flex size-8 items-center justify-center rounded text-sm font-medium ${
                page === 1
                  ? 'bg-smb-primary-container text-smb-on-primary'
                  : 'border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
          >
            <Icon name="chevron_right" className="text-[18px]" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TrendChart() {
  return (
    <div className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
      <h3 className="text-base font-semibold text-smb-on-surface">
        Biểu Đồ Xu Hướng Nhập Kho
      </h3>
      <div className="mt-6 flex h-40 items-end justify-between gap-2">
        {chartBars.map((bar) => (
          <div key={bar.day} className="flex flex-1 flex-col items-center gap-2">
            {bar.label && (
              <span className="text-xs font-medium text-smb-on-surface-variant">
                {bar.label}
              </span>
            )}
            <div
              className={`w-full max-w-10 rounded-t transition-all ${
                bar.current ? 'bg-smb-primary-container' : 'bg-smb-secondary-container'
              }`}
              style={{ height: `${bar.value}%` }}
            />
            <span
              className={`text-xs font-medium ${
                bar.current ? 'text-smb-primary-container' : 'text-smb-on-surface-variant'
              }`}
            >
              {bar.day}
              {bar.current && (
                <span className="block text-[10px] font-normal">(Hiện tại)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiRecommendation() {
  return (
    <div className="rounded border border-smb-outline-variant bg-smb-surface-container-lowest p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded bg-smb-primary-container/10">
          <Icon name="auto_awesome" className="text-[20px] text-smb-primary-container" />
        </div>
        <h3 className="text-base font-semibold text-smb-on-surface">Đề Xuất AI</h3>
      </div>
      <p className="text-sm leading-5 text-smb-on-surface-variant">
        Mặt hàng &quot;Sữa Tươi&quot; đang có xu hướng tăng trưởng{' '}
        <span className="font-semibold text-smb-primary-container">24%</span>. Hệ thống đề xuất
        tăng hạn mức tồn kho lên{' '}
        <span className="font-semibold text-smb-on-surface">700 đơn vị</span> để tránh đứt gãy
        chuỗi cung ứng.
      </p>
      <button
        type="button"
        className="mt-4 rounded bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary transition-opacity hover:opacity-90"
      >
        Áp dụng cấu hình tự động
      </button>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-smb-surface">
      <Sidebar />

      <div className="pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-smb-outline-variant bg-smb-surface-container-lowest/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-smb-on-surface">
                Quản Lý Kho Hàng
              </h1>
              <p className="mt-0.5 text-sm text-smb-on-surface-variant">
                Giám sát tồn kho, đồng bộ API và ưu tiên nhập hàng
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="search" />
              </button>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded border border-smb-outline-variant text-smb-on-surface-variant hover:bg-smb-surface-container"
              >
                <Icon name="notifications" />
              </button>
            </div>
          </div>
        </header>

        <main className="px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-smb-on-surface-variant">Bộ lọc:</span>
              {['Tất cả trạng thái', 'Đang kinh doanh', 'Ngừng kinh doanh'].map((filter, i) => (
                <button
                  key={filter}
                  type="button"
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    i === 0
                      ? 'bg-smb-primary-container text-smb-on-primary'
                      : 'border border-smb-outline-variant bg-smb-surface-container-lowest text-smb-on-surface-variant hover:bg-smb-surface-container'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded border border-smb-outline-variant bg-smb-surface-container-lowest px-4 py-2 text-sm font-medium text-smb-on-surface hover:bg-smb-surface-container"
              >
                <Icon name="file_download" className="text-[18px]" />
                Xuất báo cáo
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded bg-smb-primary-container px-4 py-2 text-sm font-medium text-smb-on-primary hover:opacity-90"
              >
                <Icon name="add" className="text-[18px]" />
                Thêm SKU
              </button>
            </div>
          </div>

          <div className="mt-6">
            <ProductTable />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <TrendChart />
            <AiRecommendation />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
