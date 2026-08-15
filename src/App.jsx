import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import AdvertisementDashboard from './pages/AdvertisementDashboard'
import AdvertisementCreation from './pages/AdvertisementCreation'
import AdvertisementLogs from './pages/AdvertisementLogs'
import CampaignDetail from './pages/CampaignDetail'
import AdPackageCreation from './pages/AdPackageCreation'
import BrandDashboard from './pages/BrandDashboard'
import BrandCreation from './pages/BrandCreation'
import BrandUpdate from './pages/BrandUpdate'
import BrandWallet from './pages/BrandWallet'
import Forbidden from './pages/Forbidden'
import Login from './pages/Login'
import ProductManagement from './pages/ProductManagement'
import { ProductTypeManagement } from './pages/ProductTypeManagement'
import ProductDetail from './pages/ProductDetail'
import AccountManagement from './pages/AccountManagement'
import Register from './pages/Register'
import RobotMonitoring from './pages/RobotMonitoring'
import ShelfManagement from './pages/ShelfManagement'

import { AuthProvider } from './features/auth/AuthContext'
import ProtectedRoute from './features/auth/ProtectedRoute'
import { ThemeProvider } from './context/ThemeContext'
import { useSignalRAlerts } from './hooks/useSignalRAlerts'

function GlobalAlerts() {
  useSignalRAlerts();
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlobalAlerts />
        <ToastContainer
          position="top-right"
          autoClose={4000}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
          style={{ marginTop: '60px' }}
        />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forbidden" element={<Forbidden />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdvertisementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertisement"
              element={
                <ProtectedRoute>
                  <AdvertisementDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertisement/create"
              element={
                <ProtectedRoute>
                  <AdvertisementCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertisement/logs/:id"
              element={
                <ProtectedRoute>
                  <AdvertisementLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertisement/detail/:id"
              element={
                <ProtectedRoute>
                  <CampaignDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/advertisement/brand-wallet"
              element={
                <ProtectedRoute>
                  <BrandWallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ad-packages"
              element={
                <ProtectedRoute>
                  <AdPackageCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand-dashboard"
              element={
                <ProtectedRoute>
                  <BrandDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand"
              element={
                <ProtectedRoute>
                  <BrandDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/create"
              element={
                <ProtectedRoute>
                  <BrandCreation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand/update/:id"
              element={
                <ProtectedRoute>
                  <BrandUpdate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/product-types"
              element={
                <ProtectedRoute>
                  <ProductTypeManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <ProductDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/robots"
              element={
                <ProtectedRoute>
                  <RobotMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/robot-monitoring"
              element={
                <ProtectedRoute>
                  <RobotMonitoring />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shelf-management"
              element={
                <ProtectedRoute>
                  <ShelfManagement />
                </ProtectedRoute>
              }
            />

            

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
