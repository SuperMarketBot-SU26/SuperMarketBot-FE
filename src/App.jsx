import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdvertisementDashboard from './pages/AdvertisementDashboard'
import AdvertisementCreation from './pages/AdvertisementCreation'
import AdvertisementUpdate from './pages/AdvertisementUpdate'
import BrandDashboard from './pages/BrandDashboard'
import BrandWallet from './pages/BrandWallet'
import ParameterSettings from './pages/ParameterSettings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdvertisementDashboard />} />
        <Route path="/advertisement/create" element={<AdvertisementCreation />} />
        <Route path="/advertisement/update/:id" element={<AdvertisementUpdate />} />
        <Route path="/advertisement/brand-wallet" element={<BrandWallet />} />
        <Route path="/algorithm-settings" element={<ParameterSettings />} />
        <Route path="/brand-dashboard" element={<BrandDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
