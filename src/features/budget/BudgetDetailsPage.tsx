import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../shared/components/Sidebar';
import api from '../../api/axios';

interface BudgetCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
  allocated: number;
  spent: number;
  limit: number;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface BudgetResponse {
  id: number;
  name: string;
  icon: string | null;
  budget_amount: number;
  spent_amount: number;
  account_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  remaining: number;
  budgets: BudgetResponse[];
}

const BudgetDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newBudgetAmount, setNewBudgetAmount] = useState('4500');
  const [editBudgetAmount, setEditBudgetAmount] = useState('4500');
  const [categoryAllocations, setCategoryAllocations] = useState([
    { name: 'Housing', icon: 'home', color: 'blue', amount: 1800 },
    { name: 'Dining', icon: 'restaurant', color: 'orange', amount: 650 },
    { name: 'Groceries', icon: 'shopping_cart', color: 'green', amount: 800 },
  ]);
  const [editCategoryAllocations, setEditCategoryAllocations] = useState<Array<{id: number; name: string; icon: string; color: string; amount: number; spent: number}>>([]);
  const [totalBudget, setTotalBudget] = useState(4500);
  const [spent, setSpent] = useState(3240);
  const [dailyAverage, setDailyAverage] = useState(108.40);
  const [projectedSavings, setProjectedSavings] = useState(842.15);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('RM');
  const [autoReset, setAutoReset] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('category');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);

  // Debug: Log state changes
  useEffect(() => {
    console.log('Accounts state updated:', accounts);
    console.log('Selected account:', selectedAccount);
  }, [accounts, selectedAccount]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, accountsRes, settingsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/accounts'),
        api.get('/settings')
      ]);
      setUser(userRes.data);
      setAccounts(accountsRes.data);
      setCurrency(settingsRes.data.currency || 'RM');
      
      // Respect the account the user had selected on the Dashboard
      const persistedId = localStorage.getItem('budgetDetailsAccountId');
      
      if (accountsRes.data && accountsRes.data.length > 0) {
        const preferred = persistedId
          ? accountsRes.data.find((a: Account) => a.id === parseInt(persistedId))
          : null;
        const startAccount = preferred || accountsRes.data[0];
        setSelectedAccount(startAccount.id);
        await loadBudgetData(startAccount.id);
      } else {
        console.warn('No accounts found. User needs to create an account first.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBudgetData = async (accountId: number) => {
    try {
      const summaryRes = await api.get(`/budgets/summary?account_id=${accountId}`);
      const summary: BudgetSummary = summaryRes.data;
      
      console.log('Budget summary loaded:', summary);
      
      setBudgets(summary.budgets);
      setTotalBudget(summary.total_budget);
      setSpent(summary.total_spent);
      
      // Calculate daily average and projected savings (assuming 30-day month)
      const daysInMonth = 30;
      const avgDaily = summary.total_spent / daysInMonth;
      setDailyAverage(avgDaily);
      setProjectedSavings(summary.remaining);
      
      // Prepare edit allocations
      const allocations = summary.budgets.map(b => ({
        id: b.id,
        name: b.name,
        icon: b.icon || 'category',
        color: getColorForCategory(b.name),
        amount: b.budget_amount,
        spent: b.spent_amount
      }));
      setEditCategoryAllocations(allocations);
      setEditBudgetAmount(summary.total_budget.toString());
      
      if (summary.budgets.length === 0) {
        console.log('No budgets found for this account. User should create budgets.');
      }
    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  const getColorForCategory = (name: string): string => {
    const colorMap: { [key: string]: string } = {
      'Housing': 'amber',
      'Food': 'purple',
      'Dining': 'purple',
      'Transport': 'teal',
      'Entertainment': 'purple',
      'Shopping': 'blue',
      'Groceries': 'green',
      'Utilities': 'blue',
      'Healthcare': 'pink',
    };
    return colorMap[name] || 'blue';
  };

  const handleSidebarToggle = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
  };

  const spentPercentage = (spent / totalBudget) * 100;
  const strokeDashoffset = 502 - (502 * spentPercentage) / 100;

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; border: string; progress: string } } = {
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', progress: 'bg-blue-500' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', progress: 'bg-red-500' },
      purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', progress: 'bg-purple-500' },
      teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', progress: 'bg-teal-500' },
      pink: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: '', progress: 'bg-pink-500' },
      amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: '', progress: 'bg-amber-500' },
      green: { bg: 'bg-green-500/20', text: 'text-green-400', border: '', progress: 'bg-green-500' },
    };
    return colors[color] || colors.blue;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Healthy') {
      return 'px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold rounded-md uppercase tracking-wide';
    }
    return 'px-2 py-1 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-md uppercase tracking-wide';
  };

  // Dynamic data from API
  const budgetCategories: BudgetCategory[] = budgets.slice(0, 4).map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon || 'category',
    color: getColorForCategory(b.name),
    allocated: b.budget_amount,
    spent: b.spent_amount,
    limit: b.budget_amount
  }));

  const categoryBreakdown = budgets.map((b) => ({
    name: b.name,
    icon: b.icon || 'category',
    color: getColorForCategory(b.name),
    allocated: b.budget_amount,
    spent: b.spent_amount,
    status: b.spent_amount > b.budget_amount * 0.9 ? 'Critical' : 'Healthy'
  }));

  const handleUpdateCategoryAmount = (id: number, newAmount: number) => {
    setEditCategoryAllocations(prev => 
      prev.map(cat => cat.id === id ? { ...cat, amount: newAmount } : cat)
    );
  };

  const handleUpdateCategoryName = (id: number, newName: string) => {
    setEditCategoryAllocations(prev =>
      prev.map(cat => cat.id === id ? { ...cat, name: newName } : cat)
    );
  };

  const handleUpdateCategoryIcon = (id: number, newIcon: string) => {
    setEditCategoryAllocations(prev =>
      prev.map(cat => cat.id === id ? { ...cat, icon: newIcon } : cat)
    );
  };

  // When total budget changes, just update the budget cap — do NOT touch category amounts
  const handleTotalBudgetChange = (newTotal: string) => {
    setEditBudgetAmount(newTotal);
  };

  const handleCreateBudget = async () => {
    if (!selectedAccount || categoryAllocations.length === 0) {
      alert('Please select an account and add at least one category');
      return;
    }
    
    try {
      // Create each budget category
      for (const category of categoryAllocations) {
        await api.post('/budgets', {
          name: category.name,
          icon: category.icon,
          budget_amount: category.amount,
          account_id: selectedAccount
        });
      }
      
      // Reload budget data
      await loadBudgetData(selectedAccount);
      setShowBudgetModal(false);
      
      // Reset form
      setCategoryAllocations([
        { name: 'Housing', icon: 'home', color: 'blue', amount: 1800 },
        { name: 'Dining', icon: 'restaurant', color: 'orange', amount: 650 },
        { name: 'Groceries', icon: 'shopping_cart', color: 'green', amount: 800 },
      ]);
      setNewBudgetAmount('4500');
    } catch (error: any) {
      console.error('Error creating budgets:', error);
      alert(error.response?.data?.detail || 'Failed to create budget. Please try again.');
    }
  };

  const handleSaveBudgetChanges = async () => {
    if (!selectedAccount) return;

    // Guard: category amounts must not exceed total budget
    const totalBudgetNum = parseFloat(editBudgetAmount) || 0;
    const allocatedTotal = editCategoryAllocations.reduce((s, c) => s + c.amount, 0);
    if (allocatedTotal > totalBudgetNum) {
      alert(`Total allocated (${currency} ${allocatedTotal.toFixed(2)}) exceeds the monthly budget (${currency} ${totalBudgetNum.toFixed(2)}). Please adjust category amounts.`);
      return;
    }
    
    try {
      // IDs created with Date.now() are > 1e12 — those are new categories, use POST
      for (const category of editCategoryAllocations) {
        const isNew = category.id > 1e12;
        if (isNew) {
          await api.post('/budgets', {
            name: category.name,
            icon: category.icon,
            budget_amount: category.amount,
            account_id: selectedAccount
          });
        } else {
          await api.put(`/budgets/${category.id}`, {
            name: category.name,
            icon: category.icon,
            budget_amount: category.amount
          });
        }
      }
      
      // Reload budget data
      await loadBudgetData(selectedAccount);
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating budgets:', error);
      alert(error.response?.data?.detail || 'Failed to update budget. Please try again.');
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    
    setCategoryAllocations(prev => [...prev, {
      name: newCategoryName,
      icon: newCategoryIcon,
      color: getColorForCategory(newCategoryName),
      amount: 0
    }]);
    
    setNewCategoryName('');
    setNewCategoryIcon('category');
    setShowAddCategory(false);
  };

  const handleAddEditCategory = () => {
    if (!newCategoryName.trim() || !selectedAccount) return;
    
    setEditCategoryAllocations(prev => [...prev, {
      id: Date.now(), // Temporary ID for new categories
      name: newCategoryName,
      icon: newCategoryIcon,
      color: getColorForCategory(newCategoryName),
      amount: 0,
      spent: 0
    }]);
    
    setNewCategoryName('');
    setNewCategoryIcon('category');
    setShowAddCategory(false);
  };

  const totalAllocated = editCategoryAllocations.reduce((sum, cat) => sum + cat.amount, 0);
  const totalSpent = editCategoryAllocations.reduce((sum, cat) => sum + cat.spent, 0);
  const showWarning = parseFloat(editBudgetAmount) < totalSpent;

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex h-20 w-full items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md px-6 lg:px-12">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-white">Budget Details</h2>
              <p className="text-sm text-gray-400">Track your spending across categories.</p>
            </div>
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-5 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-all rounded-lg"
              >
                Overview
              </button>
              <button className="px-5 py-1.5 text-sm font-medium text-white bg-white/10 shadow-sm rounded-lg border border-white/10">
                Budget Details
              </button>
            </nav>
          </div>

          {/* Account switcher in header */}
          {accounts.length > 1 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">account_balance_wallet</span>
              <select
                value={selectedAccount || ''}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  setSelectedAccount(id);
                  localStorage.setItem('budgetDetailsAccountId', String(id));
                  loadBudgetData(id);
                }}
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/50 outline-none"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">expand_more</span>
            </div>
          )}
          {accounts.length === 1 && selectedAccount && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <span className="material-symbols-outlined text-purple-400 text-sm">account_balance_wallet</span>
              <span className="text-sm text-white font-medium">{accounts.find(a => a.id === selectedAccount)?.name}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-white text-lg">Loading budget data...</div>
            </div>
          ) : (
          <div className="layout-content-container mx-auto flex max-w-[1200px] flex-col gap-8 p-6 lg:p-12">
          {/* Top Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Total Budget Card */}
            <div className="glass-panel relative col-span-1 lg:col-span-2 overflow-hidden rounded-3xl p-8 border-2 border-[#00FF88]/30">
              <div className="absolute -right-20 -top-20 size-64 rounded-full bg-[#00FF88]/10 blur-[80px]"></div>
              <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-primary/10 blur-[80px]"></div>
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-400">Total Monthly Budget</p>
                    <h2 className="text-5xl font-bold text-white tracking-tight">{currency} {totalBudget.toFixed(2)}</h2>
                    <div className="flex items-center gap-2 text-[#00FF88] text-sm font-medium mt-4">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    12% more than last month
                  </div>
                </div>
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
                        strokeDasharray={`${Math.round(spentPercentage)}, 100`}
                        strokeLinecap="round"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">{Math.round(spentPercentage)}%</span>
                      <span className="text-xs text-[#00FF88] uppercase tracking-widest font-bold">Spent</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              <div className="glass-panel rounded-2xl p-6 border border-white/5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Daily Average</p>
                  <span className="material-symbols-outlined text-[#00FF88] text-xl">query_stats</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">${dailyAverage.toFixed(2)}</p>
                <p className="text-xs text-gray-400">Average daily spending.</p>
              </div>
              <div className="glass-panel rounded-2xl p-6 border-2 border-purple-500/30 bg-purple-500/5">
                <div className="flex items-start justify-between mb-4">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">Projected Savings</p>
                  <span className="material-symbols-outlined text-purple-400 text-xl">savings</span>
                </div>
                <p className="text-4xl font-bold text-white mb-2">${projectedSavings.toFixed(2)}</p>
                <p className="text-xs text-purple-400">Estimated end-of-month savings.</p>
              </div>
            </div>
          </div>

          {/* Budget Category Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {budgetCategories.length === 0 ? (
              <div className="col-span-full glass-panel rounded-3xl p-12 border border-white/5 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">folder_open</span>
                <h3 className="text-xl font-bold text-white mb-2">No Budget Categories Yet</h3>
                <p className="text-gray-400 mb-6">Create your first budget to start tracking your spending.</p>
                <button 
                  onClick={() => setShowBudgetModal(true)}
                  className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Create Your First Budget
                </button>
              </div>
            ) : (
              budgetCategories.map((category) => {
                const colors = getColorClasses(category.color);
                const percentage = (category.spent / category.limit) * 100;
                const isOverBudget = category.spent > category.limit;
                const remaining = category.limit - category.spent;

                return (
                  <div
                    key={category.id}
                  className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-[#00FF88]/40 transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} ${colors.border} group-hover:scale-110 transition-transform`}>
                      <span className="material-symbols-outlined">{category.icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-gray-400 hover:text-white cursor-pointer">more_horiz</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{category.name}</h3>
                  <div className="flex justify-between items-end mb-4">
                    <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-400' : 'text-white'}`}>${category.spent}</p>
                    <p className="text-xs text-gray-400 font-medium">of ${category.limit}</p>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${isOverBudget ? 'bg-red-500' : colors.progress} h-full rounded-full`}
                      style={{
                        width: `${Math.min(percentage, 100)}%`,
                        boxShadow: isOverBudget ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(0,255,136,0.3)'
                      }}
                    ></div>
                  </div>
                  <p className={`mt-4 text-xs font-medium flex items-center gap-1 ${isOverBudget ? 'text-red-400' : 'text-gray-400'}`}>
                    <span className={`material-symbols-outlined text-[14px] ${isOverBudget ? 'text-red-400' : 'text-[#00FF88]'}`}>
                      {isOverBudget ? 'warning' : 'check_circle'}
                    </span>
                    {isOverBudget ? `Over budget by $${Math.abs(remaining)}` : `Under budget by $${remaining}`}
                  </p>
                </div>
              );
            })
            )}
          </div>

          {/* Category Breakdown Table */}
          <div className="glass-panel rounded-3xl p-8 border border-white/5">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white">Category Breakdown</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-white/10 rounded-lg hover:bg-white/20 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Budget
                </button>
                <button 
                  onClick={() => setShowBudgetModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add Budget
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {/* Table Header */}
              {categoryBreakdown.length > 0 && (
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] text-white font-bold uppercase tracking-widest border-b border-cosmic-border">
                  <div className="col-span-4">Category Name</div>
                  <div className="col-span-2 text-right">Allocated</div>
                  <div className="col-span-2 text-right">Spent</div>
                  <div className="col-span-2 text-right">Remaining</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
              )}

              {/* Table Rows */}
              {categoryBreakdown.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-gray-600 mb-3 block">receipt_long</span>
                  <p className="text-gray-400 text-sm">No budget categories to display. Create a budget to get started.</p>
                </div>
              ) : (
                categoryBreakdown.map((category, index) => {
                  const colors = getColorClasses(category.color);
                  const remaining = category.allocated - category.spent;

                  return (
                    <div key={index} className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl hover:bg-white/5 transition-all items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined ${colors.text} text-lg`}>{category.icon}</span>
                        </div>
                        <span className="font-medium text-white">{category.name}</span>
                      </div>
                      <div className="col-span-2 text-right font-medium text-white">${category.allocated.toFixed(2)}</div>
                      <div className="col-span-2 text-right font-medium text-[#00FF88]">${category.spent.toFixed(2)}</div>
                      <div className="col-span-2 text-right font-medium text-white">${remaining.toFixed(2)}</div>
                    <div className="col-span-2 text-right">
                      <span className={getStatusBadge(category.status)}>{category.status}</span>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
          </div>
          )}
        </div>
      </div>

      {/* Budget Creation Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-[580px] rounded-3xl overflow-hidden flex flex-col max-h-[90vh]" style={{
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(168, 85, 247, 0.5)',
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)'
          }}>
            {/* Modal Header */}
            <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Create Budget</h2>
                <p className="text-gray-400 text-sm mt-1">Design your cosmic spending plan.</p>
              </div>
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-gray-400">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 pt-6 space-y-6 overflow-y-auto flex-1" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent'
            }}>
              {accounts.length === 0 && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start mb-4">
                  <span className="material-symbols-outlined text-red-400 shrink-0">error</span>
                  <div>
                    <p className="text-sm font-semibold text-red-400">No Accounts Found</p>
                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                      You need to create an account first before creating a budget. Go to Accounts page to create one.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Account Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Account</label>
                <div className="relative">
                  <select 
                    value={selectedAccount || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedAccount(value ? parseInt(value) : null);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all"
                  >
                    {accounts.length === 0 && <option value="">No accounts available</option>}
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) - {currency} {acc.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                </div>
              </div>

              {/* Total Budget */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Set Total Monthly Budget</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-white/40 group-focus-within:text-purple-500 transition-colors">{currency}</span>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-16 pr-4 py-4 text-2xl font-bold text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 outline-none transition-all placeholder:text-white/10" 
                    placeholder="0.00" 
                    type="text" 
                    inputMode="decimal"
                    value={newBudgetAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      setNewBudgetAmount(value);
                    }}
                  />
                </div>
              </div>

              {/* Category Allocations */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Allocate Categories</label>
                  <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <span className="text-xs font-bold text-purple-400 tracking-wide">
                      Remaining: ${(parseFloat(newBudgetAmount) - categoryAllocations.reduce((sum, cat) => sum + cat.amount, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryAllocations.map((category, index) => (
                    <div key={index} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className={`w-10 h-10 rounded-lg bg-${category.color}-500/20 flex items-center justify-center text-${category.color}-400`}>
                        <span className="material-symbols-outlined">{category.icon}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{category.name}</p>
                      </div>
                      <div className="w-32 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">{currency}</span>
                        <input 
                          className="w-full bg-white/10 border-0 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none" 
                          type="text"
                          inputMode="decimal"
                          value={category.amount}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const newAllocations = [...categoryAllocations];
                            newAllocations[index].amount = parseFloat(value) || 0;
                            setCategoryAllocations(newAllocations);
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {!showAddCategory ? (
                    <button 
                      onClick={() => setShowAddCategory(true)}
                      className="w-full py-3 border border-dashed border-white/10 rounded-xl text-gray-400 text-xs font-bold tracking-widest uppercase hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Add Category
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <input
                        type="text"
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <div className="relative">
                        <select
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                        >
                          <option value="category">📦 Category (default)</option>
                          <option value="home">🏠 Home</option>
                          <option value="restaurant">🍽️ Restaurant</option>
                          <option value="shopping_cart">🛒 Shopping Cart</option>
                          <option value="shopping_bag">🛍️ Shopping Bag</option>
                          <option value="local_mall">🏪 Store</option>
                          <option value="commute">🚗 Transport</option>
                          <option value="directions_car">🚙 Car</option>
                          <option value="train">🚆 Train</option>
                          <option value="flight">✈️ Flight</option>
                          <option value="movie">🎬 Entertainment</option>
                          <option value="theater_comedy">🎭 Theater</option>
                          <option value="sports_esports">🎮 Gaming</option>
                          <option value="fitness_center">💪 Fitness</option>
                          <option value="medical_services">⚕️ Healthcare</option>
                          <option value="school">🎓 Education</option>
                          <option value="phone_iphone">📱 Phone</option>
                          <option value="wifi">📡 Internet</option>
                          <option value="water_drop">💧 Utilities</option>
                          <option value="electric_bolt">⚡ Electricity</option>
                          <option value="local_gas_station">⛽ Gas</option>
                          <option value="pets">🐾 Pets</option>
                          <option value="child_care">👶 Childcare</option>
                          <option value="savings">💰 Savings</option>
                          <option value="account_balance">🏦 Banking</option>
                          <option value="fastfood">🍔 Fast Food</option>
                          <option value="local_cafe">☕ Cafe</option>
                          <option value="nightlife">🍷 Nightlife</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">expand_more</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCategory}
                          className="flex-1 py-2 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 transition-all"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                            setNewCategoryIcon('category');
                          }}
                          className="flex-1 py-2 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-reset Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-purple-900/10 border border-purple-500/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-purple-400">refresh</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Auto-reset monthly</p>
                    <p className="text-[11px] text-gray-400">Resets allocations on the 1st</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    checked={autoReset}
                    onChange={(e) => setAutoReset(e.target.checked)}
                    className="sr-only peer" 
                    type="checkbox" 
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 flex gap-4">
              <button 
                onClick={() => setShowBudgetModal(false)}
                className="flex-1 py-4 px-6 rounded-xl border border-white/10 text-white font-bold tracking-wide hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBudget}
                className="flex-[2] py-4 px-6 rounded-xl text-white font-bold tracking-wide text-lg flex items-center justify-center gap-2 transition-all" 
                style={{
                  background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)'
                }}
              >
                <span className="material-symbols-outlined">rocket_launch</span>
                Create Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-[560px] rounded-[32px] overflow-hidden shadow-2xl" style={{ background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {/* Modal Header */}
            <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-white/10">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Edit Budget</h2>
                <p className="text-gray-400 text-sm mt-1">Adjust your monthly limits and goals.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-white">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Warning Banner */}
              {showWarning && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-4 items-start">
                  <span className="material-symbols-outlined text-red-400 shrink-0">warning</span>
                  <div>
                    <p className="text-sm font-semibold text-red-400">Budget Threshold Warning</p>
                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                      Your new proposed budget (${parseFloat(editBudgetAmount).toFixed(2)}) is lower than your current total spend (${totalSpent.toFixed(2)}) for this period. Some categories may be exceeded immediately.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-8">
                {/* Total Budget Input */}
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">
                    Total Monthly Budget
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-gray-400">{currency}</span>
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-16 pr-4 text-2xl font-bold text-white focus:ring-2 focus:ring-[#00FF88] focus:border-transparent outline-none transition-all" 
                      type="text"
                      inputMode="decimal"
                      value={editBudgetAmount}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        handleTotalBudgetChange(value);
                      }}
                    />
                  </div>
                </div>

                {/* Category Allocations */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                      Category Allocations
                    </label>
                    {(() => {
                      const cap = parseFloat(editBudgetAmount) || 0;
                      const remaining = cap - totalAllocated;
                      const over = remaining < 0;
                      return (
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${ over ? 'text-red-400' : 'text-[#00FF88]'}`}>
                          {over ? `Over by ${currency} ${Math.abs(remaining).toFixed(2)}` : `Remaining: ${currency} ${remaining.toFixed(2)}`}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-4">
                    {editCategoryAllocations.map((category) => {
                      const colors = getColorClasses(category.color);
                      const percentage = (category.spent / category.amount) * 100;
                      const isEditing = editingCategoryId === category.id;

                      return (
                        <div key={category.id} className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                          {/* Main row */}
                          <div className="flex items-center gap-4 p-4">
                            <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.text} shrink-0`}>
                              <span className="material-symbols-outlined">{category.icon}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-white">{category.name}</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={category.amount}
                                  onChange={(e) => {
                                    const raw = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                                    const cap = parseFloat(editBudgetAmount) || 0;
                                    // Sum of all OTHER categories
                                    const othersTotal = editCategoryAllocations
                                      .filter(c => c.id !== category.id)
                                      .reduce((s, c) => s + c.amount, 0);
                                    const maxAllowed = Math.max(0, cap - othersTotal);
                                    handleUpdateCategoryAmount(category.id, Math.min(raw, maxAllowed));
                                  }}
                                  className={`w-24 text-sm font-bold text-white bg-white/5 border rounded-lg px-2 py-1 text-right focus:ring-2 outline-none ${
                                    category.amount > (parseFloat(editBudgetAmount) || 0)
                                      ? 'border-red-500/60 focus:ring-red-500'
                                      : 'border-white/10 focus:ring-purple-500'
                                  }`}
                                />
                              </div>
                              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className={`${colors.progress} h-full rounded-full`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setEditingCategoryId(isEditing ? null : category.id);
                              }}
                              className={`material-symbols-outlined text-lg transition-colors shrink-0 ${isEditing ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
                            >
                              {isEditing ? 'expand_less' : 'edit'}
                            </button>
                          </div>

                          {/* Inline edit panel */}
                          {isEditing && (
                            <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Category Name</label>
                                <input
                                  type="text"
                                  value={category.name}
                                  onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                  placeholder="Category name"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Icon</label>
                                <div className="relative">
                                  <select
                                    value={category.icon}
                                    onChange={(e) => handleUpdateCategoryIcon(category.id, e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none appearance-none"
                                  >
                                    <option value="category">📦 Category (default)</option>
                                    <option value="home">🏠 Home</option>
                                    <option value="restaurant">🍽️ Restaurant</option>
                                    <option value="shopping_cart">🛒 Shopping Cart</option>
                                    <option value="shopping_bag">🛍️ Shopping Bag</option>
                                    <option value="local_mall">🏪 Store</option>
                                    <option value="commute">🚗 Transport</option>
                                    <option value="directions_car">🚙 Car</option>
                                    <option value="train">🚆 Train</option>
                                    <option value="flight">✈️ Flight</option>
                                    <option value="movie">🎬 Entertainment</option>
                                    <option value="sports_esports">🎮 Gaming</option>
                                    <option value="fitness_center">💪 Fitness</option>
                                    <option value="medical_services">⚕️ Healthcare</option>
                                    <option value="school">🎓 Education</option>
                                    <option value="phone_iphone">📱 Phone</option>
                                    <option value="wifi">📡 Internet</option>
                                    <option value="water_drop">💧 Utilities</option>
                                    <option value="electric_bolt">⚡ Electricity</option>
                                    <option value="local_gas_station">⛽ Gas</option>
                                    <option value="pets">🐾 Pets</option>
                                    <option value="savings">💰 Savings</option>
                                    <option value="account_balance">🏦 Banking</option>
                                    <option value="fastfood">🍔 Fast Food</option>
                                    <option value="local_cafe">☕ Cafe</option>
                                    <option value="nightlife">🍷 Nightlife</option>
                                  </select>
                                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">expand_more</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!showAddCategory ? (
                    <button 
                      onClick={() => setShowAddCategory(true)}
                      className="w-full mt-4 py-3 border-2 border-dashed border-white/10 rounded-2xl text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">add_circle</span>
                      Add Category
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10 mt-4">
                      <input
                        type="text"
                        placeholder="Category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#00FF88] outline-none"
                      />
                      <div className="relative">
                        <select
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-[#00FF88] outline-none appearance-none"
                        >
                          <option value="category">📦 Category (default)</option>
                          <option value="home">🏠 Home</option>
                          <option value="restaurant">🍽️ Restaurant</option>
                          <option value="shopping_cart">🛒 Shopping Cart</option>
                          <option value="shopping_bag">🛍️ Shopping Bag</option>
                          <option value="local_mall">🏪 Store</option>
                          <option value="commute">🚗 Transport</option>
                          <option value="directions_car">🚙 Car</option>
                          <option value="train">🚆 Train</option>
                          <option value="flight">✈️ Flight</option>
                          <option value="movie">🎬 Entertainment</option>
                          <option value="theater_comedy">🎭 Theater</option>
                          <option value="sports_esports">🎮 Gaming</option>
                          <option value="fitness_center">💪 Fitness</option>
                          <option value="medical_services">⚕️ Healthcare</option>
                          <option value="school">🎓 Education</option>
                          <option value="phone_iphone">📱 Phone</option>
                          <option value="wifi">📡 Internet</option>
                          <option value="water_drop">💧 Utilities</option>
                          <option value="electric_bolt">⚡ Electricity</option>
                          <option value="local_gas_station">⛽ Gas</option>
                          <option value="pets">🐾 Pets</option>
                          <option value="child_care">👶 Childcare</option>
                          <option value="savings">💰 Savings</option>
                          <option value="account_balance">🏦 Banking</option>
                          <option value="fastfood">🍔 Fast Food</option>
                          <option value="local_cafe">☕ Cafe</option>
                          <option value="nightlife">🍷 Nightlife</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">expand_more</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddEditCategory}
                          className="flex-1 py-2 bg-[#00FF88] text-black text-xs font-bold rounded-lg hover:shadow-lg transition-all"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowAddCategory(false);
                            setNewCategoryName('');
                            setNewCategoryIcon('category');
                          }}
                          className="flex-1 py-2 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 pt-4 flex gap-4 border-t border-white/10">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBudgetChanges}
                className="flex-[2] py-4 px-6 rounded-2xl bg-[#00FF88] text-black font-bold hover:shadow-[0_0_20px_rgba(0,255,148,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-xl">check_circle</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetDetailsPage;
