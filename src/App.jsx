import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdvertisementCreation from './pages/AdvertisementCreation'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdvertisementCreation />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
