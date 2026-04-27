import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../../shared/components';
import { useTheme } from '../../theme';
import api from '../../api/axios';
import { useAppData } from '../../shared/context/AppDataContext';
import { getPreviousCycleRange, toApiDateRange, formatDateForApi } from '../../shared/utils/salaryCycle';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  monthly_allowance?: number;
  created_at: string;
}

interface Transaction {
  id: number;
  type: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  account_id: number;
}

interface BalanceSnapshot {
  date: string;
  balance: number;
}

const AccountsPage: React.FC = () => {
  const { user, accounts, transactions: allTransactions, salaryPeriod: period, refresh } = useAppData();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [trendPct, setTrendPct] = useState<number | null>(null);
  const [chartData, setChartData] = useState<BalanceSnapshot[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    type: 'checking',
    balance: '',
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();
  const { theme } = useTheme();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  // Derive totals from context accounts
  useEffect(() => {
    if (accounts.length === 0) return;
    const total = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    setTotalBalance(total);
    const totalAllowance = accounts.reduce((sum, acc) => sum + (acc.monthly_allowance || 0), 0);
    setMonthlyLimit(totalAllowance);

    // Set selectedAccount using preferredAccountId or default to first
    const saved = localStorage.getItem('preferredAccountId');
    const preferred = saved ? accounts.find(a => a.id === parseInt(saved)) : null;
    setSelectedAccount(prev => {
      // Only update if not yet set, or if the previous selection is no longer valid
      if (!prev || !accounts.some(a => a.id === prev.id)) {
        return preferred || accounts[0];
      }
      // Keep current selection if still valid (refresh scenario)
      return accounts.find(a => a.id === prev.id) || preferred || accounts[0];
    });
  }, [accounts]);

  // Recompute period spending when salary period or transactions change
  useEffect(() => {
    if (period.loading) return;
    const spent = allTransactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= period.periodStart && d <= period.periodEnd;
    }).reduce((sum, t) => sum + t.amount, 0);
    setMonthlySpent(spent);
  }, [period.loading, period.periodStart, allTransactions]);

  // Fetch trend % and chart data once period and accounts are ready
  useEffect(() => {
    if (period.loading || accounts.length === 0) return;

    let cancelled = false;
    const load = async () => {
      try {
        const currentRange = toApiDateRange({ start: period.periodStart, end: period.periodEnd });
        const prevRange = toApiDateRange(getPreviousCycleRange(new Date(), period.resetDay));

        const [currentRes, prevRes] = await Promise.all([
          api.get('/transactions/summary/period', { params: { start_date: currentRange.start_date, end_date: currentRange.end_date } }),
          api.get('/transactions/summary/period', { params: { start_date: prevRange.start_date, end_date: prevRange.end_date } }),
        ]);

        if (cancelled) return;

        const curNet: number = currentRes.data.net ?? 0;
        const prevNet: number = prevRes.data.net ?? 0;

        if (prevNet !== 0) {
          setTrendPct(((curNet - prevNet) / Math.abs(prevNet)) * 100);
        } else if (curNet > 0) {
          setTrendPct(100);
        } else {
          setTrendPct(null);
        }

        const targetAccount = selectedAccount || accounts[0];
        if (targetAccount) {
          const startStr = formatDateForApi(period.periodStart);
          const endStr = formatDateForApi(period.periodEnd);
          const histRes = await api.get(`/accounts/${targetAccount.id}/balance-history-period`, {
            params: { start_date: startStr, end_date: endStr },
          });
          if (!cancelled) setChartData(histRes.data);
        }
      } catch (err) {
        console.error('Failed to load trend/chart data:', err);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [period.loading, period.periodStart, accounts.length, selectedAccount?.id]);

  const chartPoints = useMemo(() => {
    if (chartData.length < 2) return { line: '', area: '' };
    const balances = chartData.map(s => s.balance);
    const minBal = Math.min(...balances);
    const maxBal = Math.max(...balances);
    const range = maxBal - minBal;
    const W = 400, H = 100, margin = 10;
    const pts = chartData.map((s, i) => {
      const x = (i / (chartData.length - 1)) * W;
      const y = range === 0 ? H / 2 : margin + ((maxBal - s.balance) / range) * (H - 2 * margin);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { line: pts.join(' '), area: `${pts.join(' ')} 400,100 0,100` };
  }, [chartData]);

  const chartLabels = useMemo(() => {
    if (period.loading || period.totalDays < 2) return [];
    const n = 5;
    return Array.from({ length: n }, (_, i) => {
      const offset = Math.round((i / (n - 1)) * (period.totalDays - 1));
      const d = new Date(period.periodStart.getTime() + offset * 86400000);
      return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' }).toUpperCase()}`;
    });
  }, [period.loading, period.periodStart, period.totalDays]);

  const handleAddAccount = async () => {
    if (!newAccount.name.trim()) return;
    setAddLoading(true);
    try {
      await api.post('/accounts', {
        name: newAccount.name.trim(),
        type: newAccount.type,
        balance: parseFloat(newAccount.balance) || 0,
      });
      // Refresh shared context — accounts + transactions updated for all pages
      await refresh();
      setShowAddModal(false);
      setNewAccount({ name: '', type: 'checking', balance: '' });
    } catch (err) {
      console.error('Failed to create account:', err);
    } finally {
      setAddLoading(false);
    }
  };

  const getIconForCategory = (category: string) => {
    const icons: Record<string, string> = {
      'Subscription': 'subscriptions',
      'Transfer': 'arrow_downward',
      'Shopping': 'shopping_bag',
      'Utilities': 'bolt',
      'Food': 'restaurant',
      'Entertainment': 'movie',
      'Transportation': 'directions_car',
      'Bills': 'receipt',
    };
    return icons[category] || 'receipt_long';
  };

  const getColorForCategory = (category: string) => {
    const colors: Record<string, string> = {
      'Subscription': 'bg-blue-500/20 text-blue-400',
      'Transfer': 'bg-green-500/20 text-green-400',
      'Shopping': 'bg-orange-500/20 text-orange-400',
      'Utilities': 'bg-purple-500/20 text-purple-400',
      'Food': 'bg-pink-500/20 text-pink-400',
      'Entertainment': 'bg-indigo-500/20 text-indigo-400',
      'Transportation': 'bg-yellow-500/20 text-yellow-400',
      'Bills': 'bg-red-500/20 text-red-400',
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const usagePercentage = monthlyLimit > 0 ? Math.min(Math.round((monthlySpent / monthlyLimit) * 100), 100) : 0;

  return (
    <>
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          accounts={accounts} 
          currentBalance={selectedAccount?.balance || totalBalance}
          selectedAccount={selectedAccount}
          onAccountChange={(accountId) => {
            const account = accounts.find(a => a.id === parseInt(accountId));
            if (account) {
              setSelectedAccount(account);
              localStorage.setItem('selectedAccountId', accountId);
              localStorage.setItem('preferredAccountId', accountId);
            }
          }}
        />
        
        <div className="flex-1 relative overflow-y-auto bg-[#0A0A0A]">
          <div className="sticky top-0 z-10 flex h-20 w-full items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md px-6 lg:px-12">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold tracking-tight text-white">Good evening, {user?.username || 'Alex'}</h2>
              <p className="text-sm text-gray-400">Financial overview in the cosmos.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="glass-btn relative flex size-10 items-center justify-center rounded-full text-gray-400 hover:text-white">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute right-2 top-2 size-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
              </button>
            </div>
          </div>

          <div className="layout-content-container mx-auto flex max-w-[1200px] flex-col gap-8 p-6 lg:p-12">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="glass-panel hero-glow relative col-span-1 flex flex-col overflow-hidden rounded-3xl p-8 lg:col-span-2 min-h-[320px]">
                <div className="absolute -right-20 -top-20 size-64 rounded-full bg-purple-600/10 blur-[80px]"></div>
                <div className="absolute -left-20 -bottom-20 size-64 rounded-full bg-primary/5 blur-[80px]"></div>
                
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-500">Total Balance</p>
                    <h3 className="text-5xl font-extrabold tracking-tighter text-white neon-text mb-4">
                      RM {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 border ${trendPct === null ? 'bg-white/5 border-white/10' : trendPct >= 0 ? 'bg-purple-500/10 border-purple-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                        <span className={`material-symbols-outlined text-sm font-bold ${trendPct === null ? 'text-gray-500' : trendPct >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {trendPct === null ? 'trending_flat' : trendPct >= 0 ? 'trending_up' : 'trending_down'}
                        </span>
                        <span className={`text-sm font-bold ${trendPct === null ? 'text-gray-500' : trendPct >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                          {trendPct === null ? '—' : `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%`}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">Cycle Trend</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-auto pt-8 w-full h-32">
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <defs>
                      <linearGradient id="chartGradientAcc" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3"></stop>
                        <stop offset="100%" stopColor="#A855F7" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    {chartPoints.area ? (
                      <>
                        <polygon points={chartPoints.area} fill="url(#chartGradientAcc)" />
                        <polyline points={chartPoints.line} fill="none" stroke="#A855F7" strokeLinecap="round" strokeWidth="3" />
                      </>
                    ) : (
                      <line x1="0" y1="50" x2="400" y2="50" stroke="#A855F7" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3" />
                    )}
                  </svg>
                  <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {chartLabels.map((label, i) => (
                      <span key={i}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass-panel flex flex-col justify-between rounded-3xl p-6 lg:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Monthly Limit</p>
                  <span className="material-symbols-outlined text-gray-500 text-lg">info</span>
                </div>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative size-32">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <defs>
                        <linearGradient id="ringGradAcc" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#C084FC" />
                        </linearGradient>
                      </defs>
                      <path className="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#ringGradAcc)" strokeDasharray={`${usagePercentage}, 100`} strokeLinecap="round" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' }}></path>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white">{usagePercentage}%</span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Used</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Spent</span>
                    <span className="text-white font-bold">RM {monthlySpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Remaining</span>
                    <span className="text-purple-400 font-bold">RM {(monthlyLimit - monthlySpent).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Your Accounts</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Add Account
                    </button>
                    <button 
                      onClick={() => navigate('/settings')}
                      className="text-sm font-bold text-purple-400 hover:text-white transition-colors uppercase tracking-tight"
                    >
                      Manage
                    </button>
                  </div>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => navigate(`/account-details/${account.id}`)}
                      className="glass-panel account-card-glow group relative flex flex-col justify-between rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] cursor-pointer text-left border border-white/5 hover:border-purple-500/20"
                    >
                      <div className="mb-6 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-full bg-white text-black">
                            <span className="material-symbols-outlined">
                              {account.type === 'savings' ? 'savings' : 'account_balance'}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-white">{account.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{account.type}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Available Balance</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          RM {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-purple-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                    </button>
                  ))}
                </div>

                <div className="glass-panel rounded-3xl p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h3 className="font-bold text-white">Savings Goals</h3>
                    <button className="rounded-lg bg-white/5 p-2 hover:bg-white/10">
                      <span className="material-symbols-outlined text-sm text-gray-300">add</span>
                    </button>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">New House</span>
                        <span className="text-primary font-bold">85%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-900">
                        <div className="liquid-bar h-full rounded-full" style={{ width: '85%' }}></div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 text-right uppercase tracking-widest">
                        $450k / $520k
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">Dream Vacation</span>
                        <span className="text-primary font-bold">42%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-900">
                        <div className="liquid-bar h-full rounded-full" style={{ width: '42%' }}></div>
                      </div>
                      <p className="text-[10px] font-bold text-gray-500 text-right uppercase tracking-widest">
                        $4.2k / $10k
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                  <button 
                    onClick={() => navigate('/transactions')}
                    className="text-sm font-bold text-purple-400 hover:text-white transition-colors uppercase tracking-tight"
                  >
                    See All
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {allTransactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="group flex items-center justify-between rounded-xl bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] border border-transparent hover:border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex size-10 items-center justify-center rounded-full ${getColorForCategory(transaction.category)}`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {getIconForCategory(transaction.category)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{transaction.note || transaction.category}</p>
                          <p className="text-xs text-gray-500">{transaction.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-purple-400' : 'text-white'}`}>
                          {transaction.type === 'income' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-600 uppercase">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── Add Account Modal ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#00FF88]/20 bg-[#111115] p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-fadeIn">
            {/* Close */}
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[18px]">close</span>
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Add New Account</h2>
            <p className="text-sm text-gray-400 mb-6">Securely link your bank or add manually.</p>

            {/* Account Name */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Account Name</label>
              <input
                type="text"
                placeholder="e.g. Primary Checking"
                value={newAccount.name}
                onChange={e => setNewAccount(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition"
              />
            </div>

            {/* Account Type + Currency row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Account Type</label>
                <div className="relative">
                  <select
                    value={newAccount.type}
                    onChange={e => setNewAccount(p => ({ ...p, type: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition cursor-pointer"
                  >
                    <option value="checking" className="bg-[#111115]">Checking</option>
                    <option value="savings" className="bg-[#111115]">Savings</option>
                    <option value="wallet" className="bg-[#111115]">Wallet</option>
                    <option value="investment" className="bg-[#111115]">Investment</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">expand_more</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Currency</label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition cursor-pointer"
                    defaultValue="RM"
                  >
                    <option value="RM" className="bg-[#111115]">RM (MYR)</option>
                    <option value="USD" className="bg-[#111115]">USD ($)</option>
                    <option value="EUR" className="bg-[#111115]">EUR (€)</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">expand_more</span>
                </div>
              </div>
            </div>

            {/* Initial Balance */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Initial Balance</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">RM</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newAccount.balance}
                  onChange={e => setNewAccount(p => ({ ...p, balance: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition"
                />
              </div>
            </div>

            {/* Quick Connect icons */}
            <div className="mb-6">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Connect</label>
              <div className="flex gap-3">
                {[
                  { icon: 'account_balance', label: 'Bank' },
                  { icon: 'credit_card', label: 'Card' },
                  { icon: 'currency_bitcoin', label: 'Crypto' },
                  { icon: 'account_balance_wallet', label: 'Wallet' },
                ].map(({ icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all"
                  >
                    <span className="material-symbols-outlined text-gray-300 text-[20px]">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAddAccount}
              disabled={addLoading || !newAccount.name.trim()}
              className="w-full rounded-xl bg-[#00FF88] py-3.5 text-sm font-extrabold uppercase tracking-[0.15em] text-black hover:bg-[#00DD77] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(0,255,136,0.3)]"
            >
              {addLoading ? 'Creating…' : 'Connect Account'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountsPage;
