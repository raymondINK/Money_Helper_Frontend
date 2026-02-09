import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Calendar, CreditCard, TrendingUp, Clock,
  DollarSign, Trash2, Check, Sparkles
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/Toast';
import api from '../api/axios';

type TabType = 'payments' | 'income' | 'installments';

interface RecurringPayment {
  id: number;
  name: string;
  icon: string;
  amount: number;
  category: string;
  frequency: string;
  next_due_date: string;
  status: string;
  auto_add: boolean;
  account_id: number;
  last_paid_date?: string | null;
}

interface RecurringIncome {
  id: number;
  name: string;
  icon: string;
  amount: number;
  category: string;
  frequency: string;
  next_expected_date: string;
  is_variable: boolean;
  status: string;
  account_id: number;
  last_received_date?: string | null;
}

interface Installment {
  id: number;
  name: string;
  icon: string;
  total_amount: number;
  monthly_amount: number;
  total_months: number;
  paid_months: number;
  remaining_months: number;
  remaining_amount: number;
  progress_percentage: number;
  next_payment_date: string;
  status: string;
  account_id: number;
}

interface Account {
  id: number;
  name: string;
}

interface Budget {
  id: number;
  name: string;
  icon: string;
  account_id: number;
}

const RecurringPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('payments');
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [incomes, setIncomes] = useState<RecurringIncome[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<TabType>('payments');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info'
  });
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  const [formData, setFormData] = useState({
    name: '',
    icon: '💳',
    amount: '',
    category: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    account_id: '',
    auto_add: false,
    reminder_days: 3,
    total_amount: '',
    monthly_amount: '',
    total_months: '',
    expected_date: 1,
    is_variable: false
  });

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

      const [paymentsRes, incomesRes, installmentsRes, accountsRes, budgetsRes] = await Promise.all([
        api.get('/recurring-payments'),
        api.get('/recurring-income'),
        api.get('/installments'),
        api.get('/accounts'),
        api.get('/budgets')
      ]);

      setPayments(paymentsRes.data);
      setIncomes(incomesRes.data);
      const activeInstallments = (installmentsRes.data || []).filter((inst: Installment) => inst.status !== 'completed');
      setInstallments(activeInstallments);
      setAccounts(accountsRes.data);
      setBudgets(budgetsRes.data || []);

      if (accountsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, account_id: accountsRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error(err);
      if ((err as any).response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (modalType === 'payments') {
        await api.post('/recurring-payments', {
          name: formData.name,
          icon: formData.icon,
          amount: parseFloat(formData.amount),
          category: formData.category,
          frequency: formData.frequency,
          start_date: new Date(formData.start_date).toISOString(),
          account_id: parseInt(formData.account_id),
          auto_add: formData.auto_add,
          reminder_days: formData.reminder_days
        });
      } else if (modalType === 'income') {
        await api.post('/recurring-income', {
          name: formData.name,
          icon: formData.icon,
          amount: parseFloat(formData.amount),
          category: formData.category,
          frequency: formData.frequency,
          expected_date: formData.expected_date,
          is_variable: formData.is_variable,
          account_id: parseInt(formData.account_id)
        });
      } else if (modalType === 'installments') {
        await api.post('/installments', {
          name: formData.name,
          icon: formData.icon,
          total_amount: parseFloat(formData.total_amount),
          monthly_amount: parseFloat(formData.monthly_amount),
          total_months: parseInt(formData.total_months),
          start_date: new Date(formData.start_date).toISOString(),
          account_id: parseInt(formData.account_id),
          auto_add: formData.auto_add
        });
      }

      setShowModal(false);
      resetForm();
      await loadData();

      setToast({
        isVisible: true,
        message: `${modalType === 'payments' ? 'Payment' : modalType === 'income' ? 'Income' : 'Installment'} created successfully`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error creating:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setShowModal(false);
        resetForm();
        await loadData();
      } else {
        setShowModal(false);
        setToast({
          isVisible: true,
          message: err.response?.data?.message || err.message || 'Failed to create item',
          type: 'error'
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '💳',
      amount: '',
      category: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      account_id: accounts[0]?.id.toString() || '',
      auto_add: false,
      reminder_days: 3,
      total_amount: '',
      monthly_amount: '',
      total_months: '',
      expected_date: 1,
      is_variable: false
    });
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await api.post(`/recurring-payments/${id}/mark-paid`);
      await loadData();
      setToast({ isVisible: true, message: 'Payment marked as paid', type: 'success' });
    } catch (err: any) {
      if (err.message === 'Network Error') await loadData();
      else setToast({ isVisible: true, message: err.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleMarkReceived = async (id: number) => {
    try {
      await api.post(`/recurring-income/${id}/mark-received`);
      await loadData();
      setToast({ isVisible: true, message: 'Income marked as received', type: 'success' });
    } catch (err: any) {
      if (err.message === 'Network Error') await loadData();
      else setToast({ isVisible: true, message: err.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleInstallmentPayment = async (id: number) => {
    try {
      await api.post(`/installments/${id}/pay`);
      await loadData();
      setToast({ isVisible: true, message: 'Installment payment recorded', type: 'success' });
    } catch (err: any) {
      if (err.message === 'Network Error') await loadData();
      else setToast({ isVisible: true, message: err.response?.data?.message || err.message, type: 'error' });
    }
  };

  const handleDelete = async (type: TabType, id: number) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      if (type === 'payments') await api.delete(`/recurring-payments/${id}`);
      else if (type === 'income') await api.delete(`/recurring-income/${id}`);
      else await api.delete(`/installments/${id}`);
      await loadData();
      setToast({ isVisible: true, message: 'Item deleted successfully', type: 'success' });
    } catch (err: any) {
      if (err.message === 'Network Error') await loadData();
      else setToast({ isVisible: true, message: err.response?.data?.message || err.message, type: 'error' });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: 'Overdue', color: 'text-red-400' };
    if (days === 0) return { text: 'Today', color: 'text-yellow-400' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-yellow-400' };
    return { text: `${days} days left`, color: 'text-zinc-400' };
  };

  const tabs = [
    { key: 'payments' as TabType, label: 'Recurring Payments', icon: CreditCard, count: payments.length },
    { key: 'income' as TabType, label: 'Recurring Income', icon: TrendingUp, count: incomes.length },
    { key: 'installments' as TabType, label: 'Installments', icon: Clock, count: installments.length },
  ];

  const emojiOptions = ['💳', '📱', '🎬', '🎮', '🏋️', '📶', '💡', '🏠', '🚗', '💰', '💻', '📦', '🛒', '✈️', '🎓'];

  // Calculate totals
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalInstallments = installments.reduce((sum, i) => sum + i.monthly_amount, 0);
  const upcomingTotal = totalPayments + totalInstallments;
  
  const paidPayments = payments.filter(p => {
    return p.last_paid_date && 
      new Date(p.last_paid_date).getMonth() === new Date().getMonth() && 
      new Date(p.last_paid_date).getFullYear() === new Date().getFullYear();
  });
  const paidTotal = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingTotal = upcomingTotal - paidTotal;

  const getUpcomingItems = () => {
    const items: { name: string; amount: number; date: string; type: string; icon: string }[] = [];
    
    payments.forEach(p => {
      const isPaid = p.last_paid_date && new Date(p.last_paid_date).getMonth() === new Date().getMonth();
      if (!isPaid) items.push({ name: p.name, amount: p.amount, date: p.next_due_date, type: 'payment', icon: p.icon });
    });
    
    installments.forEach(i => {
      items.push({ name: i.name, amount: i.monthly_amount, date: i.next_payment_date, type: 'installment', icon: i.icon });
    });
    
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
  };

  const totalMonthlyIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const burnRate = totalMonthlyIncome > 0 ? Math.round((upcomingTotal / totalMonthlyIncome) * 100) : 0;

  // Generate calendar days with payment indicators
  const generateCalendarDays = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentDay = now.getDate();
    
    // Get first day of visible range (start from current week)
    const startDay = Math.max(1, currentDay - (currentDay % 7));
    const days: { day: number; hasPayment: boolean; color: string }[] = [];
    
    // Get all payment dates for this month
    const paymentDays = new Map<number, string>();
    
    payments.forEach(p => {
      const dueDate = new Date(p.next_due_date);
      if (dueDate.getMonth() === month && dueDate.getFullYear() === year) {
        paymentDays.set(dueDate.getDate(), 'rose');
      }
    });
    
    installments.forEach(i => {
      const payDate = new Date(i.next_payment_date);
      if (payDate.getMonth() === month && payDate.getFullYear() === year) {
        paymentDays.set(payDate.getDate(), 'amber');
      }
    });
    
    // Generate 14 days
    for (let i = 0; i < 14; i++) {
      const day = startDay + i;
      if (day <= 31) {
        const color = paymentDays.get(day) || '';
        days.push({ day, hasPayment: !!color, color });
      }
    }
    
    return days;
  };

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-800 bg-[#0f1115]">
          <div className="flex items-center gap-4">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-xl font-semibold">Recurring & Installments</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setModalType(activeTab); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-white font-medium transition-all"
            >
              <Plus size={18} />
              Add New
            </button>
            <button className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-zinc-900 rounded-xl w-fit">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Summary Card */}
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-6 rounded-2xl flex items-center justify-between relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl"></div>
              <div>
                <p className="text-sm text-zinc-400 font-medium">Upcoming total for {currentMonth}</p>
                <h3 className="text-3xl font-bold mt-1 text-violet-400">RM {upcomingTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider justify-end">
                  <Check size={14} />
                  RM {paidTotal.toFixed(2)} Paid
                </div>
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider justify-end">
                  <Clock size={14} />
                  RM {pendingTotal.toFixed(2)} Pending
                </div>
              </div>
            </div>

            {/* Items List */}
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Recurring Payments */}
                {activeTab === 'payments' && (
                  payments.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard size={48} className="mx-auto text-zinc-600 mb-4" />
                      <h3 className="text-lg font-medium text-zinc-400">No recurring payments yet</h3>
                      <p className="text-zinc-500 text-sm mt-1">Add your subscriptions like Netflix, Gym, Phone bills</p>
                    </div>
                  ) : (
                    payments.map(payment => {
                      const isPaidThisCycle = payment.last_paid_date && 
                        new Date(payment.last_paid_date).getMonth() === new Date().getMonth() && 
                        new Date(payment.last_paid_date).getFullYear() === new Date().getFullYear();

                      return (
                        <div key={payment.id} className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition-all cursor-pointer group">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            isPaidThisCycle ? 'bg-emerald-500/10' : 'bg-rose-500/10'
                          }`}>
                            {payment.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{payment.name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isPaidThisCycle 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {isPaidThisCycle ? 'Paid' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {payment.frequency}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Next: {formatDate(payment.next_due_date)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-rose-400">-RM {payment.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{payment.category || 'Uncategorized'}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isPaidThisCycle && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkPaid(payment.id); }}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete('payments', payment.id); }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* Recurring Income */}
                {activeTab === 'income' && (
                  incomes.length === 0 ? (
                    <div className="text-center py-12">
                      <TrendingUp size={48} className="mx-auto text-zinc-600 mb-4" />
                      <h3 className="text-lg font-medium text-zinc-400">No recurring income yet</h3>
                      <p className="text-zinc-500 text-sm mt-1">Add your salary, freelance income, or side jobs</p>
                    </div>
                  ) : (
                    incomes.map(income => {
                      const isReceivedThisCycle = income.last_received_date &&
                        new Date(income.last_received_date).getMonth() === new Date().getMonth() &&
                        new Date(income.last_received_date).getFullYear() === new Date().getFullYear();

                      return (
                        <div key={income.id} className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition-all cursor-pointer group">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                            isReceivedThisCycle ? 'bg-emerald-500/10' : 'bg-zinc-800'
                          }`}>
                            {income.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{income.name}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isReceivedThisCycle 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {isReceivedThisCycle ? 'Received' : 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {income.frequency}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Next: {formatDate(income.next_expected_date)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-400">+RM {income.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{income.category || 'Income'}</p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isReceivedThisCycle && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkReceived(income.id); }}
                                className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400"
                              >
                                <Check size={16} />
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete('income', income.id); }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                )}

                {/* Installments */}
                {activeTab === 'installments' && (
                  installments.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock size={48} className="mx-auto text-zinc-600 mb-4" />
                      <h3 className="text-lg font-medium text-zinc-400">No installments yet</h3>
                      <p className="text-zinc-500 text-sm mt-1">Track your installment plans for phones, laptops, cars, etc.</p>
                    </div>
                  ) : (
                    installments.map(inst => (
                      <div key={inst.id} className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-4 rounded-2xl hover:border-zinc-700 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-2xl">
                            {inst.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{inst.name}</h4>
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase">
                                {inst.paid_months} / {inst.total_months} Payments
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Next: {formatDate(inst.next_payment_date)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-rose-400">-RM {inst.monthly_amount.toFixed(2)}</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                              RM {(inst.paid_months * inst.monthly_amount).toLocaleString()} of RM {inst.total_amount.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleInstallmentPayment(inst.id); }}
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400"
                            >
                              <DollarSign size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete('installments', inst.id); }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            <span>Progress</span>
                            <span>{inst.progress_percentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${inst.progress_percentage}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Insights */}
          <div className="w-80 border-l border-zinc-800 p-6 space-y-6 overflow-y-auto hidden xl:block">
            {/* Insights Card */}
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-6 rounded-2xl">
              <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-400" />
                Insights
              </h4>
              <div className="space-y-6">
                {/* Most Expensive */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Most Expensive</p>
                  <div className="space-y-3">
                    {[...payments].sort((a, b) => b.amount - a.amount).slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-lg">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">RM {item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {payments.length === 0 && <p className="text-sm text-zinc-500">No payments yet</p>}
                  </div>
                </div>

                {/* Payment Timeline */}
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Payment Timeline</p>
                  <div className="space-y-4 relative">
                    <div className="absolute left-4 top-6 bottom-0 w-px bg-zinc-800"></div>
                    {getUpcomingItems().map((item, idx) => {
                      const daysInfo = getDaysUntil(item.date);
                      const isFirst = idx === 0;
                      return (
                        <div key={idx} className="flex gap-4 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 border ${
                            isFirst ? 'bg-rose-500/20 border-rose-500/30' : 'bg-zinc-800 border-zinc-700'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isFirst ? 'bg-rose-500 animate-pulse' : 'bg-zinc-500'}`}></span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-semibold truncate">{item.name}</p>
                              <p className={`text-sm font-bold ${isFirst ? 'text-rose-400' : 'text-white'}`}>RM {item.amount}</p>
                            </div>
                            <p className={`text-[11px] mt-0.5 ${daysInfo.color}`}>
                              {formatDate(item.date)} ({daysInfo.text})
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {getUpcomingItems().length === 0 && <p className="text-sm text-zinc-500">No upcoming payments</p>}
                  </div>
                </div>

                {/* Monthly Burn Rate */}
                <div className="pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase">Monthly Burn Rate</span>
                    <span className="text-sm font-bold text-rose-400">{burnRate}% of Income</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${Math.min(burnRate, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Days Calendar */}
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-6 rounded-2xl">
              <h4 className="font-bold text-lg mb-4 flex items-center justify-between">
                Upcoming Days
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  {new Date().toLocaleString('default', { month: 'short' })} {new Date().getFullYear()}
                </span>
              </h4>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={i} className="text-[9px] text-zinc-600 font-bold uppercase">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((item, idx) => {
                  const isToday = item.day === new Date().getDate();
                  const colorClasses = item.hasPayment
                    ? item.color === 'rose'
                      ? 'bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                    : isToday
                      ? 'bg-violet-500/20 text-violet-400 font-bold border border-violet-500/30'
                      : 'text-zinc-400';
                  
                  return (
                    <div key={idx} className={`aspect-square flex items-center justify-center text-[10px] rounded-lg relative ${colorClasses}`}>
                      {item.day}
                      {item.hasPayment && (
                        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                          item.color === 'rose' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => { setModalType(activeTab); setShowModal(true); }}
        className="fixed bottom-10 right-10 w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-20"
      >
        <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-zinc-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">
                Add {modalType === 'payments' ? 'Recurring Payment' : modalType === 'income' ? 'Recurring Income' : 'Installment'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-16 h-12 bg-zinc-800 border border-zinc-700 rounded-xl text-center text-2xl focus:outline-none focus:border-violet-500/50"
                  >
                    {emojiOptions.map(emoji => <option key={emoji} value={emoji}>{emoji}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-zinc-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    placeholder={modalType === 'payments' ? 'Netflix, Gym...' : modalType === 'income' ? 'Salary...' : 'iPhone...'}
                    required
                  />
                </div>
              </div>

              {modalType === 'installments' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Total Amount (RM)</label>
                    <input type="number" step="0.01" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" placeholder="5999" required />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Monthly (RM)</label>
                    <input type="number" step="0.01" value={formData.monthly_amount} onChange={e => setFormData({ ...formData, monthly_amount: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" placeholder="250" required />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Amount (RM)</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" placeholder="55.00" required />
                </div>
              )}

              {modalType === 'installments' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Total Months</label>
                  <input type="number" value={formData.total_months} onChange={e => setFormData({ ...formData, total_months: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" placeholder="24" required />
                </div>
              )}

              {modalType !== 'installments' && (
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Frequency</label>
                  <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              {modalType === 'income' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-zinc-400 mb-1">Expected Day</label>
                    <input type="number" min="1" max="31" value={formData.expected_date} onChange={e => setFormData({ ...formData, expected_date: parseInt(e.target.value) })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-zinc-400 mb-1">Variable?</label>
                    <button type="button" onClick={() => setFormData({ ...formData, is_variable: !formData.is_variable })}
                      className={`w-full py-3 rounded-xl border transition-all ${formData.is_variable ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                      {formData.is_variable ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Account</label>
                  <select value={formData.account_id} onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" required>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50">
                    <option value="">Select</option>
                    {budgets.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    <option value="Entertainment">Entertainment</option>
                    <option value="Software">Software</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Start Date</label>
                <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50" required />
              </div>

              {modalType !== 'income' && (
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-white">Auto-add Transaction</div>
                    <div className="text-xs text-zinc-400">Automatically record when due</div>
                  </div>
                  <button type="button" onClick={() => setFormData({ ...formData, auto_add: !formData.auto_add })}
                    className={`w-12 h-6 rounded-full transition-colors ${formData.auto_add ? 'bg-violet-500' : 'bg-zinc-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${formData.auto_add ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all">
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringPage;
