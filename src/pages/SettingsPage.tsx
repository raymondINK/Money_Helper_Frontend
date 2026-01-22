import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Lock, Trash2, Calendar, ToggleLeft, ToggleRight, 
  Sun, Moon, Palette, Eye, EyeOff, DollarSign, Globe, ChevronRight, 
  Save, ArrowLeft, RefreshCw
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api/axios';

interface UserSettings {
  username: string;
  email: string;
  theme: 'light' | 'dark';
  themeColor: string;
  currency: string;
  language: string;
  monthlyResetDate: number;
  enableCategoryLimits: boolean;
  enableWalletLimit: boolean;
  autoRollover: boolean;
  showBalanceOnDashboard: boolean;
  showBudgetOnDashboard: boolean;
  showRecentTransactions: boolean;
}

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'account' | 'budget' | 'app'>('account');
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

  // User account settings
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Budget settings
  const [monthlyResetDate, setMonthlyResetDate] = useState(1);
  const [enableCategoryLimits, setEnableCategoryLimits] = useState(true);
  const [enableWalletLimit, setEnableWalletLimit] = useState(true);
  const [autoRollover, setAutoRollover] = useState(false);

  // App customization
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [themeColor, setThemeColor] = useState('#10b981'); // emerald-500
  const [currency, setCurrency] = useState('RM');
  const [language, setLanguage] = useState('en');
  const [showBalanceOnDashboard, setShowBalanceOnDashboard] = useState(true);
  const [showBudgetOnDashboard, setShowBudgetOnDashboard] = useState(true);
  const [showRecentTransactions, setShowRecentTransactions] = useState(true);

  const themeColors = [
    { name: 'Emerald', value: '#10b981' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Red', value: '#ef4444' },
  ];

  const currencies = [
    { code: 'RM', name: 'Malaysian Ringgit' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'INR', name: 'Indian Rupee' },
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
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);
      setUsername(userRes.data.username || '');
      setEmail(userRes.data.email || '');

      // Load saved settings from localStorage
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setTheme(settings.theme || 'dark');
        setThemeColor(settings.themeColor || '#10b981');
        setCurrency(settings.currency || 'RM');
        setLanguage(settings.language || 'en');
        setMonthlyResetDate(settings.monthlyResetDate || 1);
        setEnableCategoryLimits(settings.enableCategoryLimits ?? true);
        setEnableWalletLimit(settings.enableWalletLimit ?? true);
        setAutoRollover(settings.autoRollover ?? false);
        setShowBalanceOnDashboard(settings.showBalanceOnDashboard ?? true);
        setShowBudgetOnDashboard(settings.showBudgetOnDashboard ?? true);
        setShowRecentTransactions(settings.showRecentTransactions ?? true);
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

  const saveSettings = () => {
    const settings = {
      theme,
      themeColor,
      currency,
      language,
      monthlyResetDate,
      enableCategoryLimits,
      enableWalletLimit,
      autoRollover,
      showBalanceOnDashboard,
      showBudgetOnDashboard,
      showRecentTransactions,
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleUpdateProfile = async () => {
    try {
      // API call to update profile would go here
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }
    try {
      // API call to change password would go here
      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error changing password:', err);
      alert('Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );
    if (confirmed) {
      const doubleConfirm = window.confirm(
        'This is your last chance! Type DELETE to confirm account deletion.'
      );
      if (doubleConfirm) {
        try {
          // API call to delete account would go here
          localStorage.clear();
          navigate('/login');
        } catch (err) {
          console.error('Error deleting account:', err);
          alert('Failed to delete account');
        }
      }
    }
  };

  const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (val: boolean) => void }> = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        enabled ? 'bg-emerald-500' : 'bg-slate-600'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0f1115] text-white">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="bg-[#1a1d24]/90 backdrop-blur-md border-b border-white/10 p-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
              <p className="text-slate-400">Manage your account and preferences</p>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-2 mt-6">
            {[
              { id: 'account', label: '👤 Account', icon: User },
              { id: 'budget', label: '📊 Budget', icon: Calendar },
              { id: 'app', label: '🎨 App', icon: Palette },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeSection === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-w-2xl">
          {/* Account Settings */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              {/* Change Name */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold">Change Name</h3>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Your name"
                />
                <button
                  onClick={handleUpdateProfile}
                  className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-colors"
                >
                  Update Name
                </button>
              </div>

              {/* Change Email */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail size={20} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Change Email</h3>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="your@email.com"
                />
                <button
                  onClick={handleUpdateProfile}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
                >
                  Update Email
                </button>
              </div>

              {/* Change Password */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lock size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold">Change Password</h3>
                </div>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="Current password"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="New password"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors"
                >
                  Change Password
                </button>
              </div>

              {/* Delete Account */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trash2 size={20} className="text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">Delete Account</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Once you delete your account, there is no going back. Please be certain.
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
              {/* Monthly Reset Date */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold">Monthly Reset Date</h3>
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Choose when your monthly budget resets
                </p>
                <select
                  value={monthlyResetDate}
                  onChange={(e) => setMonthlyResetDate(parseInt(e.target.value))}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value={1}>1st of each month</option>
                  <option value={15}>15th of each month</option>
                  <option value={25}>25th of each month (Salary day)</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}th of each month
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Settings */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-lg font-semibold mb-4">Budget Controls</h3>
                
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div>
                    <div className="font-medium">Enable Category Limits</div>
                    <div className="text-sm text-slate-400">Get notified when you exceed category budgets</div>
                  </div>
                  <ToggleSwitch enabled={enableCategoryLimits} onChange={setEnableCategoryLimits} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div>
                    <div className="font-medium">Enable Wallet Limit</div>
                    <div className="text-sm text-slate-400">Get notified when you exceed wallet allowance</div>
                  </div>
                  <ToggleSwitch enabled={enableWalletLimit} onChange={setEnableWalletLimit} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">Auto Rollover Budget</div>
                    <div className="text-sm text-slate-400">Carry remaining balance to next month</div>
                  </div>
                  <ToggleSwitch enabled={autoRollover} onChange={setAutoRollover} />
                </div>
              </div>

              <button
                onClick={saveSettings}
                className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Budget Settings
              </button>
            </div>
          )}

          {/* App Customization */}
          {activeSection === 'app' && (
            <div className="space-y-6">
              {/* Theme Mode */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  {theme === 'dark' ? <Moon size={20} className="text-blue-400" /> : <Sun size={20} className="text-yellow-400" />}
                  <h3 className="text-lg font-semibold">Theme Mode</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      theme === 'light'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Sun size={18} />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Moon size={18} />
                    Dark
                  </button>
                </div>
              </div>

              {/* Theme Color */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Palette size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold">Theme Color</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  {themeColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setThemeColor(color.value)}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        themeColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1d24] scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign size={20} className="text-emerald-400" />
                  <h3 className="text-lg font-semibold">Currency</h3>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={20} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Language</h3>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dashboard Visibility */}
              <div className="bg-[#1a1d24]/80 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Eye size={20} className="text-slate-400" />
                  <h3 className="text-lg font-semibold">Dashboard Visibility</h3>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="font-medium">Show Balance Card</div>
                  <ToggleSwitch enabled={showBalanceOnDashboard} onChange={setShowBalanceOnDashboard} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-white/5">
                  <div className="font-medium">Show Budget Overview</div>
                  <ToggleSwitch enabled={showBudgetOnDashboard} onChange={setShowBudgetOnDashboard} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="font-medium">Show Recent Transactions</div>
                  <ToggleSwitch enabled={showRecentTransactions} onChange={setShowRecentTransactions} />
                </div>
              </div>

              <button
                onClick={saveSettings}
                className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save App Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
