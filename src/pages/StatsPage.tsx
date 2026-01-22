import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BudgetPage from './BudgetPage';
import api from '../api/axios';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Filter, 
  Calendar, ChevronDown, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

type TabType = 'stats' | 'budget' | 'note';
type TimeFilter = 'week' | 'month' | 'year' | 'all';

interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string;
  account_id: number;
}

interface Account {
  id: number;
  name: string;
  balance: number;
  monthly_allowance?: number;
}

interface Budget {
  id: number;
  name: string;
  icon: string;
  budget_amount: number;
  account_id: number;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const StatsPage = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Filters
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      const [userRes, transactionsRes, accountsRes, budgetsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/transactions?limit=1000'),
        api.get('/accounts'),
        api.get('/budgets')
      ]);

      setUser(userRes.data);
      setTransactions(transactionsRes.data);
      setAccounts(accountsRes.data);
      setBudgets(budgetsRes.data);
    } catch (err) {
      console.error(err);
      if ((err as any).response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    const now = new Date();

    // Time filter
    if (timeFilter !== 'all') {
      const startDate = new Date();
      if (timeFilter === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeFilter === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeFilter === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.end));
    }

    // Account filter
    if (selectedAccountId !== 'all') {
      filtered = filtered.filter(t => t.account_id === selectedAccountId);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    return filtered;
  }, [transactions, timeFilter, selectedAccountId, selectedCategory, dateRange]);

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Get all unique categories
  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category || 'Other'));
    return Array.from(cats);
  }, [transactions]);

  // Category breakdown for pie chart
  const categoryData = useMemo(() => {
    const breakdown = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const cat = t.category || 'Other';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(breakdown)
      .map(([name, value], index) => ({
        name,
        value: value as number,
        color: COLORS[index % COLORS.length],
        budget: budgets.find(b => b.name === name)?.budget_amount || 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, budgets]);

  // Income vs Expense trend data
  const trendData = useMemo(() => {
    const grouped: Record<string, { date: string; income: number; expense: number }> = {};
    
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      let key: string;
      
      if (timeFilter === 'week') {
        key = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
      } else if (timeFilter === 'month') {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: key, income: 0, expense: 0 };
      }
      
      if (t.type === 'income') {
        grouped[key].income += t.amount;
      } else {
        grouped[key].expense += t.amount;
      }
    });

    return Object.values(grouped).slice(-12);
  }, [filteredTransactions, timeFilter]);

  // Wallet summary
  const walletSummary = useMemo(() => {
    return accounts.map(acc => {
      const accTransactions = filteredTransactions.filter(t => t.account_id === acc.id);
      const spent = accTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const earned = accTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const allowance = acc.monthly_allowance || 0;
      const percentUsed = allowance > 0 ? (spent / allowance) * 100 : 0;

      return {
        ...acc,
        spent,
        earned,
        percentUsed: Math.min(percentUsed, 100),
        remaining: allowance - spent
      };
    });
  }, [accounts, filteredTransactions]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'stats', label: 'Analytics' },
    { key: 'budget', label: 'Budget' },
    { key: 'note', label: 'Notes' },
  ];

  const renderWalletSummary = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {walletSummary.map(wallet => (
        <div key={wallet.id} className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Wallet className="text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white">{wallet.name}</h3>
                <p className="text-xs text-slate-500">Current Balance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">
                RM {wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {wallet.monthly_allowance && wallet.monthly_allowance > 0 && (
            <>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Monthly Allowance</span>
                <span className="text-slate-300">RM {wallet.monthly_allowance.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-[#0f1115] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    wallet.percentUsed >= 90 ? 'bg-red-500' : 
                    wallet.percentUsed >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${wallet.percentUsed}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className={wallet.percentUsed >= 90 ? 'text-red-400' : 'text-slate-400'}>
                  {wallet.percentUsed.toFixed(1)}% used
                </span>
                <span className={wallet.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  RM {Math.abs(wallet.remaining).toLocaleString()} {wallet.remaining < 0 ? 'over' : 'remaining'}
                </span>
              </div>
            </>
          )}

          <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="text-emerald-400" size={14} />
              <span className="text-sm text-slate-400">
                +RM {wallet.earned.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowDownRight className="text-red-400" size={14} />
              <span className="text-sm text-slate-400">
                -RM {wallet.spent.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCategoryBreakdown = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Pie Chart */}
      <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          Spending Distribution
        </h3>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`RM ${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: '#1a1d24', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-slate-500">
            No expense data available
          </div>
        )}
      </div>

      {/* Category List with Budget Comparison */}
      <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          Category Breakdown
        </h3>
        <div className="space-y-3 max-h-[280px] overflow-y-auto">
          {categoryData.map((cat) => {
            const isOverBudget = cat.budget > 0 && cat.value > cat.budget;
            const budgetPercent = cat.budget > 0 ? (cat.value / cat.budget) * 100 : 0;
            
            return (
              <div key={cat.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-slate-300">{cat.name}</span>
                    {isOverBudget && (
                      <AlertTriangle className="text-red-400" size={14} />
                    )}
                  </div>
                  <div className="text-right">
                    <span className={isOverBudget ? 'text-red-400' : 'text-slate-300'}>
                      RM {cat.value.toLocaleString()}
                    </span>
                    {cat.budget > 0 && (
                      <span className="text-slate-500 text-xs ml-2">
                        / RM {cat.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-[#0f1115] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverBudget ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'
                    }`}
                    style={{ width: `${Math.min(budgetPercent || (cat.value / totalExpense) * 100, 100)}%` }}
                  />
                </div>
                {cat.budget > 0 && (
                  <div className="text-xs text-slate-500">
                    {isOverBudget 
                      ? `RM ${(cat.value - cat.budget).toLocaleString()} over budget`
                      : `RM ${(cat.budget - cat.value).toLocaleString()} remaining`
                    }
                  </div>
                )}
              </div>
            );
          })}
          {categoryData.length === 0 && (
            <div className="text-slate-500 text-center py-8">No expense data available</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTrendChart = () => (
    <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          Income vs Expense Trend
        </h3>
        <div className="flex gap-2">
          {(['week', 'month', 'year', 'all'] as TimeFilter[]).map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                timeFilter === filter 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {trendData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis 
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => [`RM ${value.toLocaleString()}`, '']}
              contentStyle={{ 
                backgroundColor: '#1a1d24', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              stroke="#10B981" 
              fill="url(#incomeGradient)"
              strokeWidth={2}
              name="Income"
            />
            <Area 
              type="monotone" 
              dataKey="expense" 
              stroke="#EF4444" 
              fill="url(#expenseGradient)"
              strokeWidth={2}
              name="Expense"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-slate-500">
          No transaction data available
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className={`mb-6 overflow-hidden transition-all ${showFilters ? 'max-h-96' : 'max-h-0'}`}>
      <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Custom Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Wallet Filter */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Wallet</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Wallets</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={() => {
            setSelectedAccountId('all');
            setSelectedCategory('all');
            setDateRange({ start: '', end: '' });
            setTimeFilter('month');
          }}
          className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-sm transition-all flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Reset Filters
        </button>
      </div>
    </div>
  );

  const renderStatsContent = () => (
    <div className="p-6 overflow-y-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-emerald-400" size={18} />
            <span className="text-sm text-emerald-400">Total Income</span>
          </div>
          <div className="text-2xl font-bold text-white">
            +RM {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="text-red-400" size={18} />
            <span className="text-sm text-red-400">Total Expenses</span>
          </div>
          <div className="text-2xl font-bold text-white">
            -RM {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-blue-400" size={18} />
            <span className="text-sm text-blue-400">Net Balance</span>
          </div>
          <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            RM {(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-purple-400" size={18} />
            <span className="text-sm text-purple-400">Transactions</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {filteredTransactions.length}
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="mb-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-sm transition-all flex items-center gap-2"
      >
        <Filter size={16} />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
        <ChevronDown className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} size={14} />
      </button>

      {renderFilters()}

      {/* Wallet Summary */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Wallet size={20} />
        Wallet Summary
      </h2>
      {renderWalletSummary()}

      {/* Income vs Expense Trend */}
      {renderTrendChart()}

      {/* Category Breakdown */}
      {renderCategoryBreakdown()}
    </div>
  );

  const renderNoteContent = () => (
    <div className="p-6">
      <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-semibold text-white mb-2">Notes Coming Soon</h3>
        <p className="text-slate-400">
          Keep track of your financial notes and reminders here.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header with Tabs */}
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Analytics & Budget</h1>
            <button
              onClick={loadData}
              className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {activeTab === 'stats' && renderStatsContent()}
              {activeTab === 'budget' && <BudgetPage />}
              {activeTab === 'note' && renderNoteContent()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
