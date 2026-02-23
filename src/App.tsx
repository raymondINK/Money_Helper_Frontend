import React from 'react'
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardEnhanced />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/budget" element={<BudgetPage standalone />} />
        <Route path="/budget-details" element={<BudgetDetailsPage />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  )
}

export default App

