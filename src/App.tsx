import React, { type ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './features/auth'
import { HomePage } from './features/home/HomePage'
import { DashboardEnhanced } from './features/dashboard/DashboardEnhanced'
import AccountsPage from './features/accounts'
import TransactionsPage from './features/transactions'
import StatsPage from './features/stats'
import BudgetPage from './features/budget'
import SettingsPage from './features/settings'
import RecurringPage from './features/recurring'
import BudgetDetailsPage from './features/budget/BudgetDetailsPage'
import AccountDetailsPage from './features/accounts/AccountDetailsPage'

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
  return (
    <Router>
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
    </Router>
  )
}

export default App
