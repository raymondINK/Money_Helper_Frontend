import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings, Plus, X, Wallet, Clock, Repeat } from 'lucide-react';
import CategoryBudgetRow from '../components/CategoryBudgetRow';
import StatusModal from '../components/StatusModal';
import api from '../api/axios';

interface BudgetPageProps {
  standalone?: boolean;
  selectedAccount?: any;  // Account/wallet passed from parent
}

interface Budget {
  id: number;
  name: string;
  icon: string;
  budget_amount: number;
  spent_amount: number;
  account_id: number;
}

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  monthly_allowance: number;
}

interface Installment {
  id: number;
  name: string;
  icon: string;
  monthly_amount: number;
  next_payment_date: string;
  remaining_months: number;
  status: string;
}

interface RecurringPayment {
  id: number;
  name: string;
  icon: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  status: string;
}

const BudgetPage: React.FC<BudgetPageProps> = ({ standalone = false, selectedAccount: propAccount }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(propAccount || null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [newBudget, setNewBudget] = useState({ name: '', icon: '📦', budget_amount: 0 });
  const [viewMode, setViewMode] = useState<'income' | 'expense'>('expense');
  const [walletAllowanceInput, setWalletAllowanceInput] = useState('');
  const [showCommittedExpenses, setShowCommittedExpenses] = useState(false);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'success' as 'success' | 'error',
    title: '',
    message: '',
    details: {} as any
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadData();
      // Initialize wallet allowance input with current value
      setWalletAllowanceInput(String(selectedAccount.monthly_allowance || 0));
    }
  }, [currentDate, selectedAccount]);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
      // Select first account by default if none selected
      if (res.data.length > 0 && !selectedAccount) {
        setSelectedAccount(res.data[0]);
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadData = async () => {
    if (!selectedAccount) return;
    
    try {
      const [txRes, budgetRes, installmentsRes, recurringRes] = await Promise.all([
        api.get(`/transactions?account_id=${selectedAccount.id}&limit=500`),
        api.get(`/budgets?account_id=${selectedAccount.id}`),
        api.get('/installments').catch(() => ({ data: [] })),
        api.get('/recurring-payments').catch(() => ({ data: [] }))
      ]);
      setTransactions(txRes.data);
      setBudgets(budgetRes.data || []);
      // Filter out completed installments
      const activeInstallments = (installmentsRes.data || []).filter((inst: Installment) => inst.status !== 'completed');
      setInstallments(activeInstallments);
      setRecurringPayments(recurringRes.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async () => {
    if (!newBudget.name || newBudget.budget_amount <= 0 || !selectedAccount) return;
    try {
      await api.post('/budgets', {
        ...newBudget,
        account_id: selectedAccount.id
      });
      setNewBudget({ name: '', icon: '📦', budget_amount: 0 });
      await loadData();
      setStatusModal({
        isOpen: true,
        status: 'success',
        title: 'Budget Created',
        message: 'Your budget has been successfully created.',
        details: {
          amount: newBudget.budget_amount,
          to: newBudget.name,
          category: 'Budget',
          account: selectedAccount.name
        }
      });
    } catch (err: any) {
      console.error('Error creating budget:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setNewBudget({ name: '', icon: '📦', budget_amount: 0 });
        await loadData();
      } else {
        setStatusModal({
          isOpen: true,
          status: 'error',
          title: 'Budget Creation Failed',
          message: err.response?.data?.message || err.message,
          details: {}
        });
      }
    }
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget) return;
    try {
      await api.put(`/budgets/${editingBudget.id}`, {
        name: editingBudget.name,
        icon: editingBudget.icon,
        budget_amount: editingBudget.budget_amount
      });
      setEditingBudget(null);
      await loadData();
      setStatusModal({
        isOpen: true,
        status: 'success',
        title: 'Budget Updated',
        message: 'Your budget has been successfully updated.',
        details: {}
      });
    } catch (err: any) {
      console.error('Error updating budget:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setEditingBudget(null);
        await loadData();
      } else {
        setStatusModal({
          isOpen: true,
          status: 'error',
          title: 'Update Failed',
          message: err.response?.data?.message || err.message,
          details: {}
        });
      }
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      await loadData();
      setStatusModal({
        isOpen: true,
        status: 'success',
        title: 'Budget Deleted',
        message: 'The budget has been permanently removed.',
        details: {}
      });
    } catch (err: any) {
      console.error('Error deleting budget:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setStatusModal({
          isOpen: true,
          status: 'error',
          title: 'Delete Failed',
          message: err.response?.data?.message || err.message,
          details: {}
        });
      }
    }
  };

  const handleUpdateWalletAllowance = async (allowance: number) => {
    if (!selectedAccount) return;
    try {
      await api.put(`/accounts/${selectedAccount.id}`, {
        monthly_allowance: allowance
      });
      // Refresh account data
      const res = await api.get('/accounts');
      setAccounts(res.data);
      const updated = res.data.find((a: Account) => a.id === selectedAccount.id);
      if (updated) setSelectedAccount(updated);
      alert('Allowance updated successfully!');
    } catch (err: any) {
      console.error('Error updating wallet allowance:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        const res = await api.get('/accounts');
        setAccounts(res.data);
        const updated = res.data.find((a: Account) => a.id === selectedAccount.id);
        if (updated) setSelectedAccount(updated);
      } else {
        alert(`Failed to update allowance: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Get date range for current period (monthly)
  const getDateRange = () => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return { start, end };
  };

  const { start, end } = getDateRange();

  // Filter transactions for current period
  const periodTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate >= start && txDate <= end;
  });

  // Calculate totals
  const totalIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Use wallet's monthly allowance as the budget limit
  const monthlyBudget = selectedAccount?.monthly_allowance || budgets.reduce((sum, b) => sum + b.budget_amount, 0);
  const remaining = monthlyBudget - totalExpense;
  const expensePercentage = monthlyBudget > 0 ? (totalExpense / monthlyBudget) * 100 : 0;

  // Calculate spending by category
  const categorySpending = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.category || 'Other';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  // Calculate income by category
  const categoryIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      const category = t.category || 'Other';
      acc[category] = (acc[category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  // Calculate committed expenses (installments and recurring payments for the selected period)
  const getCommittedExpenses = () => {
    const activeInstallments = installments.filter(i => i.status === 'active' && i.remaining_months > 0);
    const activeRecurring = recurringPayments.filter(r => r.status === 'active');
    
    const installmentTotal = activeInstallments.reduce((sum, i) => sum + i.monthly_amount, 0);
    const recurringTotal = activeRecurring.reduce((sum, r) => sum + r.amount, 0);
    
    return {
      installments: activeInstallments,
      recurringPayments: activeRecurring,
      installmentTotal,
      recurringTotal,
      total: installmentTotal + recurringTotal
    };
  };

  const committed = getCommittedExpenses();
  const actualRemaining = remaining - committed.total;

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formatDateRange = () => {
    const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
    const endStr = `${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`;
    return `${startStr} ~ ${endStr}`;
  };

  // Get today's position in the progress bar
  const today = new Date();
  const daysInMonth = end.getDate();
  const currentDay = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
    ? today.getDate()
    : (today > end ? daysInMonth : 0);
  const dayProgress = (currentDay / daysInMonth) * 100;

  return (
    <div className={standalone ? "flex-1 overflow-y-auto bg-[#0f1115]" : ""}>
      {/* Wallet Selector */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={16} className="text-slate-400" />
          <span className="text-sm text-slate-400">Wallet</span>
        </div>
        <select
          value={selectedAccount?.id || ''}
          onChange={(e) => {
            const account = accounts.find(a => a.id === parseInt(e.target.value));
            if (account) setSelectedAccount(account);
          }}
          className="w-full px-4 py-2.5 bg-[#1a1d24] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-center gap-4 py-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-slate-300 font-medium min-w-[180px] text-center">
          {formatDateRange()}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Income/Expense Toggle */}
      <div className="flex border-b border-white/10 mx-4">
        <button 
          onClick={() => setViewMode('income')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            viewMode === 'income' 
              ? 'text-emerald-400 border-emerald-500 font-medium' 
              : 'text-slate-400 border-transparent hover:text-slate-300'
          }`}
        >
          Income RM {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </button>
        <button 
          onClick={() => setViewMode('expense')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            viewMode === 'expense' 
              ? 'text-red-400 border-red-500 font-medium' 
              : 'text-slate-400 border-transparent hover:text-slate-300'
          }`}
        >
          Exp. RM {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Wallet Info Card */}
        {selectedAccount && (
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400">Wallet: {selectedAccount.name}</div>
                <div className="text-lg font-semibold text-white">
                  Monthly Allowance: RM {(selectedAccount.monthly_allowance || 0).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Balance</div>
                <div className="text-lg font-semibold text-emerald-400">
                  RM {selectedAccount.balance.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remaining Balance Card */}
        <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-slate-400 text-sm mb-1">Budget Status</div>
              <div className={`text-3xl font-bold ${remaining >= 0 ? 'text-white' : 'text-red-400'}`}>
                {remaining >= 0 ? 'RM ' : '-RM '}{Math.abs(remaining).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {remaining >= 0 ? 'Under budget' : 'Over budget'}
              </div>
            </div>
            <button 
              onClick={() => {
                setWalletAllowanceInput(String(selectedAccount?.monthly_allowance || 0));
                setShowSettings(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a2d34] hover:bg-[#3a3d44] rounded-lg text-slate-300 text-sm transition-colors"
            >
              Budget Setting
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Monthly Progress Bar with "Today" marker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Monthly</span>
              <span>{expensePercentage.toFixed(0)}%</span>
            </div>
            
            <div className="relative">
              {/* Today marker */}
              {currentDay > 0 && (
                <div 
                  className="absolute -top-6 transform -translate-x-1/2 z-10"
                  style={{ left: `${dayProgress}%` }}
                >
                  <div className="bg-[#2a2d34] text-white text-xs px-2 py-1 rounded">
                    Today
                  </div>
                  <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#2a2d34] mx-auto" />
                </div>
              )}
              
              {/* Progress Bar */}
              <div className="h-3 bg-[#0f1115] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    expensePercentage > 100 
                      ? 'bg-gradient-to-r from-red-500 to-red-400' 
                      : 'bg-gradient-to-r from-blue-500 to-blue-400'
                  }`}
                  style={{ width: `${Math.min(expensePercentage, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">RM {monthlyBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-blue-400">{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-300">{remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Committed Expenses Card - Installments & Recurring */}
        {(committed.installments.length > 0 || committed.recurringPayments.length > 0) && (
          <div className="bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCommittedExpenses(!showCommittedExpenses)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Clock size={18} className="text-cyan-400" />
                </div>
                <div className="text-left">
                  <div className="text-white font-semibold">Committed Expenses</div>
                  <div className="text-xs text-slate-400">Recurring payments due this period</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xl font-bold text-cyan-400">
                    RM {committed.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  {/* <div className="text-xs text-slate-400">
                    After: <span className={actualRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      RM {actualRemaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div> */}
                </div>
                <ChevronRight 
                  size={20} 
                  className={`text-slate-400 transition-transform ${
                    showCommittedExpenses ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </button>

            {showCommittedExpenses && (
              <div className="px-4 pb-4 pt-2 space-y-3">
                {/* Installments */}
                {committed.installments.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <Clock size={12} /> Installments
                    </div>
                    <div className="space-y-2">
                      {committed.installments.map(inst => (
                        <div key={inst.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span>{inst.icon}</span>
                            <span className="text-sm text-white">{inst.name}</span>
                            <span className="text-xs text-slate-500">({inst.remaining_months} months left)</span>
                          </div>
                          <span className="text-sm text-cyan-400 font-medium">
                            RM {inst.monthly_amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring Payments */}
                {committed.recurringPayments.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                      <Repeat size={12} /> Subscriptions & Bills
                    </div>
                    <div className="space-y-2">
                      {committed.recurringPayments.map(rp => (
                        <div key={rp.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span>{rp.icon}</span>
                            <span className="text-sm text-white">{rp.name}</span>
                            <span className="text-xs text-slate-500 capitalize">({rp.frequency})</span>
                          </div>
                          <span className="text-sm text-violet-400 font-medium">
                            RM {rp.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Category Budgets / Income */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-8">Loading budget data...</div>
          ) : viewMode === 'expense' ? (
            // Expense view - show budgets
            budgets.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>No budgets yet.</p>
                <button
                  onClick={() => {
                    setWalletAllowanceInput(String(selectedAccount?.monthly_allowance || 0));
                    setShowSettings(true);
                  }}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                >
                  Create your first budget
                </button>
              </div>
            ) : (
              budgets.map((budget) => {
                // Get transactions for this category
                const categoryTransactions = periodTransactions
                  .filter(t => t.type === 'expense' && t.category === budget.name)
                  .map(t => ({
                    id: t.id,
                    amount: t.amount,
                    note: t.note,
                    date: t.date
                  }));
                
                return (
                  <CategoryBudgetRow
                    key={budget.id}
                    icon={budget.icon || '📦'}
                    name={budget.name}
                    budgetAmount={budget.budget_amount}
                    spentAmount={categorySpending[budget.name] || 0}
                    currency="RM"
                    transactions={categoryTransactions}
                  />
                );
              })
            )
          ) : (
            // Income view - show income by category
            Object.keys(categoryIncome).length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p>No income recorded this month.</p>
              </div>
            ) : (
              Object.entries(categoryIncome).map(([category, amount]) => (
                <div key={category} className="bg-[#1a1d24]/80 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">💰</span>
                      <span className="text-white font-medium">{category}</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">
                      +RM {(amount as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Budget Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Budget Settings - {selectedAccount?.name}</h2>
              <button
                onClick={() => { setShowSettings(false); setEditingBudget(null); }}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Wallet Monthly Allowance */}
              {selectedAccount && (
                <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-medium text-blue-300">💼 Wallet Monthly Allowance</h3>
                  <p className="text-xs text-slate-400">This is the total budget for this wallet per month</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Monthly allowance"
                      value={walletAllowanceInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setWalletAllowanceInput(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateWalletAllowance(parseFloat(walletAllowanceInput) || 0);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white"
                    />
                    <span className="flex items-center text-slate-400 text-sm">RM</span>
                    <button
                      onClick={() => handleUpdateWalletAllowance(parseFloat(walletAllowanceInput) || 0)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Add New Category */}
              <div className="bg-[#0f1115] rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-slate-300">🗂 Add New Category</h3>
                <p className="text-xs text-slate-500">Categories divide your wallet budget into smaller budgets</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Icon (emoji)"
                    value={newBudget.icon}
                    onChange={(e) => setNewBudget({ ...newBudget, icon: e.target.value })}
                    className="w-16 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white text-center"
                  />
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newBudget.name}
                    onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                    className="flex-1 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Category budget"
                    value={newBudget.budget_amount || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, budget_amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white"
                  />
                  <button
                    onClick={handleCreateBudget}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              {/* Category Summary */}
              <div className="bg-[#0f1115] rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Category Budgets:</span>
                  <span className="text-white">RM {budgets.reduce((sum, b) => sum + b.budget_amount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">Wallet Allowance:</span>
                  <span className="text-blue-400">RM {(selectedAccount?.monthly_allowance || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Existing Categories */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-300">Your Categories</h3>
                {budgets.length === 0 ? (
                  <p className="text-slate-500 text-sm">No categories created yet.</p>
                ) : (
                  budgets.map((budget) => (
                    <div key={budget.id} className="bg-[#0f1115] rounded-xl p-3">
                      {editingBudget?.id === budget.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingBudget.icon}
                              onChange={(e) => setEditingBudget({ ...editingBudget, icon: e.target.value })}
                              className="w-16 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white text-center"
                            />
                            <input
                              type="text"
                              value={editingBudget.name}
                              onChange={(e) => setEditingBudget({ ...editingBudget, name: e.target.value })}
                              className="flex-1 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editingBudget.budget_amount}
                              onChange={(e) => setEditingBudget({ ...editingBudget, budget_amount: parseFloat(e.target.value) || 0 })}
                              className="flex-1 px-3 py-2 bg-[#2a2d34] border border-white/10 rounded-lg text-white"
                            />
                            <button
                              onClick={handleUpdateBudget}
                              className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBudget(null)}
                              className="px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{budget.icon || '📦'}</span>
                            <div>
                              <div className="text-white font-medium">{budget.name}</div>
                              <div className="text-slate-400 text-sm">RM {budget.budget_amount.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingBudget({ ...budget })}
                              className="px-3 py-1 bg-[#2a2d34] hover:bg-[#3a3d44] rounded-lg text-slate-300 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBudget(budget.id)}
                              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <StatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        status={statusModal.status}
        title={statusModal.title}
        message={statusModal.message}
        details={statusModal.details}
      />
    </div>
  );
};

export default BudgetPage;
