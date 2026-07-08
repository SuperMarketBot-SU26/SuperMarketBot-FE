import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdvertisementDashboard from './pages/AdvertisementDashboard'
import AdvertisementCreation from './pages/AdvertisementCreation'
import AdvertisementUpdate from './pages/AdvertisementUpdate'
import AdPackageCreation from './pages/AdPackageCreation'
import BrandDashboard from './pages/BrandDashboard'
import BrandCreation from './pages/BrandCreation'
import BrandUpdate from './pages/BrandUpdate'
import BrandWallet from './pages/BrandWallet'
import Forbidden from './pages/Forbidden'
import Login from './pages/Login'
import ProductManagement from './pages/ProductManagement'
import ProductDetail from './pages/ProductDetail'
import ParameterSettings from './pages/ParameterSettings'
import Register from './pages/Register'
import RobotMonitoring from './pages/RobotMonitoring'
import { AuthProvider } from './features/auth/AuthContext'
import ProtectedRoute from './features/auth/ProtectedRoute'

/**
 * App routing
 *
 * Public routes (no auth required):
 *   /login, /register
 *
 * Everything else is wrapped in <ProtectedRoute>. A user who isn't logged in
 * gets bounced to /login with the original destination preserved in
 * location.state.from, so the login page can redirect them back after auth.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {/* Protected — wraps every page that needs an authenticated user */}
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
            path="/advertisement/update/:id"
            element={
              <ProtectedRoute>
                <AdvertisementUpdate />
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
            path="/algorithm-settings"
            element={
              <ProtectedRoute>
                <ParameterSettings />
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
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetail />
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

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App