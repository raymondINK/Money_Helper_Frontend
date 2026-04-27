import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Lock, Trash2, Calendar, 
  Sun, Moon, Palette, DollarSign, Globe, 
  Save, ArrowLeft, RefreshCw, Bell, Shield, Eye, EyeOff,
  Check, AlertTriangle, Loader2, ChevronRight, Download, History, Link as LinkIcon
} from 'lucide-react';
import { Sidebar, Toast } from '../../shared/components';
import { useTheme } from '../../theme';
import api from '../../api/axios';
import { useAppData } from '../../shared/context/AppDataContext';

interface UserSettings {
  id: number;
  user_id: number;
  theme: 'light' | 'dark';
  theme_color: string;
  currency: string;
  language: string;
  monthly_reset_date: number;
  enable_category_limits: boolean;
  enable_wallet_limit: boolean;
  auto_rollover: boolean;
  show_balance_on_dashboard: boolean;
  show_budget_on_dashboard: boolean;
  show_recent_transactions: boolean;
  telegram_default_account_id?: number | null;
}

interface BudgetPeriodInfo {
  reset_day: number;
  period_start: string;
  next_reset: string;
  days_until_reset: number;
  accounts: {
    account_id: number;
    account_name: string;
    monthly_allowance: number;
    period_spending: number;
    period_income: number;
    remaining_allowance: number | null;
    balance: number;
  }[];
  auto_rollover: boolean;
}

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'account' | 'budget' | 'app' | 'notifications'>('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [budgetPeriodInfo, setBudgetPeriodInfo] = useState<BudgetPeriodInfo | null>(null);
  const navigate = useNavigate();
  const { theme, setTheme: setGlobalTheme } = useTheme();
  const { accounts } = useAppData();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  // User account settings
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [themeColor, setThemeColor] = useState('#8b5cf6');
  const [currency, setCurrency] = useState('RM');
  const [language, setLanguage] = useState('en');
  const [monthlyResetDate, setMonthlyResetDate] = useState(1);
  const [enableCategoryLimits, setEnableCategoryLimits] = useState(true);
  const [enableWalletLimit, setEnableWalletLimit] = useState(true);
  const [autoRollover, setAutoRollover] = useState(false);
  const [showBalanceOnDashboard, setShowBalanceOnDashboard] = useState(true);
  const [showBudgetOnDashboard, setShowBudgetOnDashboard] = useState(true);
  const [showRecentTransactions, setShowRecentTransactions] = useState(true);
  const [telegramDefaultAccountId, setTelegramDefaultAccountId] = useState<number | null>(null);

  const themeColors = [
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rose', value: '#f43f5e' },
  ];

  const currencies = [
    { code: 'RM', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ms', name: 'Bahasa Malaysia' },
    { code: 'zh', name: '中文' },
  ];

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
      // Load user profile and settings in parallel
      const [userRes, settingsRes, budgetInfoRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/settings'),
        api.get('/settings/check-monthly-reset')
      ]);

      setUser(userRes.data);
      setUsername(userRes.data.username || '');
      setEmail(userRes.data.email || '');

      const s = settingsRes.data;
      setSettings(s);
      setThemeColor(s.theme_color || '#8b5cf6');
      setCurrency(s.currency || 'RM');
      setLanguage(s.language || 'en');
      setMonthlyResetDate(s.monthly_reset_date || 1);
      setEnableCategoryLimits(s.enable_category_limits ?? true);
      setEnableWalletLimit(s.enable_wallet_limit ?? true);
      setAutoRollover(s.auto_rollover ?? false);
      setShowBalanceOnDashboard(s.show_balance_on_dashboard ?? true);
      setShowBudgetOnDashboard(s.show_budget_on_dashboard ?? true);
      setShowRecentTransactions(s.show_recent_transactions ?? true);
      setTelegramDefaultAccountId(s.telegram_default_account_id ?? null);

      setBudgetPeriodInfo(budgetInfoRes.data);

      // Set global theme from settings
      if (s.theme) {
        setGlobalTheme(s.theme);
      }
    } catch (err) {
      console.error(err);
      if ((err as any).response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setGlobalTheme(newTheme);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        theme,
        theme_color: themeColor,
        currency,
        language,
        monthly_reset_date: monthlyResetDate,
        enable_category_limits: enableCategoryLimits,
        enable_wallet_limit: enableWalletLimit,
        auto_rollover: autoRollover,
        show_balance_on_dashboard: showBalanceOnDashboard,
        show_budget_on_dashboard: showBudgetOnDashboard,
        show_recent_transactions: showRecentTransactions,
        telegram_default_account_id: telegramDefaultAccountId,
      });
      
      // Also save to localStorage for immediate use
      localStorage.setItem('userSettings', JSON.stringify({
        theme,
        themeColor,
        currency,
        language,
        monthlyResetDate,
      }));

      setToast({ message: 'Settings saved successfully!', type: 'success' });
    } catch (err) {
      console.error('Error saving settings:', err);
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      await api.put('/settings/profile', {
        username,
        email,
      });
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setToast({ message: err.response?.data?.detail || 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setToast({ message: 'New passwords do not match!', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters!', type: 'error' });
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        old_password: currentPassword,
        new_password: newPassword,
      });
      setToast({ message: 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error changing password:', err);
      setToast({ message: err.response?.data?.detail || 'Failed to change password', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );
    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      'Type "DELETE" to confirm account deletion:'
    );
    if (doubleConfirm !== 'DELETE') {
      setToast({ message: 'Account deletion cancelled', type: 'error' });
      return;
    }

    try {
      await api.delete('/settings/account');
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Error deleting account:', err);
      setToast({ message: 'Failed to delete account', type: 'error' });
    }
  };

  const handleResetSettings = async () => {
    try {
      const res = await api.post('/settings/reset');
      const s = res.data;
      setGlobalTheme(s.theme);
      setThemeColor(s.theme_color);
      setCurrency(s.currency);
      setLanguage(s.language);
      setMonthlyResetDate(s.monthly_reset_date);
      setEnableCategoryLimits(s.enable_category_limits);
      setEnableWalletLimit(s.enable_wallet_limit);
      setAutoRollover(s.auto_rollover);
      setShowBalanceOnDashboard(s.show_balance_on_dashboard);
      setShowBudgetOnDashboard(s.show_budget_on_dashboard);
      setShowRecentTransactions(s.show_recent_transactions);
      setTelegramDefaultAccountId(s.telegram_default_account_id ?? null);
      setToast({ message: 'Settings reset to defaults!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to reset settings', type: 'error' });
    }
  };

  const handleExportData = () => {
    setToast({ message: 'Export feature coming soon!', type: 'success' });
  };

  const handleViewLoginHistory = () => {
    setToast({ message: 'Login history feature coming soon!', type: 'success' });
  };

  const handleConnectedApps = () => {
    setToast({ message: 'Connected apps feature coming soon!', type: 'success' });
  };

  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (val: boolean) => void }> = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-all ${
        enabled ? 'bg-violet-500' : 'bg-zinc-600'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#0f1115]' : 'bg-gray-50'} items-center justify-center`}>
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#0f1115] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/90' : 'bg-white/90'} backdrop-blur-md border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'} p-6 sticky top-0 z-10`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}>Manage your account and preferences</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2 mt-6 flex-wrap">
            {[
              { id: 'account', label: 'Account', icon: User },
              { id: 'budget', label: 'Budget', icon: Calendar },
              { id: 'app', label: 'Appearance', icon: Palette },
              { id: 'notifications', label: 'Privacy', icon: Shield },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeSection === tab.id
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : theme === 'dark' 
                      ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-2xl">
          {/* Account Settings */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xl font-bold">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{username}</h3>
                    <p className={theme === 'dark' ? 'text-slate-400 text-sm' : 'text-gray-500 text-sm'}>{email || 'No email set'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
                <button
                  onClick={handleUpdateProfile}
                  disabled={saving}
                  className="mt-4 px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Update Profile
                </button>
              </div>

              {/* Change Password */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Lock size={20} className="text-violet-400" />
                  <h3 className="text-lg font-semibold">Change Password</h3>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-violet-500/50`}
                      placeholder="Current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 pr-10 focus:outline-none focus:border-violet-500/50`}
                      placeholder="New password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !currentPassword || !newPassword}
                  className="mt-4 px-4 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
                >
                  Change Password
                </button>
              </div>

              {/* Delete Account */}
              <div className={`${theme === 'dark' ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 size={20} className="text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">Delete Account</h3>
                </div>
                <p className={theme === 'dark' ? 'text-slate-400 text-sm mb-4' : 'text-gray-600 text-sm mb-4'}>
                  Once you delete your account, there is no going back. All your data will be permanently deleted.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium transition-colors"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}

          {/* Budget Settings */}
          {activeSection === 'budget' && (
            <div className="space-y-6">
              {/* Current Period Info */}
              {budgetPeriodInfo && (
                <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-500/30' : 'bg-gradient-to-br from-violet-100 to-fuchsia-100 border-violet-200'} border rounded-2xl p-6`}>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar size={20} className="text-violet-400" />
                    Current Budget Period
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className={theme === 'dark' ? 'text-slate-400 text-sm' : 'text-gray-500 text-sm'}>Period Started</p>
                      <p className="font-semibold">{new Date(budgetPeriodInfo.period_start).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className={theme === 'dark' ? 'text-slate-400 text-sm' : 'text-gray-500 text-sm'}>Next Reset</p>
                      <p className="font-semibold">{new Date(budgetPeriodInfo.next_reset).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'} rounded-lg p-3`}>
                    <p className="text-sm">
                      <span className="text-violet-400 font-bold">{budgetPeriodInfo.days_until_reset}</span> days until budget reset
                    </p>
                  </div>
                  
                  {/* Account spending summary */}
                  {budgetPeriodInfo.accounts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>Account Spending This Period:</p>
                      {budgetPeriodInfo.accounts.map(acc => (
                        <div key={acc.account_id} className={`${theme === 'dark' ? 'bg-black/20' : 'bg-white/50'} rounded-lg p-3 flex justify-between items-center`}>
                          <span className="font-medium">{acc.account_name}</span>
                          <div className="text-right">
                            <p className="text-rose-400 font-semibold">-RM{acc.period_spending.toFixed(2)}</p>
                            {acc.monthly_allowance > 0 && (
                              <p className={`text-xs ${(acc.remaining_allowance ?? 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {(acc.remaining_allowance ?? 0) >= 0 ? `RM${acc.remaining_allowance?.toFixed(2)} left` : `RM${Math.abs(acc.remaining_allowance ?? 0).toFixed(2)} over budget`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Monthly Reset Date */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={20} className="text-violet-400" />
                  <h3 className="text-lg font-semibold">Monthly Reset Date</h3>
                </div>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-sm mb-4`}>
                  Choose when your monthly budget tracking resets. This is typically your salary day.
                </p>
                <select
                  value={monthlyResetDate}
                  onChange={(e) => setMonthlyResetDate(parseInt(e.target.value))}
                  className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day === 1 ? '1st' : day === 25 ? '25th (Salary day)' : `${day}${day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}`} of each month
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Controls */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6 space-y-4`}>
                <h3 className="text-lg font-semibold mb-4">Budget Controls</h3>
                
                <div className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                  <div>
                    <div className="font-medium">Enable Category Limits</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Get notified when you exceed category budgets</div>
                  </div>
                  <ToggleSwitch enabled={enableCategoryLimits} onChange={setEnableCategoryLimits} />
                </div>

                <div className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                  <div>
                    <div className="font-medium">Enable Wallet Limit</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Get notified when you exceed wallet allowance</div>
                  </div>
                  <ToggleSwitch enabled={enableWalletLimit} onChange={setEnableWalletLimit} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">Auto Rollover Budget</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Carry remaining allowance to next month</div>
                  </div>
                  <ToggleSwitch enabled={autoRollover} onChange={setAutoRollover} />
                </div>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Budget Settings
              </button>
            </div>
          )}

          {/* App Customization */}
          {activeSection === 'app' && (
            <div className="space-y-6">
              {/* Theme Mode */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  {theme === 'dark' ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-500" />}
                  <h3 className="text-lg font-semibold">Theme Mode</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${
                      theme === 'light'
                        ? 'bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                        : theme === 'dark' 
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10 border-2 border-transparent' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    <Sun size={24} />
                    <span>Light</span>
                    {theme === 'light' && <Check size={16} className="text-yellow-500" />}
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                    }`}
                  >
                    <Moon size={24} />
                    <span>Dark</span>
                    {theme === 'dark' && <Check size={16} className="text-blue-400" />}
                  </button>
                </div>
              </div>

              {/* Theme Color */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Palette size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold">Accent Color</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {themeColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setThemeColor(color.value)}
                      className={`w-12 h-12 rounded-xl transition-all relative ${
                        themeColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110 shadow-lg' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value, boxShadow: themeColor === color.value ? `0 0 20px ${color.value}40` : undefined }}
                      title={color.name}
                    >
                      {themeColor === color.value && (
                        <Check size={20} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold">Currency</h3>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={20} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Language</h3>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`w-full ${theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'} border rounded-lg px-4 py-3 focus:outline-none focus:border-violet-500/50`}
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleResetSettings}
                  className={`flex-1 px-4 py-3 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg font-medium transition-colors flex items-center justify-center gap-2`}
                >
                  <RefreshCw size={18} />
                  Reset to Defaults
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Privacy & Dashboard Settings */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              {/* Telegram Integration */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6 space-y-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <Bell size={20} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Telegram Bot</h3>
                </div>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-sm mb-4`}>
                  Choose which account Telegram bot transactions are added to by default.
                </p>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                    Default Account for Telegram Transactions
                  </label>
                  <select
                    value={telegramDefaultAccountId ?? ''}
                    onChange={(e) => setTelegramDefaultAccountId(e.target.value ? Number(e.target.value) : null)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${theme === 'dark' ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-50 border border-gray-200 text-gray-800'}`}
                  >
                    <option value="">— Use server default (MY_DEFAULT_ACCOUNT_ID env) —</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  <p className={`mt-1.5 text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>
                    Save settings after changing this value.
                  </p>
                </div>
              </div>

              {/* Dashboard Visibility */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6 space-y-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <Eye size={20} className="text-slate-400" />
                  <h3 className="text-lg font-semibold">Dashboard Privacy</h3>
                </div>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} text-sm mb-4`}>
                  Control what information is visible on your dashboard
                </p>
                
                <div className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                  <div>
                    <div className="font-medium">Show Balance</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Display account balance on dashboard</div>
                  </div>
                  <ToggleSwitch enabled={showBalanceOnDashboard} onChange={setShowBalanceOnDashboard} />
                </div>

                <div className={`flex items-center justify-between py-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                  <div>
                    <div className="font-medium">Show Budget Overview</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Display budget progress on dashboard</div>
                  </div>
                  <ToggleSwitch enabled={showBudgetOnDashboard} onChange={setShowBudgetOnDashboard} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">Show Recent Transactions</div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Display transaction history on dashboard</div>
                  </div>
                  <ToggleSwitch enabled={showRecentTransactions} onChange={setShowRecentTransactions} />
                </div>
              </div>

              {/* Data & Security */}
              <div className={`${theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold">Data & Security</h3>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={handleExportData}
                    className={`w-full flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <Download size={18} className="text-slate-400" />
                      <span>Export My Data</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                  <button 
                    onClick={handleViewLoginHistory}
                    className={`w-full flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <History size={18} className="text-slate-400" />
                      <span>View Login History</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                  <button 
                    onClick={handleConnectedApps}
                    className={`w-full flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <LinkIcon size={18} className="text-slate-400" />
                      <span>Connected Apps</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Privacy Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default SettingsPage;
