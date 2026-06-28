import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import FixedExpenses from './pages/FixedExpenses'
import VariableExpenses from './pages/VariableExpenses'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Boxes from './pages/Boxes'
import SharedGroups from './pages/SharedGroups'
import SharedGroupDetails from './pages/SharedGroupDetails'
import SplashScreen from './pages/SplashScreen'
import InvitePage from './pages/InvitePage'
import ScrollToTop from './utils/scrollToTop'
import { useFinanceStore } from './store/useFinanceStore'
import { useAuth } from './contexts/AuthContext'

// Redirects new users to onboarding if profile is incomplete
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { profile } = useFinanceStore()
  const location = useLocation() // importar do react-router-dom

  if (loading) return <SplashScreen />

  // Don't redirect on invite pages
  if (location.pathname.startsWith('/invite')) return <>{children}</>

  if (user && profile !== null && !profile?.netSalary) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

export default function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (booting) return <SplashScreen />

  return (
    <AuthProvider>
      <ScrollToTop />

      <Routes>

        {/* Public — invite page (accessible without login) */}
        <Route path="/invite/:token" element={<InvitePage />} />

        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Onboarding — protected but full screen (no AppLayout) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Main app — protected + onboarding guard */}
        <Route
          element={
            <ProtectedRoute>
              <OnboardingGuard>
                <AppLayout />
              </OnboardingGuard>
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/fixed" element={<FixedExpenses />} />
          <Route path="/variable" element={<VariableExpenses />} />
          <Route path="/boxes" element={<Boxes />} />
          <Route path="/shared" element={<SharedGroups />} />
          <Route path="/shared/:groupId" element={<SharedGroupDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

      </Routes>
    </AuthProvider>
  )
}