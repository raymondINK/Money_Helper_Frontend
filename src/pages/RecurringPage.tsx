import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, X, Calendar, CreditCard, Wallet, TrendingUp, Clock,
  Repeat, DollarSign, ChevronRight, Edit2, Trash2, Check,
  AlertCircle, Play, Pause
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

  // Form states
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
    // For installments
    total_amount: '',
    monthly_amount: '',
    total_months: '',
    // For income
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
      setInstallments(installmentsRes.data);
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
      let itemName = formData.name;
      let amount = 0;

      if (modalType === 'payments') {
        amount = parseFloat(formData.amount);
        await api.post('/recurring-payments', {
          name: formData.name,
          icon: formData.icon,
          amount: amount,
          category: formData.category,
          frequency: formData.frequency,
          start_date: new Date(formData.start_date).toISOString(),
          account_id: parseInt(formData.account_id),
          auto_add: formData.auto_add,
          reminder_days: formData.reminder_days
        });
      } else if (modalType === 'income') {
        amount = parseFloat(formData.amount);
        await api.post('/recurring-income', {
          name: formData.name,
          icon: formData.icon,
          amount: amount,
          category: formData.category,
          frequency: formData.frequency,
          expected_date: formData.expected_date,
          is_variable: formData.is_variable,
          account_id: parseInt(formData.account_id)
        });
      } else if (modalType === 'installments') {
        amount = parseFloat(formData.monthly_amount);
        await api.post('/installments', {
          name: formData.name,
          icon: formData.icon,
          total_amount: parseFloat(formData.total_amount),
          monthly_amount: amount,
          total_months: parseInt(formData.total_months),
          start_date: new Date(formData.start_date).toISOString(),
          account_id: parseInt(formData.account_id),
          auto_add: formData.auto_add
        });
      }

      setShowModal(false);
      resetForm();
      await loadData();

      const selectedAccount = accounts.find(a => a.id === parseInt(formData.account_id));

      // Show success modal
      // Show success toast
      setToast({
        isVisible: true,
        message: `${modalType === 'payments' ? 'Payment' : modalType === 'income' ? 'Income' : 'Installment'} created successfully`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error creating:', err);

      // If it's a network error, the item might still have been created
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        console.log('Network error detected, but item may have been saved. Refreshing...');
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
      setToast({
        isVisible: true,
        message: 'Payment marked as paid',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error marking paid:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setToast({
          isVisible: true,
          message: err.response?.data?.message || err.message,
          type: 'error'
        });
      }
    }
  };

  const handleMarkReceived = async (id: number) => {
    try {
      await api.post(`/recurring-income/${id}/mark-received`);
      await loadData();
      setToast({
        isVisible: true,
        message: 'Income marked as received',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error marking received:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setToast({
          isVisible: true,
          message: err.response?.data?.message || err.message,
          type: 'error'
        });
      }
    }
  };

  const handleInstallmentPayment = async (id: number) => {
    try {
      await api.post(`/installments/${id}/pay`);
      await loadData();
      setToast({
        isVisible: true,
        message: 'Installment payment recorded',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error recording payment:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setToast({
          isVisible: true,
          message: err.response?.data?.message || err.message,
          type: 'error'
        });
      }
    }
  };

  const handleDelete = async (type: TabType, id: number) => {
    if (!confirm('Are you sure you want to delete this?')) return;

    try {
      if (type === 'payments') {
        await api.delete(`/recurring-payments/${id}`);
      } else if (type === 'income') {
        await api.delete(`/recurring-income/${id}`);
      } else {
        await api.delete(`/installments/${id}`);
      }
      await loadData();
      setToast({
        isVisible: true,
        message: 'Item deleted successfully',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error deleting:', err);
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        await loadData();
      } else {
        setToast({
          isVisible: true,
          message: err.response?.data?.message || err.message,
          type: 'error'
        });
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-400">Overdue</span>;
    if (days === 0) return <span className="text-yellow-400">Today</span>;
    if (days === 1) return <span className="text-yellow-400">Tomorrow</span>;
    return <span className="text-slate-400">{days} days</span>;
  };

  const frequencyIcons: Record<string, string> = {
    daily: '📅',
    weekly: '📆',
    biweekly: '🗓️',
    monthly: '📅',
    quarterly: '📊',
    yearly: '🎉'
  };

  const tabs = [
    { key: 'payments' as TabType, label: 'Recurring Payments', icon: CreditCard, count: payments.length },
    { key: 'income' as TabType, label: 'Recurring Income', icon: TrendingUp, count: incomes.length },
    { key: 'installments' as TabType, label: 'Installments', icon: Clock, count: installments.length },
  ];

  const emojiOptions = ['💳', '📱', '🎬', '🎮', '🏋️', '📶', '💡', '🏠', '🚗', '💰', '💻', '📦', '🛒', '✈️', '🎓'];

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
        <div className="bg-gradient-to-r from-[#0f1115] to-[#1a1d24] border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl">
                  <Repeat className="w-6 h-6 text-white" />
                </div>
                Recurring & Installments
              </h1>
              <p className="text-slate-400 mt-1">Manage your recurring payments, income, and installment plans</p>
            </div>
            <button
              onClick={() => {
                setModalType(activeTab);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white font-medium hover:opacity-90 transition-all shadow-lg shadow-violet-500/20"
            >
              <Plus size={20} />
              Add New
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${activeTab === tab.key
                  ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <tab.icon size={18} />
                {tab.label}
                <span className="ml-1 px-2 py-0.5 text-xs bg-white/10 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {/* Recurring Payments Tab */}
              {activeTab === 'payments' && (
                payments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-400">No recurring payments yet</h3>
                    <p className="text-slate-500 text-sm mt-1">Add your subscriptions like Netflix, Gym, Phone bills</p>
                  </div>
                ) : (
                  payments.map(payment => {
                    const isPaidThisCycle = payment.last_paid_date && new Date(payment.last_paid_date).getMonth() === new Date().getMonth() && new Date(payment.last_paid_date).getFullYear() === new Date().getFullYear();

                    return (
                      <div key={payment.id} className={`bg-[#1a1d24]/80 border ${isPaidThisCycle ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-white/10'} rounded-2xl p-5 hover:border-violet-500/30 transition-all group`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{payment.icon}</div>
                            <div>
                              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                                {payment.name}
                                {isPaidThisCycle && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                                    Paid
                                  </span>
                                )}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full text-xs">
                                  {payment.frequency}
                                </span>
                                <span>•</span>
                                <span>{payment.category || 'Uncategorized'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className={`text-xl font-bold ${isPaidThisCycle ? 'text-emerald-400' : 'text-red-400'}`}>
                                -RM {payment.amount.toFixed(2)}
                              </div>
                              <div className="text-sm text-slate-500">
                                Next: {formatDate(payment.next_due_date)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isPaidThisCycle && (
                                <button
                                  onClick={() => handleMarkPaid(payment.id)}
                                  className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400"
                                  title="Mark as Paid"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete('payments', payment.id)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )
              )}

              {/* Recurring Income Tab */}
              {activeTab === 'income' && (
                incomes.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-400">No recurring income yet</h3>
                    <p className="text-slate-500 text-sm mt-1">Add your salary, freelance income, or side jobs</p>
                  </div>
                ) : (
                  incomes.map(income => {
                    const isReceivedThisCycle = income.last_received_date &&
                      new Date(income.last_received_date).getMonth() === new Date().getMonth() &&
                      new Date(income.last_received_date).getFullYear() === new Date().getFullYear();

                    return (
                      <div key={income.id} className={`bg-[#1a1d24]/80 border ${isReceivedThisCycle ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-white/10'} rounded-2xl p-5 hover:border-emerald-500/30 transition-all group`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">{income.icon}</div>
                            <div>
                              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                                {income.name}
                                {isReceivedThisCycle && (
                                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                                    Received
                                  </span>
                                )}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                                  {income.frequency}
                                </span>
                                <span>•</span>
                                <span>{income.category || 'Income'}</span>
                                {income.is_variable && (
                                  <>
                                    <span>•</span>
                                    <span className="text-yellow-400">Variable</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className={`text-xl font-bold ${isReceivedThisCycle ? 'text-emerald-400' : 'text-slate-200'}`}>+RM {income.amount.toFixed(2)}</div>
                              <div className="text-sm text-slate-500">
                                Expected: {formatDate(income.next_expected_date)} ({getDaysUntil(income.next_expected_date)})
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isReceivedThisCycle && (
                                <button
                                  onClick={() => handleMarkReceived(income.id)}
                                  className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Mark as Received"
                                >
                                  <Check size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete('income', income.id)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )
              )}

              {/* Installments Tab */}
              {activeTab === 'installments' && (
                installments.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-400">No installments yet</h3>
                    <p className="text-slate-500 text-sm mt-1">Track your installment plans for phones, laptops, cars, etc.</p>
                  </div>
                ) : (
                  installments.map(inst => (
                    <div key={inst.id} className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{inst.icon}</div>
                          <div>
                            <h3 className="font-semibold text-white text-lg">{inst.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>RM {inst.monthly_amount.toFixed(2)}/month</span>
                              <span>•</span>
                              <span>{inst.paid_months} of {inst.total_months} months paid</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleInstallmentPayment(inst.id)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400"
                            title="Record Payment"
                          >
                            <DollarSign size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete('installments', inst.id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="h-3 bg-[#0f1115] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                            style={{ width: `${inst.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="text-slate-400">
                          <span className="text-blue-400 font-medium">RM {inst.paid_months * inst.monthly_amount}</span> paid
                        </div>
                        <div className="text-slate-400">
                          <span className="text-white font-medium">{inst.progress_percentage.toFixed(0)}%</span> complete
                        </div>
                        <div className="text-slate-400">
                          <span className="text-orange-400 font-medium">RM {inst.remaining_amount.toFixed(2)}</span> remaining
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-white/5 text-sm text-slate-500">
                        Next payment: {formatDate(inst.next_payment_date)} ({getDaysUntil(inst.next_payment_date)})
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">
                Add {modalType === 'payments' ? 'Recurring Payment' : modalType === 'income' ? 'Recurring Income' : 'Installment'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Icon & Name */}
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Icon</label>
                  <select
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    className="w-16 h-12 bg-white/5 border border-white/10 rounded-xl text-center text-2xl focus:outline-none focus:border-violet-500/50"
                  >
                    {emojiOptions.map(emoji => (
                      <option key={emoji} value={emoji}>{emoji}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    placeholder={modalType === 'payments' ? 'Netflix, Gym...' : modalType === 'income' ? 'Salary, Freelance...' : 'iPhone, Laptop...'}
                    required
                  />
                </div>
              </div>

              {/* Amount / Total Amount */}
              {modalType === 'installments' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Total Amount (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_amount}
                      onChange={e => setFormData({ ...formData, total_amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                      placeholder="5999"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Monthly (RM)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthly_amount}
                      onChange={e => setFormData({ ...formData, monthly_amount: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                      placeholder="250"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    placeholder="55.00"
                    required
                  />
                </div>
              )}

              {/* Total Months (for installments) */}
              {modalType === 'installments' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Total Months</label>
                  <input
                    type="number"
                    value={formData.total_months}
                    onChange={e => setFormData({ ...formData, total_months: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    placeholder="24"
                    required
                  />
                </div>
              )}

              {/* Frequency (for payments and income) */}
              {modalType !== 'installments' && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              )}

              {/* Expected Date (for income) */}
              {modalType === 'income' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">Expected Day of Month</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.expected_date}
                      onChange={e => setFormData({ ...formData, expected_date: parseInt(e.target.value) })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">Variable Amount?</label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_variable: !formData.is_variable })}
                      className={`w-full py-3 rounded-xl border transition-all ${formData.is_variable
                        ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                        : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                    >
                      {formData.is_variable ? 'Yes, varies' : 'No, fixed'}
                    </button>
                  </div>
                </div>
              )}

              {/* Account & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Account</label>
                  <select
                    value={formData.account_id}
                    onChange={e => setFormData({ ...formData, account_id: e.target.value, category: '' })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                    required
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category</label>
                  <div className="relative">
                    <select
                      value={
                        budgets.some(b => b.name === formData.category)
                          ? formData.category
                          : (formData.category ? 'custom' : '')
                      }
                      onChange={e => {
                        if (e.target.value === 'custom') {
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 appearance-none"
                    >
                      <option value="" disabled>Select a Budget Category</option>
                      {budgets.map(budget => (
                        <option key={budget.id} value={budget.name}>{budget.name}</option>
                      ))}
                      <option value="custom">Other (Custom)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight className="rotate-90 w-4 h-4" />
                    </div>
                  </div>

                  {/* Custom Category Input if 'Other' is selected or no match */}
                  {(formData.category === '' || !budgets.some(b => b.name === formData.category)) && (
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50 mt-2"
                      placeholder="Enter custom category..."
                    />
                  )}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/50"
                  required
                />
              </div>

              {/* Auto Add Toggle (for payments and installments) */}
              {modalType !== 'income' && (
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-white">Auto-add Transaction</div>
                    <div className="text-xs text-slate-400">Automatically record when due</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, auto_add: !formData.auto_add })}
                    className={`w-12 h-6 rounded-full transition-colors ${formData.auto_add ? 'bg-violet-500' : 'bg-slate-600'
                      }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${formData.auto_add ? 'translate-x-6' : 'translate-x-0'
                      }`} />
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white font-semibold hover:opacity-90 transition-all"
              >
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
