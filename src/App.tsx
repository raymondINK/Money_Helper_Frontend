import React, { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

const Login = lazy(() =>
  import('./features/auth').then((mod) => ({ default: mod.Login })),
)
const HomePage = lazy(() =>
  import('./features/home/HomePage').then((mod) => ({ default: mod.HomePage })),
)
const DashboardEnhanced = lazy(() =>
  import('./features/dashboard/DashboardEnhanced').then((mod) => ({
    default: mod.DashboardEnhanced,
  })),
)
const AccountsPage = lazy(() => import('./features/accounts'))
const AccountDetailsPage = lazy(() => import('./features/accounts/AccountDetailsPage'))
const TransactionsPage = lazy(() => import('./features/transactions'))
const StatsPage = lazy(() => import('./features/stats'))
const BudgetPage = lazy(() => import('./features/budget'))
const BudgetDetailsPage = lazy(() => import('./features/budget/BudgetDetailsPage'))
const RecurringPage = lazy(() => import('./features/recurring'))
const SettingsPage = lazy(() => import('./features/settings'))

const isAuthenticated = () => Boolean(localStorage.getItem('token'))

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const AuthRedirect = () => (
  <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />
)

function App() {
  const fallback = (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 flex items-center justify-center">
      Loading...
    </div>
  )

  return (
    <Router>
      <Suspense fallback={fallback}>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardEnhanced />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account-details/:id"
            element={
              <ProtectedRoute>
                <AccountDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stats"
            element={
              <ProtectedRoute>
                <StatsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <ProtectedRoute>
                <BudgetPage standalone />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budget-details"
            element={
              <ProtectedRoute>
                <BudgetDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring"
            element={
              <ProtectedRoute>
                <RecurringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<AuthRedirect />} />
          <Route path="*" element={<AuthRedirect />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
