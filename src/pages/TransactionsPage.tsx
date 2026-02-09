import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, TrendingUp, TrendingDown, Search, ArrowLeftRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TransactionCalendar from '../components/TransactionCalendar';
import StatusModal from '../components/StatusModal';
import api from '../api/axios';

type ViewTab = 'calendar' | 'daily' | 'monthly' | 'summary' | 'description';

interface Budget {
  id: number;
  name: string;
  icon: string;
  budget_amount: number;
}

interface Installment {
  id: number;
  name: string;
  icon: string;
  monthly_amount: number;
  next_payment_date: string;
  status: string;
}

interface RecurringPayment {
  id: number;
  name: string;
  icon: string;
  amount: number;
  next_due_date: string;
  status: string;
}

const TransactionsPage = () => {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    status: 'success' as 'success' | 'error',
    title: '',
    message: '',
    details: {} as any
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    accountId: 'all',
    startDate: '',
    endDate: ''
  });
  const [formData, setFormData] = useState({
    account_id: '',
    to_account_id: '',
    type: 'expense',
    amount: '',
    note: '',
    category: 'General',
    date: new Date().toISOString().split('T')[0]
  });
  const navigate = useNavigate();

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

      const [userRes, accountsRes, transactionsRes, budgetsRes, installmentsRes, recurringRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/accounts'),
        api.get('/transactions?limit=500'),
        api.get('/budgets'),
        api.get('/installments').catch(() => ({ data: [] })),
        api.get('/recurring-payments').catch(() => ({ data: [] }))
      ]);

      const userData = userRes.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
      setBudgets(budgetsRes.data || []);
      setInstallments(installmentsRes.data || []);
      setRecurringPayments(recurringRes.data || []);
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

  const handleCreate = () => {
    setEditingTransaction(null);
    setFormData({
      account_id: accounts.length > 0 ? String(accounts[0].id) : '',
      to_account_id: '',
      type: 'expense',
      amount: '',
      note: '',
      category: 'General',
      date: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      account_id: transaction.account_id,
      to_account_id: transaction.to_account_id || '',
      type: transaction.type,
      amount: String(transaction.amount),
      note: transaction.note || '',
      category: transaction.category || 'General',
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/transactions/${transactionId}`);
      await loadData();
      alert('Transaction deleted successfully!');
    } catch (err: any) {
      console.error('Error deleting transaction:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        alert(`Failed to delete transaction: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Create proper datetime from date string
      const dateWithTime = new Date(formData.date + 'T12:00:00').toISOString();
      const amount = parseFloat(formData.amount) || 0;

      // Handle transfer type - create two transactions
      if (formData.type === 'transfer') {
        if (!formData.to_account_id) {
          setStatusModal({
            isOpen: true,
            status: 'error',
            title: 'Transfer Failed',
            message: 'Please select a destination account for the transfer.',
            details: {}
          });
          return;
        }
        if (formData.account_id === formData.to_account_id) {
          setStatusModal({
            isOpen: true,
            status: 'error',
            title: 'Transfer Failed',
            message: 'Cannot transfer to the same account.',
            details: {}
          });
          return;
        }

        const fromAccount = accounts.find(a => a.id === parseInt(formData.account_id as string));
        const toAccount = accounts.find(a => a.id === parseInt(formData.to_account_id));

        // Check if sufficient balance
        if (fromAccount && fromAccount.balance < amount) {
          setStatusModal({
            isOpen: true,
            status: 'error',
            title: 'Transaction Failed',
            message: 'Insufficient balance in your account.',
            details: {
              amount: amount,
              to: `${toAccount?.name}`,
              account: fromAccount.name,
              date: new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            }
          });
          return;
        }


        // Create transfer using backend endpoint
        await api.post('/transactions/transfer', {
          from_account_id: parseInt(formData.account_id as string),
          to_account_id: parseInt(formData.to_account_id),
          amount: amount,
          date: dateWithTime,
          note: formData.note || `Transfer from ${fromAccount?.name} to ${toAccount?.name}`
        });

      } else {
        const selectedAccount = accounts.find(a => a.id === parseInt(formData.account_id as string));

        // Check if sufficient balance for expense
        if (formData.type === 'transfer' && selectedAccount && selectedAccount.balance < amount) {
          setStatusModal({
            isOpen: true,
            status: 'error',
            title: 'Transaction Failed',
            message: 'Insufficient balance in your account.',
            details: {
              amount: amount,
              to: formData.note || formData.category,
              category: formData.category,
              account: selectedAccount.name,
              date: new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            }
          });
          return;
        }

        const submitData = {
          account_id: parseInt(formData.account_id as string),
          amount: amount,
          type: formData.type,
          note: formData.note,
          category: formData.category,
          date: dateWithTime
        };

        if (editingTransaction) {
          await api.put(`/transactions/${editingTransaction.id}`, submitData);
        } else {
          await api.post('/transactions', submitData);
        }
      }

      setShowModal(false);
      await loadData();

      // Get updated account balance
      const updatedAccount = accounts.find(a => a.id === parseInt(formData.account_id as string));
      const newBalance = updatedAccount ? (formData.type === 'transfer' ? updatedAccount.balance - amount : updatedAccount.balance + amount) : 0;

      // Show success modal
      setStatusModal({
        isOpen: true,
        status: 'success',
        title: editingTransaction ? 'Transaction Updated' : 'Transaction Successful',
        message: 'Your payment has been processed.',
        details: {
          amount: amount,
          to: formData.note || formData.category,
          category: formData.category,
          account: updatedAccount?.name || 'Account',
          date: new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
          newBalance: newBalance
        }
      });
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      console.error('Error response:', err.response?.data);

      // If it's a network error, the transaction might still have been created
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        console.log('Network error detected, but transaction may have been saved. Refreshing...');
        setShowModal(false);
        await loadData();
      } else {
        // Check if it's an insufficient balance error
        const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
        const isInsufficientBalance = errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('balance');

        setShowModal(false);
        setStatusModal({
          isOpen: true,
          status: 'error',
          title: 'Transaction Failed',
          message: isInsufficientBalance ? 'Insufficient balance in your account.' : errorMsg,
          details: {
            amount: parseFloat(formData.amount) || 0,
            to: formData.note || formData.category,
            category: formData.category,
            account: accounts.find(a => a.id === parseInt(formData.account_id as string))?.name || 'Account',
            date: new Date(formData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          }
        });
      }
    }
  };

  const getMonthTransactions = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === year && txDate.getMonth() === month;
    });
  };

  const getDailyGroupedTransactions = () => {
    const monthTxs = getMonthTransactions();
    const grouped: Record<string, any[]> = {};

    monthTxs.forEach(tx => {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(tx);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  };

  const getMonthlySummary = () => {
    const monthTxs = getMonthTransactions();
    const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = monthTxs
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const cat = t.category || 'Other';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return { income, expense, total: income - expense, categoryBreakdown };
  };

  const handleDayClick = (_date: Date, dayTransactions: any[]) => {
    // Legacy function - kept for compatibility
    setSelectedDayTransactions(dayTransactions);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filters.search && !tx.note?.toLowerCase().includes(filters.search.toLowerCase()) &&
      !tx.category?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.accountId !== 'all' && tx.account_id !== parseInt(filters.accountId)) return false;
    return true;
  });

  const tabs: { key: ViewTab; label: string }[] = [
    { key: 'calendar', label: 'Calendar' },
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'summary', label: 'Summary' },
    { key: 'description', label: 'Description' },
  ];

  const [selectedDateForDisplay, setSelectedDateForDisplay] = useState<Date | null>(null);

  const handleDayClickWithDate = (date: Date, dayTransactions: any[]) => {
    setSelectedDateForDisplay(date);
    setSelectedDayTransactions(dayTransactions);
  };

  const renderCalendarView = () => (
    <div>
      <TransactionCalendar
        transactions={getMonthTransactions()}
        installments={installments}
        recurringPayments={recurringPayments}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onDayClick={handleDayClickWithDate}
      />

      {/* Selected Day Transactions */}
      <div className="px-6 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Selected Day Transactions</h3>
          {selectedDateForDisplay && (
            <span className="text-xs font-medium px-2 py-1 bg-zinc-800 rounded-lg text-zinc-400">
              {selectedDateForDisplay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        
        {selectedDayTransactions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <p>Click on a date to view transactions</p>
          </div>
        ) : (
          <div className="space-y-2 pb-24">
            {selectedDayTransactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'income' 
                      ? 'bg-emerald-500/10' 
                      : tx.type === 'transfer' 
                        ? 'bg-blue-500/10' 
                        : 'bg-rose-500/10'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp size={18} className="text-emerald-500" />
                    ) : tx.type === 'transfer' ? (
                      <ArrowLeftRight size={18} className="text-blue-500" />
                    ) : (
                      <TrendingDown size={18} className="text-rose-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-white">{tx.note || 'No description'}</h4>
                    <p className="text-xs text-zinc-500">{tx.category || 'Uncategorized'}</p>
                  </div>
                </div>
                <span className={`font-bold ${
                  tx.type === 'income' 
                    ? 'text-emerald-500' 
                    : tx.type === 'transfer' 
                      ? 'text-blue-500' 
                      : 'text-rose-500'
                }`}>
                  {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}RM {tx.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderDailyView = () => {
    const grouped = getDailyGroupedTransactions();

    return (
      <div className="p-4 space-y-4">
        {grouped.length === 0 ? (
          <div className="text-center text-slate-500 py-8">No transactions this month</div>
        ) : (
          grouped.map(([date, txs]) => {
            const dayIncome = txs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
            const dayExpense = txs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);

            return (
              <div key={date} className="bg-[#1a1d24]/60 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d24]">
                  <div className="text-sm text-slate-300">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-emerald-400">+{dayIncome.toFixed(2)}</span>
                    <span className="text-red-400">-{dayExpense.toFixed(2)}</span>
                  </div>
                </div>
                <div className="divide-y divide-white/5">
                  {txs.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                          {tx.type === 'income' ? <TrendingUp size={16} /> : tx.type === 'transfer' ? <ArrowLeftRight size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div>
                          <div className="text-sm text-white">{tx.note || 'No description'}</div>
                          <div className="text-xs text-slate-500">{tx.category}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`font-medium ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-blue-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}RM {tx.amount.toFixed(2)}
                        </div>
                        <button onClick={() => handleEdit(tx)} className="p-1 hover:bg-white/10 rounded text-slate-400">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1 hover:bg-white/10 rounded text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const monthlyData: Record<string, { income: number; expense: number; transactions: any[] }> = {};

    transactions.forEach(tx => {
      const date = new Date(tx.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0, transactions: [] };
      }

      if (tx.type === 'income') {
        monthlyData[monthKey].income += tx.amount;
      } else {
        monthlyData[monthKey].expense += tx.amount;
      }
      monthlyData[monthKey].transactions.push(tx);
    });

    const sortedMonths = Object.entries(monthlyData).sort(([a], [b]) => b.localeCompare(a));

    return (
      <div className="p-4 space-y-3">
        {sortedMonths.map(([month, data]) => {
          const [year, monthNum] = month.split('-');
          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          return (
            <div key={month} className="bg-[#1a1d24]/60 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-medium">{monthName}</div>
                <div className="text-xs text-slate-500">{data.transactions.length} transactions</div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Income</div>
                  <div className="text-emerald-400 font-semibold">+RM {data.income.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Expense</div>
                  <div className="text-red-400 font-semibold">-RM {data.expense.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Net</div>
                  <div className={`font-semibold ${data.income - data.expense >= 0 ? 'text-white' : 'text-red-400'}`}>
                    RM {(data.income - data.expense).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSummaryView = () => {
    const summary = getMonthlySummary();

    return (
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-xs text-emerald-400 mb-1">Income</div>
            <div className="text-xl font-bold text-white">+RM {summary.income.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-4">
            <div className="text-xs text-red-400 mb-1">Expense</div>
            <div className="text-xl font-bold text-white">-RM {summary.expense.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
            <div className="text-xs text-blue-400 mb-1">Net</div>
            <div className={`text-xl font-bold ${summary.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              RM {summary.total.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="bg-[#1a1d24]/60 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Expense by Category</h3>
          <div className="space-y-3">
            {Object.entries(summary.categoryBreakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([category, amount]) => {
                const amountNum = amount as number;
                const percentage = summary.expense > 0 ? (amountNum / summary.expense) * 100 : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{category}</span>
                      <span className="text-slate-400">RM {amountNum.toFixed(2)} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-[#0f1115] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderDescriptionView = () => (
    <div className="p-4">
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full bg-[#1a1d24] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="bg-[#1a1d24] border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <div className="space-y-2">
        {filteredTransactions.slice(0, 50).map((tx) => {
          const account = accounts.find(a => a.id === tx.account_id);
          return (
            <div key={tx.id} className="bg-[#1a1d24]/60 rounded-xl p-4 hover:bg-[#1a1d24] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                    {tx.type === 'income' ? <TrendingUp size={18} /> : tx.type === 'transfer' ? <ArrowLeftRight size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{tx.note || 'No description'}</div>
                    <div className="text-xs text-slate-500">
                      {tx.category} • {account?.name} • {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-blue-400' : 'text-red-400'}`}>
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-'}RM {tx.amount.toFixed(2)}
                  </div>
                  <button onClick={() => handleEdit(tx)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="p-2 hover:bg-white/10 rounded-lg text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0f1115]">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-[#0f1115]">
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h1 className="text-xl font-semibold">Transactions</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="px-8 mt-4">
          <div className="flex items-center gap-8 border-b border-zinc-800">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  activeTab === tab.key
                    ? 'text-violet-400 border-b-2 border-violet-500'
                    : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 bg-[#0f1115]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Loading transactions...</div>
            </div>
          ) : (
            <>
              {activeTab === 'calendar' && renderCalendarView()}
              {activeTab === 'daily' && renderDailyView()}
              {activeTab === 'monthly' && renderMonthlyView()}
              {activeTab === 'summary' && renderSummaryView()}
              {activeTab === 'description' && renderDescriptionView()}
            </>
          )}
        </div>

        <button
          onClick={handleCreate}
          className="fixed bottom-10 right-10 w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-40"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {formData.type === 'transfer' ? 'From Account' : 'Account'}
                </label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {/* To Account - only show for transfers */}
              {formData.type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-blue-400 mb-2">To Account</label>
                  <select
                    value={formData.to_account_id}
                    onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
                    className="w-full bg-[#0f1115] border border-blue-500/30 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select Destination Account</option>
                    {accounts.filter(acc => acc.id !== parseInt(formData.account_id as string)).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${formData.type === 'expense'
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-400'
                      : 'bg-[#0f1115] border border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                  >
                    💸 Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${formData.type === 'income'
                      ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400'
                      : 'bg-[#0f1115] border border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                  >
                    💰 Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'transfer' })}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${formData.type === 'transfer'
                      ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                      : 'bg-[#0f1115] border border-white/10 text-slate-400 hover:bg-white/5'
                      }`}
                  >
                    ↔️ Transfer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, amount: val });
                    }
                  }}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  placeholder="e.g., Grocery shopping"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="General">📦 General</option>
                  <option value="Income">💰 Income</option>
                  {budgets.map(budget => (
                    <option key={budget.id} value={budget.name}>
                      {budget.icon || '📦'} {budget.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/30"
                >
                  {editingTransaction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
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
        onTryAgain={statusModal.status === 'error' ? () => {
          setStatusModal({ ...statusModal, isOpen: false });
          setShowModal(true);
        } : undefined}
      />
    </div>
  );
};

export default TransactionsPage;
