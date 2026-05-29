import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Sidebar, TransactionCalendar, StatusModal, TransactionModal } from '../../shared/components';
import type { TransactionResult, EditableTransaction } from '../../shared/components/TransactionModal';
import api from '../../api/axios';

type ViewTab = 'calendar' | 'list';

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
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<any[]>([]);
  const [selectedDateForDisplay, setSelectedDateForDisplay] = useState<Date | null>(null);

  // Clear selected day when month changes
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    setSelectedDayTransactions([]);
    setSelectedDateForDisplay(null);
  };
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

      const [userRes, accountsRes, transactionsRes, installmentsRes, recurringRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/accounts'),
        api.get('/transactions?limit=500'),
        api.get('/installments').catch(() => ({ data: [] })),
        api.get('/recurring-payments').catch(() => ({ data: [] }))
      ]);

      const userData = userRes.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setAccounts(accountsRes.data);
      setTransactions(transactionsRes.data);
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
    setEditingTx(null);
    setShowTxModal(true);
  };

  const handleEdit = (transaction: any) => {
    setEditingTx({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note,
      category: transaction.category,
      date: transaction.date,
      account_id: transaction.account_id,
      budget_id: transaction.budget_id,
      to_account_id: transaction.to_account_id,
    });
    setShowTxModal(true);
  };

  const handleTxSuccess = async (result?: TransactionResult) => {
    await loadData();
    const acc = accounts.find((a) => a.id === parseInt(String(result?.accountName ?? '')));
    setStatusModal({
      isOpen: true,
      status: 'success',
      title: result?.isEdit ? 'Transaction Updated' : 'Transaction Successful',
      message: result?.type === 'transfer' ? 'Transfer completed successfully.' : 'Your transaction has been recorded.',
      details: result ? {
        amount: result.amount,
        to: result.note || result.category,
        category: result.category,
        account: result.accountName || acc?.name,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      } : {},
    });
  };

  const handleDelete = (transactionId: number) => {
    setDeleteConfirm(transactionId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteConfirm(null);
    try {
      await api.delete(`/transactions/${deleteConfirm}`);
      await loadData();
      setStatusModal({ isOpen: true, status: 'success', title: 'Deleted', message: 'Transaction removed successfully.', details: {} });
    } catch (err: any) {
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setStatusModal({ isOpen: true, status: 'error', title: 'Delete Failed', message: err.response?.data?.detail || err.message, details: {} });
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

  const filteredTransactions = transactions.filter(tx => {
    // List view should only show transactions in the currently-selected month
    const txDate = new Date(tx.date);
    if (txDate.getUTCFullYear() !== currentDate.getFullYear() || txDate.getUTCMonth() !== currentDate.getMonth()) {
      return false;
    }
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
    { key: 'list', label: 'List' },
  ];

  const handleDayClickWithDate = (date: Date, dayTransactions: any[]) => {
    setSelectedDateForDisplay(date);
    setSelectedDayTransactions(dayTransactions);
  };

  const getIconForCategory = (category: string): string => {
    const icons: Record<string, string> = {
      'Food': 'restaurant', 'Dining': 'restaurant', 'Groceries': 'shopping_cart',
      'Lunch': 'restaurant', 'Dinner': 'restaurant', 'Breakfast': 'local_cafe',
      'Transport': 'directions_car', 'Transportation': 'directions_car',
      'Shopping': 'shopping_bag', 'Entertainment': 'movie',
      'Subscription': 'subscriptions', 'Subscriptions': 'subscriptions',
      'Utilities': 'bolt', 'Bills': 'receipt', 'Healthcare': 'medical_services',
      'Health': 'favorite', 'Salary': 'payments', 'Income': 'payments',
      'Savings': 'savings', 'Transfer': 'swap_horiz', 'Education': 'school',
      'Travel': 'flight', 'Coffee': 'local_cafe', 'Social': 'people',
      'Gifts': 'card_giftcard', 'Insurance': 'shield', 'Housing': 'home',
      'Rent': 'home', 'Pets': 'pets', 'Kids': 'child_care',
    };
    return icons[category] || 'receipt_long';
  };

  const getAccountName = (accountId: number): string =>
    accounts.find(a => a.id === accountId)?.name ?? 'Unknown';

  const formatTime = (dateString: string): string =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getDayLabel = (dateKey: string): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const d = new Date(dateKey + 'T12:00:00');
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderTxRow = (tx: any) => {
    const icon = getIconForCategory(tx.category || '');
    const time = formatTime(tx.date);
    const accountName = getAccountName(tx.account_id);
    const amountColor = tx.type === 'income' ? 'text-emerald-400' : tx.type === 'transfer' ? 'text-blue-400' : 'text-rose-400';
    const iconBg = tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : tx.type === 'transfer' ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400';
    const prefix = tx.type === 'income' ? '+' : tx.type === 'transfer' ? '↔' : '-';
    return (
      <div
        key={tx.id}
        className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer relative"
        onClick={() => handleEdit(tx)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{tx.note || 'No description'}</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {tx.category || 'Uncategorized'} · {accountName} · {time}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-bold ${amountColor}`}>
            {prefix}RM {tx.amount.toFixed(2)}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
              className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors"
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
              className="p-1.5 hover:bg-rose-500/20 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => (
    <div>
      <TransactionCalendar
        transactions={getMonthTransactions()}
        installments={installments}
        recurringPayments={recurringPayments}
        currentDate={currentDate}
        onDateChange={handleDateChange}
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
          <div className="text-center py-8 text-zinc-500 text-sm">
            <span className="material-symbols-outlined text-3xl block mb-2 text-zinc-700">touch_app</span>
            Click a date to view transactions
          </div>
        ) : (
          <div className="pb-24 rounded-2xl overflow-hidden border border-zinc-800 divide-y divide-zinc-800/50">
            {selectedDayTransactions.map((tx: any) => renderTxRow(tx))}
          </div>
        )}
      </div>
    </div>
  );

  const renderListView = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    const todayTxs = filteredTransactions.filter(tx => new Date(tx.date).toDateString() === todayStr);
    const yesterdayTxs = filteredTransactions.filter(tx => new Date(tx.date).toDateString() === yesterdayStr);
    const earlierTxs = filteredTransactions
      .filter(tx => { const d = new Date(tx.date).toDateString(); return d !== todayStr && d !== yesterdayStr; })
      .slice(0, 50);

    const groups: { label: string; txs: any[] }[] = [
      ...(todayTxs.length > 0 ? [{ label: 'Today', txs: todayTxs }] : []),
      ...(yesterdayTxs.length > 0 ? [{ label: 'Yesterday', txs: yesterdayTxs }] : []),
      ...(earlierTxs.length > 0 ? [{ label: 'Earlier', txs: earlierTxs }] : []),
    ];

    return (
      <div>
        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3 p-4 pb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {/* Grouped transaction list */}
        {groups.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 text-sm">No transactions found</div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {groups.map(({ label, txs }) => (
              <div key={label}>
                <div className="sticky top-0 z-10 px-4 py-2 bg-[#0f1115]/95 backdrop-blur-sm border-b border-zinc-800/50">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
                </div>
                <div className="divide-y divide-zinc-800/30">
                  {txs.map((tx: any) => renderTxRow(tx))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0f1115]">
        {/* Header */}
        <header className="h-16 flex items-center px-8 border-b border-zinc-800 bg-[#0f1115]">
          <h1 className="text-xl font-semibold">Transactions</h1>
        </header>

        {/* Tabs + account filter */}
        <div className="px-8 mt-4">
          <div className="flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-8">
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
            {accounts.length > 1 && (
              <div className="mb-1">
                <select
                  value={filters.accountId}
                  onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
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
              {activeTab === 'list' && renderListView()}
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

      {/* Shared transaction modal — create & edit */}
      <TransactionModal
        isOpen={showTxModal}
        onClose={() => { setShowTxModal(false); setEditingTx(null); }}
        onSuccess={handleTxSuccess}
        editTransaction={editingTx ?? undefined}
      />

      {/* Delete confirmation overlay */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Transaction?</h3>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all text-sm font-semibold"
              >
                Delete
              </button>
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
        onTryAgain={statusModal.status === 'error' ? () => {
          setStatusModal({ ...statusModal, isOpen: false });
          setShowTxModal(true);
        } : undefined}
      />
    </div>
  );
};

export default TransactionsPage;
