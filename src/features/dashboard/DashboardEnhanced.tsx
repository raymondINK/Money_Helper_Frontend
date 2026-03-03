import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../shared/components';
import api from '../../api/axios';

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
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txForm, setTxForm] = useState({ type: 'expense', category: '', amount: '', note: '', date: new Date().toISOString().split('T')[0], account_id: '' });
  const [txSaving, setTxSaving] = useState(false);
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

  const computeMetrics = (txList: Transaction[], accs: Account[], accountId: number | 'all') => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredTx = accountId === 'all'
      ? txList
      : txList.filter(t => t.account_id === accountId);

    const spent = filteredTx
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    setMonthlySpent(spent);

    const limit = accountId === 'all'
      ? accs.reduce((sum, acc) => sum + (acc.monthly_allowance || 0), 0)
      : (accs.find(a => a.id === accountId)?.monthly_allowance || 0);
    setMonthlyLimit(limit);

    setTransactions(filteredTx.slice(0, 4));
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [userRes, accountsRes, transactionsRes, budgetsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/accounts'),
          api.get('/transactions'),
          api.get('/budgets'),
        ]);

        setUser(userRes.data);
        setAccounts(accountsRes.data);
        setAllTransactions(transactionsRes.data);
        setBudgets(budgetsRes.data);

        computeMetrics(transactionsRes.data, accountsRes.data, 'all');

      } catch (err) {
        console.error(err);
        if ((err as any).response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    fetchData();
  }, [navigate]);

  // Recompute metrics when account selection changes
  useEffect(() => {
    if (allTransactions.length > 0 || accounts.length > 0) {
      computeMetrics(allTransactions, accounts, selectedAccountId);
    }
  }, [selectedAccountId]);

  const handleAccountChange = (accountId: number | 'all') => {
    setSelectedAccountId(accountId);
    if (accountId !== 'all') {
      localStorage.setItem('budgetDetailsAccountId', String(accountId));
    } else {
      localStorage.removeItem('budgetDetailsAccountId');
    }
  };

  const handleAddTransaction = async () => {
    if (!txForm.category || !txForm.amount || !txForm.account_id) return;
    setTxSaving(true);
    try {
      await api.post('/transactions', {
        type: txForm.type,
        category: txForm.category,
        amount: parseFloat(txForm.amount),
        note: txForm.note,
        date: txForm.date,
        account_id: parseInt(txForm.account_id),
      });
      // Refresh transactions and budgets
      const [transactionsRes, budgetsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/budgets'),
      ]);
      setAllTransactions(transactionsRes.data);
      setBudgets(budgetsRes.data);
      computeMetrics(transactionsRes.data, accounts, selectedAccountId);
      setShowAddTxModal(false);
      setTxForm({ type: 'expense', category: '', amount: '', note: '', date: new Date().toISOString().split('T')[0], account_id: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setTxSaving(false);
    }
  };

  const now = new Date();
  const currentMonthLabel = now.toLocaleString('default', { month: 'short' }) + ' ' + now.getFullYear();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

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
      'Food': 'restaurant', 'Dining': 'restaurant', 'Transport': 'directions_car',
      'Transportation': 'directions_car', 'Entertainment': 'movie', 'Shopping': 'shopping_bag',
      'Bills': 'receipt', 'Utilities': 'bolt', 'Healthcare': 'medical_services',
      'Housing': 'home', 'Groceries': 'shopping_cart', 'Savings': 'savings',
    };
    return map[name] || 'category';
  };

  return (
    <>
      <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
        <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 z-10 flex h-20 w-full items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md px-6 lg:px-12">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold tracking-tight text-white">Good evening, {user?.username || 'Alex'}</h2>
                <p className="text-sm text-gray-400">Financial overview in the cosmos.</p>
              </div>
              <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button className="px-5 py-1.5 text-sm font-medium text-white bg-white/10 shadow-sm rounded-lg border border-white/10">
                  Overview
                </button>
                <button
                  onClick={() => navigate('/budget-details')}
                  className="px-5 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-all rounded-lg"
                >
                  Budget Details
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {/* Account Selector */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">account_balance_wallet</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all cursor-pointer"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
              </div>
              {/* Add Transaction Button */}
              <button
                onClick={() => {
                  setTxForm(prev => ({ ...prev, account_id: selectedAccountId !== 'all' ? String(selectedAccountId) : accounts[0] ? String(accounts[0].id) : '' }));
                  setShowAddTxModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Transaction
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="layout-content-container mx-auto flex max-w-[1200px] flex-col gap-8 p-6 lg:p-12">
              {/* Monthly Allowance Section */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Monthly Allowance Card */}
                <div className="glass-panel relative col-span-1 lg:col-span-2 overflow-hidden rounded-3xl p-8 border-2 border-purple-500/30">
                  <div className="absolute -right-20 -top-20 size-64 rounded-full bg-purple-500/10 blur-[80px]"></div>
                  <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-purple-700/10 blur-[80px]"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">Monthly Allowance</p>
                      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                        <span className="material-symbols-outlined text-sm text-gray-400">calendar_month</span>
                        <span className="text-sm font-medium text-white">{currentMonthLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Spent */}
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Spent</p>
                        <p className="text-5xl font-bold text-white tracking-tight">RM {monthlySpent.toLocaleString()}</p>
                      </div>

                      <div className="relative flex items-center justify-center">
                        <svg className="w-44 h-44" viewBox="0 0 36 36">
                          <defs>
                            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#A855F7" />
                              <stop offset="100%" stopColor="#C084FC" />
                            </linearGradient>
                          </defs>
                          <path
                            className="text-gray-800"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="url(#ringGrad)"
                            strokeDasharray={`${usagePercentage}, 100`}
                            strokeLinecap="round"
                            strokeWidth="2.5"
                            style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.8))' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-white">{usagePercentage}%</span>
                          <span className="text-xs text-purple-400 uppercase tracking-widest font-bold">Used</span>
                        </div>
                      </div>

                      {/* Remaining */}
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Remaining</p>
                        <p className="text-5xl font-bold text-white tracking-tight">RM {remaining.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Metrics Cards */}
                <div className="flex flex-col gap-6 lg:col-span-1">
                  {/* Safe to Spend Per Day */}
                  <div className="glass-panel rounded-2xl p-6 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Safe to Spend Per Day</p>
                      <span className="material-symbols-outlined text-purple-400 text-xl">trending_up</span>
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">RM {safeToSpendPerDay.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">On track for month end.</p>
                  </div>

                  {/* Daily Average Spending */}
                  <div className="glass-panel rounded-2xl p-6 border-2 border-red-500/30 bg-red-500/5">
                    <div className="flex items-start justify-between mb-4">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Daily Average Spending</p>
                      <span className="material-symbols-outlined text-red-400 text-xl">trending_down</span>
                    </div>
                    <p className="text-4xl font-bold text-white mb-2">RM {dailyAverageSpending.toFixed(2)}</p>
                    <p className="text-xs text-red-400">{dailyAverageSpending > safeToSpendPerDay ? `Over budget by RM${(dailyAverageSpending - safeToSpendPerDay).toFixed(2)}` : 'Within budget'}</p>
                  </div>
                </div>
              </div>

              {/* Central Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-gray-500">
                  <span>Month Progress</span>
                  <span>Day {dayOfMonth} of {daysInMonth}</span>
                </div>
                <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-purple-700 via-purple-500 to-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                    style={{ width: `${monthProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Recent Transactions & Activity */}
              <div className="grid gap-8 lg:grid-cols-3">
                {/* Recent Transactions */}
                <div className="lg:col-span-2">
                  <div className="glass-panel rounded-3xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6">Recent Transactions</h3>
                    <div className="space-y-4">
                      {transactions.slice(0, 2).map((transaction, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
                          <div className="flex items-center gap-4">
                            <div className={`flex size-12 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                              <span className={`material-symbols-outlined ${transaction.type === 'income' ? 'text-purple-400' : 'text-red-400'}`}>
                                {getIconForCategory(transaction.category)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{transaction.note || transaction.category}</p>
                              <p className="text-xs text-gray-400">{transaction.category}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-purple-400' : 'text-white'}`}>
                              {transaction.type === 'income' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Recent Activity</h3>
                    <button
                      onClick={() => navigate('/transactions')}
                      className="text-sm font-medium text-purple-400 hover:text-white transition-colors"
                    >
                      See All
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {transactions.map((transaction, idx) => (
                      <div key={idx} className="group flex items-center justify-between rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-4">
                          <div className={`flex size-10 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                            <span className={`material-symbols-outlined text-[20px] ${transaction.type === 'income' ? 'text-purple-400' : 'text-red-400'}`}>
                              {getIconForCategory(transaction.category)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{transaction.note || transaction.category}</p>
                            <p className="text-xs text-gray-400">{transaction.category} • {formatDate(transaction.date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-purple-400' : 'text-white'}`}>
                            {transaction.type === 'income' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Categories Section */}
              <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute -right-20 -bottom-20 size-64 rounded-full bg-purple-500/10 blur-[80px]"></div>
                <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-purple-700/10 blur-[80px]"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Budget Categories</h3>
                    <button
                      onClick={() => navigate('/budget-details')}
                      className="text-sm font-medium text-purple-400 hover:text-white transition-colors"
                    >
                      Edit Budget
                    </button>
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
                    <div className="space-y-6">
                      {budgetCategories.map((budget) => {
                        const percentage = budget.budget_amount > 0 ? (budget.spent_amount / budget.budget_amount) * 100 : 0;
                        const isOverBudget = percentage > 100;

                        return (
                          <div key={budget.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-400 text-sm">{getBudgetIcon(budget.icon, budget.name)}</span>
                                <span className="text-sm font-medium text-white">{budget.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400">
                                  RM {budget.spent_amount.toFixed(2)} / RM {budget.budget_amount.toFixed(2)}
                                </span>
                                <span className={`text-sm font-bold ${isOverBudget ? 'text-red-400' : 'text-purple-400'}`}>
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>

                            <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverBudget
                                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                                  : 'bg-gradient-to-r from-purple-700 via-purple-500 to-purple-300'
                                  }`}
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                  boxShadow: isOverBudget
                                    ? '0 0 10px rgba(239, 68, 68, 0.6)'
                                    : '0 0 10px rgba(168, 85, 247, 0.6)'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {budgetCategories.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-purple-500 animate-pulse"
                            style={{ boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)' }}></div>
                          <span className="text-xs text-gray-400 uppercase tracking-wider">Total Budget Utilization</span>
                        </div>
                        <span className="text-lg font-bold text-white">{totalUtilization}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Neon Accent Line */}
              <div className="mt-8 flex justify-center pb-8">
                <div className="h-0.5 w-1/3 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)] opacity-50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[480px] rounded-3xl overflow-hidden flex flex-col" style={{
            background: 'rgba(10,10,10,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 30px rgba(168,85,247,0.2)'
          }}>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Add Transaction</h2>
                <p className="text-gray-400 text-sm mt-0.5">Record a new transaction.</p>
              </div>
              <button onClick={() => setShowAddTxModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Type */}
              <div className="flex gap-2">
                {['expense', 'income'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTxForm(prev => ({ ...prev, type: t }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${txForm.type === t
                      ? t === 'income' ? 'bg-purple-600 text-white' : 'bg-red-600/80 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >{t}</button>
                ))}
              </div>
              {/* Account */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</label>
                <div className="relative">
                  <select
                    value={txForm.account_id}
                    onChange={(e) => setTxForm(prev => ({ ...prev, account_id: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/50 outline-none"
                  >
                    <option value="">Select account</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
                </div>
              </div>
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Food, Shopping, Salary..."
                  value={txForm.category}
                  onChange={(e) => setTxForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 outline-none"
                />
              </div>
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount (RM)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">RM</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={txForm.amount}
                    onChange={(e) => setTxForm(prev => ({ ...prev, amount: e.target.value.replace(/[^0-9.]/g, '') }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 outline-none"
                  />
                </div>
              </div>
              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Note (optional)</label>
                <input
                  type="text"
                  placeholder="What was this for?"
                  value={txForm.note}
                  onChange={(e) => setTxForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-purple-500/50 outline-none"
                />
              </div>
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="p-6 pt-2 flex gap-3">
              <button onClick={() => setShowAddTxModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all">Cancel</button>
              <button
                onClick={handleAddTransaction}
                disabled={txSaving}
                className="flex-[2] py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', boxShadow: '0 4px 15px rgba(168,85,247,0.4)' }}
              >
                {txSaving ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">add_circle</span>}
                {txSaving ? 'Saving...' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
