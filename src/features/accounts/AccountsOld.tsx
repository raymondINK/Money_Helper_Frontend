import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, TrendingUp, X, Wallet } from 'lucide-react';
import { Sidebar } from '../../shared/components';
import api from '../../api/axios';

const AccountsOld = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    balance: 0,
    goal: 0
  });
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

      const [userRes, accountsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/accounts')
      ]);

      const userData = userRes.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setAccounts(accountsRes.data);
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
    setEditingAccount(null);
    setFormData({ name: '', type: 'checking', balance: 0, goal: 0 });
    setShowModal(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: account.balance,
      goal: account.goal || 0
    });
    setShowModal(true);
  };

  const handleDelete = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await api.delete(`/accounts/${accountId}`);
      await loadData();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Failed to delete account');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAccount) {
        await api.put(`/accounts/${editingAccount.id}`, formData);
      } else {
        await api.post('/accounts', formData);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      console.error('Error saving account:', err);
      alert('Failed to save account');
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalGoal = accounts.reduce((sum, acc) => sum + (acc.goal || 0), 0);

  return (
    <div className="flex h-screen bg-[#0f1115] text-white overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="bg-[#1a1d24]/90 backdrop-blur-md border-b border-white/10 p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Account Management</h1>
              <p className="text-slate-400">Manage your financial accounts and track your goals</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
            >
              <Plus size={20} />
              Add New Account
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
              <div className="text-sm text-blue-400 mb-1">Total Accounts</div>
              <div className="text-3xl font-bold text-white">{accounts.length}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="text-sm text-emerald-400 mb-1">Total Balance</div>
              <div className="text-3xl font-bold text-white">${totalBalance.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
              <div className="text-sm text-purple-400 mb-1">Total Goals</div>
              <div className="text-3xl font-bold text-white">${totalGoal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Loading accounts...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-[#1a1d24]/50 backdrop-blur-md border border-white/5 rounded-2xl">
              <Wallet size={64} className="text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No accounts yet</h3>
              <p className="text-slate-500 mb-6">Create your first account to start tracking your finances</p>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/30"
              >
                <Plus size={20} />
                Add New Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => {
                const progress = account.goal > 0 ? (account.balance / account.goal) * 100 : 0;
                const progressClamped = Math.min(progress, 100);

                return (
                  <div
                    key={account.id}
                    onClick={() => navigate(`/transactions?account_id=${account.id}`)}
                    className="bg-[#1a1d24]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group cursor-pointer"
                  >
                    {/* Account Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                          <Wallet size={24} className="text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{account.name}</h3>
                          <span className="text-xs text-slate-500 uppercase tracking-wide">{account.type}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(account);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-lg text-blue-400 hover:text-blue-300 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(account.id);
                          }}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 hover:text-red-300 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mb-4">
                      <div className="text-sm text-slate-400 mb-1">Current Balance</div>
                      <div className="text-3xl font-bold text-white">${account.balance.toFixed(2)}</div>
                    </div>

                    {/* Goal Progress */}
                    {account.goal > 0 && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-400">Goal</span>
                          <span className="text-slate-300 font-medium">${account.goal.toFixed(2)}</span>
                        </div>
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500"
                            style={{ width: `${progressClamped}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs">
                          <TrendingUp size={12} className={progress >= 100 ? 'text-emerald-400' : 'text-slate-500'} />
                          <span className={progress >= 100 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                            {progressClamped.toFixed(1)}% of goal
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingAccount ? 'Edit Account' : 'Create Account'}
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
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Savings Account"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Initial Balance
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.balance || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, balance: val === '' ? 0 : parseFloat(val) || 0 });
                    }
                  }}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goal (Optional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.goal || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData({ ...formData, goal: val === '' ? 0 : parseFloat(val) || 0 });
                    }
                  }}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="0.00"
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/30"
                >
                  {editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsOld;
