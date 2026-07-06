import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdvertisementDashboard from './pages/AdvertisementDashboard'
import AdvertisementCreation from './pages/AdvertisementCreation'
import AdvertisementUpdate from './pages/AdvertisementUpdate'
import AdPackageCreation from './pages/AdPackageCreation'
import BrandDashboard from './pages/BrandDashboard'
import BrandCreation from './pages/BrandCreation'
import BrandUpdate from './pages/BrandUpdate'
import BrandWallet from './pages/BrandWallet'
import ProductManagement from './pages/ProductManagement'
import ProductDetail from './pages/ProductDetail'
import ParameterSettings from './pages/ParameterSettings'
import RobotMonitoring from './pages/RobotMonitoring'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Advertisement */}
        <Route path="/" element={<AdvertisementDashboard />} />
        <Route path="/advertisement" element={<AdvertisementDashboard />} />
        <Route path="/advertisement/create" element={<AdvertisementCreation />} />
        <Route path="/advertisement/update/:id" element={<AdvertisementUpdate />} />
        <Route path="/advertisement/brand-wallet" element={<BrandWallet />} />
        <Route path="/ad-packages" element={<AdPackageCreation />} />

        {/* Algorithm settings */}
        <Route path="/algorithm-settings" element={<ParameterSettings />} />

        {/* Brand */}
        <Route path="/brand-dashboard" element={<BrandDashboard />} />
        <Route path="/brand" element={<BrandDashboard />} />
        <Route path="/brand/create" element={<BrandCreation />} />
        <Route path="/brand/update/:id" element={<BrandUpdate />} />

        {/* Products */}
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/products/:id" element={<ProductDetail />} />

        {/* Robot monitoring */}
        <Route path="/robots" element={<RobotMonitoring />} />
        <Route path="/robot-monitoring" element={<RobotMonitoring />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
