import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdvertisementDashboard from './pages/AdvertisementDashboard'
import AdvertisementCreation from './pages/AdvertisementCreation'
import BrandWallet from './pages/BrandWallet'
import ParameterSettings from './pages/ParameterSettings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdvertisementDashboard />} />
        <Route path="/advertisement/create" element={<AdvertisementCreation />} />
        <Route path="/advertisement/brand-wallet" element={<BrandWallet />} />
        <Route path="/algorithm-settings" element={<ParameterSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
