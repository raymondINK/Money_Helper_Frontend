import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../shared/components';
import api from '../../api/axios';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
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

export const DashboardEnhanced: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlySpent, setMonthlySpent] = useState(3240);
  const [monthlyLimit, setMonthlyLimit] = useState(4500);
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [userRes, accountsRes, transactionsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/accounts'),
          api.get('/transactions')
        ]);

        setUser(userRes.data);
        setAccounts(accountsRes.data);
        setTransactions(transactionsRes.data.slice(0, 4));

        const currentMonth = new Date().getMonth();
        const spent = transactionsRes.data
          .filter((t: Transaction) => {
            const txDate = new Date(t.date);
            return t.type === 'expense' && txDate.getMonth() === currentMonth;
          })
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        setMonthlySpent(spent);

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

  const usagePercentage = Math.round((monthlySpent / monthlyLimit) * 100);
  const remaining = monthlyLimit - monthlySpent;
  const safeToSpendPerDay = 42.00;
  const dailyAverageSpending = 54.00;

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

  const budgetCategories = [
    { name: 'Food & Dining', spent: 450, budget: 600, color: '#00FF88' },
    { name: 'Transportation', spent: 280, budget: 400, color: '#A855F7' },
    { name: 'Entertainment', spent: 195, budget: 250, color: '#3B82F6' },
    { name: 'Shopping', spent: 520, budget: 500, color: '#EF4444' },
    { name: 'Bills & Utilities', spent: 380, budget: 450, color: '#F59E0B' },
    { name: 'Healthcare', spent: 120, budget: 300, color: '#10B981' },
  ];

  return (
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
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="layout-content-container mx-auto flex max-w-[1200px] flex-col gap-8 p-6 lg:p-12">
            {/* Monthly Allowance Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Monthly Allowance Card */}
              <div className="glass-panel relative col-span-1 lg:col-span-2 overflow-hidden rounded-3xl p-8 border-2 border-[#00FF88]/30">
                <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[#00FF88]/10 blur-[80px]"></div>
                <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-primary/10 blur-[80px]"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">Monthly Allowance</p>
                    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 border border-white/10">
                      <span className="material-symbols-outlined text-sm text-gray-400">calendar_month</span>
                      <span className="text-sm font-medium text-white">Oct 2023</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Spent */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Spent</p>
                      <p className="text-5xl font-bold text-white tracking-tight">${monthlySpent.toLocaleString()}</p>
                    </div>

                    {/* Progress Ring */}
                    <div className="relative flex items-center justify-center">
                      <svg className="w-44 h-44" viewBox="0 0 36 36">
                        <path
                          className="text-gray-800"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        />
                        <path
                          className="text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray={`${usagePercentage}, 100`}
                          strokeLinecap="round"
                          strokeWidth="2.5"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white">{usagePercentage}%</span>
                        <span className="text-xs text-[#00FF88] uppercase tracking-widest font-bold">Used</span>
                      </div>
                    </div>

                    {/* Remaining */}
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Remaining</p>
                      <p className="text-5xl font-bold text-white tracking-tight">${remaining.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Metrics Cards */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Safe to Spend Per Day */}
                <div className="glass-panel rounded-2xl p-6 border border-white/5">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Safe to Spend Per Day</p>
                    <span className="material-symbols-outlined text-[#00FF88] text-xl">trending_up</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-2">${safeToSpendPerDay.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">On track for month end.</p>
                </div>

                {/* Daily Average Spending */}
                <div className="glass-panel rounded-2xl p-6 border-2 border-red-500/30 bg-red-500/5">
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Daily Average Spending</p>
                    <span className="material-symbols-outlined text-red-400 text-xl">trending_down</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-2">${dailyAverageSpending.toFixed(2)}</p>
                  <p className="text-xs text-red-400">Over budget by ${(dailyAverageSpending - safeToSpendPerDay).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Central Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-gray-500">
                <span>Month Progress</span>
                <span>Day 13 of 28</span>
              </div>
              <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-[#00FF88] shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                  style={{ width: '46%' }}
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
                          <div className={`flex size-12 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <span className={`material-symbols-outlined ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                              {getIconForCategory(transaction.category)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{transaction.note || transaction.category}</p>
                            <p className="text-xs text-gray-400">{transaction.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-[#00FF88]' : 'text-white'}`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
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
                    className="text-sm font-medium text-[#00FF88] hover:text-white transition-colors"
                  >
                    See All
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {transactions.map((transaction, idx) => (
                    <div key={idx} className="group flex items-center justify-between rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`flex size-10 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          <span className={`material-symbols-outlined text-[20px] ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                            {getIconForCategory(transaction.category)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{transaction.note || transaction.category}</p>
                          <p className="text-xs text-gray-400">{transaction.category} • {formatDate(transaction.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-[#00FF88]' : 'text-white'}`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget Categories Section */}
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute -right-20 -bottom-20 size-64 rounded-full bg-[#00FF88]/10 blur-[80px]"></div>
              <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-primary/10 blur-[80px]"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Budget Categories</h3>
                  <button
                    onClick={() => navigate('/budget')}
                    className="text-sm font-medium text-[#00FF88] hover:text-white transition-colors"
                  >
                    Edit Budget
                  </button>
                </div>

                <div className="space-y-6">
                  {budgetCategories.map((category, idx) => {
                    const percentage = (category.spent / category.budget) * 100;
                    const isOverBudget = percentage > 100;

                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{category.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">
                              ${category.spent.toFixed(2)} / ${category.budget.toFixed(2)}
                            </span>
                            <span className={`text-sm font-bold ${isOverBudget ? 'text-red-400' : 'text-[#00FF88]'}`}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isOverBudget
                              ? 'bg-gradient-to-r from-red-500 to-red-400'
                              : 'bg-gradient-to-r from-[#00FF88] to-[#00CC6A]'
                              }`}
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                              boxShadow: isOverBudget
                                ? '0 0 10px rgba(239, 68, 68, 0.6)'
                                : '0 0 10px rgba(0, 255, 136, 0.6)'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-[#00FF88] animate-pulse"
                        style={{ boxShadow: '0 0 10px rgba(0, 255, 136, 0.8)' }}></div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">Total Budget Utilization</span>
                    </div>
                    <span className="text-lg font-bold text-white">72%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Neon Accent Line */}
            <div className="mt-8 flex justify-center pb-8">
              <div className="h-0.5 w-1/3 bg-gradient-to-r from-transparent via-[#00FF88] to-transparent shadow-[0_0_15px_rgba(0,255,136,0.8)] opacity-50"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
