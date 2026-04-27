import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Settings as SettingsIcon, CalendarDays, Plus } from 'lucide-react';
import { Sidebar, TransactionModal } from '../../shared/components';
import api from '../../api/axios';
import { useAppData } from '../../shared/context/AppDataContext';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  monthly_allowance?: number;
  created_at: string;
}

interface Transaction {
  id: number;
  type: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  account_id: number;
}

interface Budget {
  id: number;
  name: string;
  icon: string | null;
  budget_amount: number;
  spent_amount: number;
  account_id: number;
}

export const DashboardEnhanced: React.FC = () => {
  const { user, accounts, transactions: allTransactions, salaryPeriod: period, refresh } = useAppData();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>(() => {
    const saved = localStorage.getItem('preferredAccountId');
    return saved ? parseInt(saved) : 'all';
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  // Persist the currently-selected account so BudgetDetailsPage can read it
  const persistAccountForBudgetDetails = (accountId: number | 'all') => {
    if (accountId !== 'all') {
      localStorage.setItem('budgetDetailsAccountId', String(accountId));
    }
  };

  const computeMetrics = (txList: Transaction[], accs: Account[], accountId: number | 'all', periodStart: Date, periodEnd: Date) => {
    const filteredTx = accountId === 'all'
      ? txList
      : txList.filter(t => t.account_id === accountId);

    const spent = filteredTx
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && txDate >= periodStart && txDate <= periodEnd;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    setMonthlySpent(spent);

    // Prefer budgets total for the account as the monthly budget. Fall back to account monthly_allowance.
    const budgetList = accountId === 'all' ? budgets : budgets.filter(b => b.account_id === accountId);
    const budgetSum = budgetList.reduce((s, b) => s + (b.budget_amount || 0), 0);
    const fallbackLimit = accountId === 'all'
      ? accs.reduce((sum, acc) => sum + (acc.monthly_allowance || 0), 0)
      : (accs.find(a => a.id === accountId)?.monthly_allowance || 0);
    setMonthlyLimit(budgetSum > 0 ? budgetSum : fallbackLimit);

    setTransactions(
      [...filteredTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
    );
  };

  useEffect(() => {
    const fetchBudgets = async () => {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      try {
        const budgetsRes = await api.get('/budgets');
        setBudgets(budgetsRes.data);
      } catch (err) {
        if ((err as any).response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };
    fetchBudgets();
  }, [navigate]);

  // Validate stored preferredAccountId against actual accounts; fall back to 'all' if stale
  useEffect(() => {
    if (accounts.length === 0) return;
    const saved = localStorage.getItem('preferredAccountId');
    if (saved) {
      const id = parseInt(saved);
      const exists = accounts.some(a => a.id === id);
      if (!exists) {
        localStorage.removeItem('preferredAccountId');
        setSelectedAccountId('all');
      }
    }
  }, [accounts]);

  // Recompute metrics when account selection or salary period changes
  useEffect(() => {
    if (period.loading) return;
    if (allTransactions.length > 0 || accounts.length > 0) {
      computeMetrics(allTransactions, accounts, selectedAccountId, period.periodStart, period.periodEnd);
    }
    setTransactions(
      [...(selectedAccountId === 'all' ? allTransactions : allTransactions.filter(t => t.account_id === selectedAccountId))]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
    );
  }, [selectedAccountId, period.loading, period.periodStart, allTransactions, accounts, budgets]);

  const handleAccountChange = (accountId: number | 'all') => {
    setSelectedAccountId(accountId);
    if (accountId !== 'all') {
      localStorage.setItem('budgetDetailsAccountId', String(accountId));
      localStorage.setItem('preferredAccountId', String(accountId));
    } else {
      localStorage.removeItem('budgetDetailsAccountId');
      localStorage.removeItem('preferredAccountId');
    }
  };

  const handleTransactionSuccess = async () => {
    await refresh();
    const budgetsRes = await api.get('/budgets');
    setBudgets(budgetsRes.data);
  };

  const now = new Date();
  // Use salary period from hook; fall back to calendar month while loading
  const currentMonthLabel = period.loading
    ? now.toLocaleString('default', { month: 'short' }) + ' ' + now.getFullYear()
    : `${period.periodStart.toLocaleString('default', { month: 'short' })} ${period.periodStart.getDate()} – ${period.periodEnd.toLocaleString('default', { month: 'short' })} ${period.periodEnd.getDate()}`;
  const daysLeft = period.daysLeft;
  const monthProgress = period.periodProgress;
  const dayOfMonth = period.daysElapsed;

  const usagePercentage = monthlyLimit > 0 ? Math.min(Math.round((monthlySpent / monthlyLimit) * 100), 100) : 0;
  const remaining = Math.max(monthlyLimit - monthlySpent, 0);
  const safeToSpendPerDay = daysLeft > 0 ? remaining / daysLeft : 0;
  const dailyAverageSpending = dayOfMonth > 0 ? monthlySpent / dayOfMonth : 0;

  const getIconForCategory = (category: string) => {
    const icons: Record<string, string> = {
      'Subscription': 'subscriptions',
      'Transfer': 'arrow_downward',
      'Shopping': 'shopping_bag',
      'Utilities': 'bolt',
      'Food': 'restaurant',
      'Entertainment': 'movie',
      'Transportation': 'directions_car',
      'Bills': 'receipt',
    };
    return icons[category] || 'receipt_long';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const budgetCategories = selectedAccountId === 'all'
    ? budgets
    : budgets.filter(b => b.account_id === selectedAccountId);

  const totalBudgetSum = budgetCategories.reduce((s, b) => s + b.budget_amount, 0);
  const totalSpentSum = budgetCategories.reduce((s, b) => s + b.spent_amount, 0);
  const totalUtilization = totalBudgetSum > 0 ? Math.min(Math.round((totalSpentSum / totalBudgetSum) * 100), 100) : 0;

  const getBudgetIcon = (icon: string | null, name: string): string => {
    if (icon) return icon;
    const map: Record<string, string> = {
      'Food': 'restaurant', 'Dining': 'restaurant', 'Lunch': 'restaurant', 'Dinner': 'restaurant',
      'Transport': 'directions_car', 'Transportation': 'directions_car', 'Travel': 'flight',
      'Entertainment': 'movie', 'Shopping': 'shopping_bag', 'Groceries': 'shopping_cart',
      'Bills': 'receipt', 'Utilities': 'bolt', 'Healthcare': 'medical_services',
      'Housing': 'home', 'Rent': 'home', 'Savings': 'savings', 'Investment': 'trending_up',
      'Education': 'school', 'Subscriptions': 'subscriptions', 'Subscription': 'subscriptions',
      'Personal Care': 'spa', 'Health': 'favorite', 'Sports': 'sports_gymnastics',
      'Gifts': 'card_giftcard', 'Insurance': 'shield', 'Debt': 'credit_card',
      'Salary': 'payments', 'Income': 'payments', 'Freelance': 'work',
      'Coffee': 'local_cafe', 'Social Life': 'people', 'Social': 'people',
      'Leisure': 'weekend', 'Kids': 'child_care', 'Pets': 'pets',
    };
    return map[name] || 'category';
  };

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#0A0A0A]">
        <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] flex-shrink-0 bg-[#0A0A0A]">
            <div>
              <h1 className="text-2xl font-bold text-white">Good evening, {user?.username || 'admin'}</h1>
              <p className="text-sm text-gray-400 mt-0.5">Here's your financial overview</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-9 py-2 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/50 outline-none cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowAddTxModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl bg-purple-600 hover:bg-purple-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                Transaction
              </button>
            </div>
          </div>

          {/* ── Main content ── */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex gap-5 items-start">

              {/* ────────────────── LEFT — Budget Card ────────────────── */}
              <div className="flex-1 min-w-0 glass-panel rounded-2xl p-6">

                {/* Date row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-white">{currentMonthLabel}</span>
                    <button className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/budget-details')}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Budget Settings
                  </button>
                </div>

                {/* Remaining (Monthly) */}
                <p className="text-xs text-gray-400 mb-1">Remaining (Monthly)</p>
                <p className="text-4xl font-bold text-white mb-5">
                  RM {remaining.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>

                {/* Budget label + usage % */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">
                    Monthly Budget{' '}
                    <span className="text-white font-medium">
                      RM {monthlyLimit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-gray-300">
                    {usagePercentage}%{' '}
                    <span className="text-gray-500 font-normal">Used</span>
                  </p>
                </div>

                {/* Progress bar with Today marker */}
                <div className="relative mt-7 mb-3">
                  {/* Today tooltip */}
                  <div
                    className="absolute -top-6 flex flex-col items-center pointer-events-none"
                    style={{ left: `${Math.min(Math.max(monthProgress, 2), 98)}%`, transform: 'translateX(-50%)' }}
                  >
                    <span className="bg-white text-[#0A0A0A] text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight whitespace-nowrap">
                      Today
                    </span>
                    <div className="w-px h-1.5 bg-white/40 mt-0.5" />
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>

                {/* Exp + Remaining below bar */}
                <div className="flex items-center justify-between mb-8">
                  <span className="text-sm font-medium text-purple-400">Exp. RM {monthlySpent.toFixed(2)}</span>
                  <span className="text-sm text-gray-400">
                    Remaining{' '}
                    <span className="text-white font-medium">RM {remaining.toFixed(2)}</span>
                  </span>
                </div>

                {/* ── Budget Categories Table ── */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Budget Categories</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Total <span className="text-white font-medium">RM {totalBudgetSum.toFixed(2)}</span></span>
                    <button
                      onClick={() => navigate('/budget-details')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/[0.08] transition-all"
                    >
                      Edit Budget
                    </button>
                  </div>
                </div>

                {budgetCategories.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3 block">category</span>
                    <p className="text-gray-400 text-sm">No budgets found{selectedAccountId !== 'all' ? ' for this account' : ''}.</p>
                    <button
                      onClick={() => navigate('/budget-details')}
                      className="mt-4 px-5 py-2 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all"
                    >
                      Create Budget
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1.1fr_20px] gap-x-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                      <span>Category</span>
                      <span className="text-right">Budget</span>
                      <span className="text-right">Spent</span>
                      <span className="text-right">Remaining</span>
                      <span className="text-right">Usage</span>
                      <span />
                    </div>
                    {/* Rows */}
                    <div className="space-y-1.5">
                      {budgetCategories.map((budget, i) => {
                        const pct = budget.budget_amount > 0 ? (budget.spent_amount / budget.budget_amount) * 100 : 0;
                        const isOver = pct > 100;
                        const rem = Math.max(budget.budget_amount - budget.spent_amount, 0);
                        const palettes = [
                          'bg-blue-500/15 text-blue-400',
                          'bg-emerald-500/15 text-emerald-400',
                          'bg-orange-500/15 text-orange-400',
                          'bg-purple-500/15 text-purple-400',
                          'bg-pink-500/15 text-pink-400',
                          'bg-amber-500/15 text-amber-400',
                        ];
                        const ic = palettes[i % palettes.length];
                        return (
                          <div
                            key={budget.id}
                            onClick={() => navigate('/budget-details')}
                            className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1.1fr_20px] gap-x-2 items-center rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.04] px-3 py-2.5 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${ic}`}>
                                <span className="material-symbols-outlined text-[16px]">{getBudgetIcon(budget.icon, budget.name)}</span>
                              </div>
                              <span className="text-sm font-medium text-white truncate">{budget.name}</span>
                            </div>
                            <span className="text-xs text-gray-400 text-right">RM {budget.budget_amount.toFixed(2)}</span>
                            <span className={`text-xs font-medium text-right ${isOver ? 'text-red-400' : budget.spent_amount > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                              RM {budget.spent_amount.toFixed(2)}
                            </span>
                            <span className={`text-xs text-right ${isOver ? 'text-red-400' : 'text-gray-300'}`}>
                              {isOver ? '-' : ''}RM {isOver ? (budget.spent_amount - budget.budget_amount).toFixed(2) : rem.toFixed(2)}
                            </span>
                            <div className="flex items-center justify-end gap-1.5">
                              <span className={`text-[11px] font-medium w-7 text-right flex-shrink-0 ${isOver ? 'text-red-400' : 'text-gray-400'}`}>
                                {Math.round(pct)}%
                              </span>
                              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isOver ? 'bg-red-500' : 'bg-gradient-to-r from-purple-600 to-red-400'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-gray-600 group-hover:text-gray-400 transition-colors text-[16px]">chevron_right</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Total footer */}
                    <div className="mt-3 grid grid-cols-[1.8fr_1fr_1fr_1fr_1.1fr_20px] gap-x-2 items-center px-3 pt-3 border-t border-white/[0.06]">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-xs text-gray-400 text-right">RM {totalBudgetSum.toFixed(2)}</span>
                      <span className="text-xs font-bold text-purple-400 text-right">RM {totalSpentSum.toFixed(2)}</span>
                      <span className="text-xs font-bold text-white text-right">RM {Math.max(totalBudgetSum - totalSpentSum, 0).toFixed(2)}</span>
                      <span className="text-xs font-bold text-white text-right pr-1">{totalUtilization}%</span>
                      <span />
                    </div>
                  </>
                )}
              </div>

              {/* ────────────────── RIGHT — Stats Panel ────────────────── */}
              <div className="w-72 flex-shrink-0 flex flex-col gap-4">

                {/* Safe to Spend Per Day */}
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-tight">
                      Safe to Spend Per Day
                    </p>
                    <ChevronUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">RM {safeToSpendPerDay.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Based on daily average</p>
                </div>

                {/* Daily Average Spending */}
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest leading-tight">
                      Daily Average Spending
                    </p>
                    <ChevronUp className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">RM {dailyAverageSpending.toFixed(2)}</p>
                  {dailyAverageSpending <= safeToSpendPerDay ? (
                    <p className="text-xs text-purple-400">
                      Below budget by RM {(safeToSpendPerDay - dailyAverageSpending).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400">
                      Over budget by RM {(dailyAverageSpending - safeToSpendPerDay).toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Budget Progress circular chart */}
                <div className="glass-panel rounded-2xl p-5">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">Budget Progress</p>
                  <div className="flex flex-col items-center">
                    <div className="relative w-28 h-28">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <defs>
                          <linearGradient id="ringPurpleRed" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#9333ea" />
                            <stop offset="60%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#ef4444" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="url(#ringPurpleRed)"
                          strokeDasharray={`${usagePercentage}, 100`}
                          strokeLinecap="round"
                          strokeWidth="3"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">{usagePercentage}%</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mt-2">
                      of budget used
                    </p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
                    <button
                      onClick={() => navigate('/transactions')}
                      className="text-xs text-purple-400 hover:text-white transition-colors font-medium"
                    >
                      See All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {transactions.map((transaction, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${transaction.type === 'income' ? 'bg-green-500/15' : 'bg-white/[0.06]'}`}>
                          <span className={`material-symbols-outlined text-[16px] ${transaction.type === 'income' ? 'text-green-400' : 'text-gray-400'}`}>
                            {getIconForCategory(transaction.category)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate leading-tight">
                            {transaction.note || transaction.category}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {transaction.category} • {formatDate(transaction.date)}
                          </p>
                        </div>
                        <p className={`text-sm font-semibold flex-shrink-0 ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {transaction.type === 'income' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-4">No recent transactions</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <TransactionModal
        isOpen={showAddTxModal}
        onClose={() => setShowAddTxModal(false)}
        onSuccess={handleTransactionSuccess}
        defaultAccountId={selectedAccountId !== 'all' ? selectedAccountId : undefined}
      />
    </>
  );
};
