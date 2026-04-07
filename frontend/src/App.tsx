import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ParticleField from './components/backgrounds/ParticleField'
import DashboardLayout from './components/layout/DashboardLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ToastContainer from './components/ui/Toast'
import { useAuthStore } from './stores/authStore'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const TripsPage = lazy(() => import('./pages/TripsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            className="w-2 h-2 rounded-full bg-flux-blue"
          />
        ))}
      </div>
    </div>
  )
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const { isAuthenticated, token, fetchMe } = useAuthStore()

  // Rehydrate user on mount if token exists
  useEffect(() => {
    if (token && !useAuthStore.getState().user) {
      fetchMe()
    }
  }, [])

  return (
    <>
      <ParticleField />
      <ToastContainer />

      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            {/* Public */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <PageTransition>
                    <LoginPage />
                  </PageTransition>
                )
              }
            />

            {/* Protected layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route
                path="/dashboard"
                element={
                  <PageTransition>
                    <DashboardPage />
                  </PageTransition>
                }
              />
              <Route
                path="/trips"
                element={
                  <PageTransition>
                    <TripsPage />
                  </PageTransition>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
                    <PageTransition>
                      <ReportsPage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <PageTransition>
                      <AdminPage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  )
}
