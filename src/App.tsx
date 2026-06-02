import React, { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
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
import ScrollToTop from './utils/scrollToTop'

export default function App() {
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    async function init() {
      // aqui você coloca tudo que trava o app no início
      // exemplo: auth, firebase, store hydration etc

      await new Promise((r) => setTimeout(r, 1200)) // placeholder

      setBooting(false)
    }

    init()
  }, [])

  if (booting) {
    return <SplashScreen />
  }

  return (
    <AuthProvider>
      <ScrollToTop />
      
      <Routes>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
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