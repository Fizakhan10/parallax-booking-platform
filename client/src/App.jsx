import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardPage from './pages/OnboardPage'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import DashboardUsers from './pages/dashboard/DashboardUsers'
import DashboardSettings from './pages/dashboard/DashboardSettings'
import BookingsPage from './pages/dashboard/BookingsPage'
import BookingDetailPage from './pages/dashboard/BookingDetailPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="page-loader"><div className="spinner spinner-lg" /></div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="page-loader"><div className="spinner spinner-lg" /></div>
  )
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '10px',
              border: '1px solid #334155',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/onboard"  element={<PublicRoute><OnboardPage /></PublicRoute>} />

          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index              element={<DashboardHome />} />
            <Route path="bookings"    element={<BookingsPage />} />
            <Route path="bookings/:id" element={<BookingDetailPage />} />
            <Route path="users"       element={<DashboardUsers />} />
            <Route path="settings"    element={<DashboardSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
