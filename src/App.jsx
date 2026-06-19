import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdvertisementCreation from './pages/AdvertisementCreation'
import ParameterSettings from './pages/ParameterSettings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdvertisementCreation />} />
        <Route path="/algorithm-settings" element={<ParameterSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
