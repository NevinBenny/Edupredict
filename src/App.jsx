import { Navigate, Route, Routes } from 'react-router-dom'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import GoogleCallback from './pages/auth/GoogleCallback'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'
import AuthLayout from './pages/auth/AuthLayout'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import StudentsPage from './pages/dashboard/StudentsPage'
import AIRiskPrediction from './pages/dashboard/AIRiskPrediction'
import Reports from './pages/dashboard/Reports'
import Interventions from './pages/dashboard/Interventions'
import UserAccount from './pages/UserAccount'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import SystemSettings from './pages/admin/SystemSettings'
import FacultyManagement from './pages/admin/FacultyManagement'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login"
          element={
            <AuthLayout heading="Welcome back">
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route path="/auth/admin-login"
          element={
            <AuthLayout heading="Admin Access">
              <AdminLoginPage />
            </AuthLayout>
          }
        />
        <Route path="/auth/signup"
          element={
            <AuthLayout heading="Create account">
              <SignupPage />
            </AuthLayout>
          }
        />
        <Route path="/auth/forgot"
          element={
            <AuthLayout heading="Reset access">
              <ForgotPasswordPage />
            </AuthLayout>
          }
        />
        <Route path="/welcome" element={<GoogleCallback />} />
        <Route path="/auth/reset"
          element={
            <AuthLayout heading="Create a new password">
              <ResetPasswordPage />
            </AuthLayout>
          }
        />
        <Route path="/auth/change-password"
          element={
            <AuthLayout heading="Update Password">
              <ChangePasswordPage />
            </AuthLayout>
          }
        />

        {/* User Dashboard - Protected for USER role */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="USER">
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="ai-risk" element={<AIRiskPrediction />} />
          <Route path="interventions" element={<Interventions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Reports />} /> {/* Placeholder for now */}
          <Route path="account" element={<UserAccount />} />
        </Route>

        {/* Admin Panel - Protected for ADMIN role */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="faculty" element={<FacultyManagement />} />
          <Route path="settings" element={<SystemSettings />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
