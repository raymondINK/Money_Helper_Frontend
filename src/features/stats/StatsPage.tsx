import { useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../../shared/components/Sidebar';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  monthly_allowance?: number;
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

const Stats = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<Transaction[]>([]);
  // Older months for MoM chart: index 0 = oldest (5 months ago), index 3 = 3 months ago
  const [olderMonthsTransactions, setOlderMonthsTransactions] = useState<Transaction[][]>([[], [], [], []]);
  const [selectedAccountId, setSelectedAccountId] = useState<'all' | number>('all');
  const [currency, setCurrency] = useState('RM');
  const [loading, setLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Navigable month (default = current month)
  const [viewDate, setViewDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const handleSidebarToggle = () => {
    setSidebarCollapsed((prev: boolean) => {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(!prev));
      return !prev;
    });
  };

  const goToPrevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => {
    const now = new Date();
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (next <= now) setViewDate(next);
  };
  const isCurrentMonth = viewDate.getFullYear() === new Date().getFullYear() && viewDate.getMonth() === new Date().getMonth();

  const fetchMonthTransactions = useCallback(async (year: number, month: number, accountId: 'all' | number): Promise<Transaction[]> => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const params: Record<string, string> = {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      limit: '500',
    };
    if (accountId !== 'all') params.account_id = String(accountId);
    const res = await api.get('/transactions/filter', { params });
    return res.data;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));

    const init = async () => {
      try {
        const [accountsRes, settingsRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/settings').catch(() => ({ data: { currency: 'RM' } })),
        ]);
        setAccounts(accountsRes.data);
        setCurrency(settingsRes.data.currency || 'RM');
      } catch (err) { console.error(err); }
    };
    init();
  }, [navigate]);

  // Reload transactions whenever month or account filter changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cur, prev, m2, m3, m4, m5] = await Promise.all([
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth(), selectedAccountId),
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth() - 1, selectedAccountId),
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth() - 2, selectedAccountId),
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth() - 3, selectedAccountId),
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth() - 4, selectedAccountId),
          fetchMonthTransactions(viewDate.getFullYear(), viewDate.getMonth() - 5, selectedAccountId),
        ]);
        setTransactions(cur);
        setPrevTransactions(prev);
        // oldest first: m5=5 months ago, m4=4, m3=3, m2=2
        setOlderMonthsTransactions([m5, m4, m3, m2]);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [viewDate, selectedAccountId, fetchMonthTransactions]);

  // Derived metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const prevIncome = prevTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const momIncomeDelta = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null;
  const momExpenseDelta = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : null;

  // Category breakdown for current month expenses
  const categoryMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
  });
  const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => b - a);

  // Per-day chart for selected month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthShort = viewDate.toLocaleString('default', { month: 'short' }).toUpperCase();

  const chartLabels: string[] = [];
  const chartIncomeData: number[] = [];
  const chartExpenseData: number[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    chartLabels.push(`${String(day).padStart(2, '0')} ${monthShort}`);
    const pad = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    chartIncomeData.push(transactions.filter(t => t.type === 'income' && t.date.startsWith(pad)).reduce((s, t) => s + t.amount, 0));
    chartExpenseData.push(transactions.filter(t => t.type === 'expense' && t.date.startsWith(pad)).reduce((s, t) => s + t.amount, 0));
  }

  // Month-over-month bar chart (last 6 months) — all 6 now fetched
  const momLabels: string[] = [];
  const momIncomeArr: number[] = [];
  const momExpenseArr: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    momLabels.push(d.toLocaleString('default', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2));
  }
  // olderMonthsTransactions = [5monthsAgo, 4monthsAgo, 3monthsAgo, 2monthsAgo]
  for (const monthTxs of olderMonthsTransactions) {
    momIncomeArr.push(monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
    momExpenseArr.push(monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  // Previous month (index 4) and current month (index 5)
  momIncomeArr.push(prevIncome);
  momExpenseArr.push(prevExpense);
  momIncomeArr.push(totalIncome);
  momExpenseArr.push(totalExpense);

  const mainChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Income',
        data: chartIncomeData,
        borderColor: '#A855F7',
        borderWidth: 2.5,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
          gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
          return gradient;
        },
        fill: true, tension: 0.4,
        pointRadius: chartIncomeData.map(v => v > 0 ? 4 : 0),
        pointHoverRadius: 6,
        pointBackgroundColor: '#C084FC', pointBorderColor: '#fff', pointBorderWidth: 1.5,
      },
      {
        label: 'Expense',
        data: chartExpenseData,
        borderColor: '#F87171',
        borderWidth: 2,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(248, 113, 113, 0.2)');
          gradient.addColorStop(1, 'rgba(248, 113, 113, 0)');
          return gradient;
        },
        fill: true, tension: 0.4,
        pointRadius: chartExpenseData.map(v => v > 0 ? 4 : 0),
        pointHoverRadius: 6,
        pointBackgroundColor: '#FCA5A5', pointBorderColor: '#fff', pointBorderWidth: 1.5,
      },
    ],
  };

  const momBarData = {
    labels: momLabels,
    datasets: [
      {
        label: 'Income',
        data: momIncomeArr,
        backgroundColor: 'rgba(168, 85, 247, 0.5)',
        borderColor: '#A855F7',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Expense',
        data: momExpenseArr,
        backgroundColor: 'rgba(248, 113, 113, 0.5)',
        borderColor: '#F87171',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const categoryColors = [
    { bg: 'bg-purple-500/20', text: 'text-purple-400', bar: '#A855F7' },
    { bg: 'bg-rose-500/20', text: 'text-rose-400', bar: '#F87171' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400', bar: '#FBBF24' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', bar: '#34D399' },
    { bg: 'bg-blue-500/20', text: 'text-blue-400', bar: '#60A5FA' },
    { bg: 'bg-pink-500/20', text: 'text-pink-400', bar: '#F472B6' },
    { bg: 'bg-teal-500/20', text: 'text-teal-400', bar: '#2DD4BF' },
    { bg: 'bg-orange-500/20', text: 'text-orange-400', bar: '#FB923C' },
  ];

  const getAnalyticsInsight = (): { icon: string; text: string; colorClass: string } | null => {
    if (loading) return null;
    if (momExpenseDelta !== null && momExpenseDelta > 25) {
      return { icon: 'trending_up', text: `Your spending is up ${momExpenseDelta.toFixed(0)}% vs last month.`, colorClass: 'text-rose-400 border-rose-500/20 bg-rose-500/5' };
    }
    if (momExpenseDelta !== null && momExpenseDelta < -15) {
      return { icon: 'trending_down', text: `Great — you spent ${Math.abs(momExpenseDelta).toFixed(0)}% less than last month.`, colorClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    }
    if (totalExpense > totalIncome && totalIncome > 0) {
      return { icon: 'warning', text: `Spending exceeded income by ${currency} ${(totalExpense - totalIncome).toFixed(2)} this month.`, colorClass: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    }
    if (sortedCategories.length > 0 && totalExpense > 0) {
      const [topCat, topAmt] = sortedCategories[0];
      const pct = ((topAmt / totalExpense) * 100).toFixed(0);
      return { icon: 'donut_large', text: `${topCat} is your top spending category (${pct}% of expenses).`, colorClass: 'text-purple-400 border-purple-500/20 bg-purple-500/5' };
    }
    if (netBalance > 0 && totalIncome > 0) {
      return { icon: 'check_circle', text: `You're saving ${currency} ${netBalance.toFixed(2)} this month. Keep it up!`, colorClass: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    }
    return null;
  };
  const analyticsInsight = getAnalyticsInsight();

  const formatDelta = (delta: number | null) => {
    if (delta === null) return null;
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}% vs last month`;
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-20 w-full items-center justify-between border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md px-6 lg:px-12">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight text-white">Analytics</h2>
            <p className="text-sm text-gray-400">Track your financial performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Account filter */}
            {accounts.length > 0 && (
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white appearance-none focus:ring-2 focus:ring-purple-500/50 outline-none"
              >
                <option value="all">All Accounts</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            )}
            {/* Month navigation */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5">
              <button onClick={goToPrevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-white px-2 min-w-[120px] text-center">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative z-10">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-400 text-sm">Loading...</div>
            </div>
          )}

          <div className="max-w-7xl mx-auto flex gap-8 relative z-10">
            {/* Left: charts */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-6">
                {/* Income */}
                <div className="glass-panel rounded-xl p-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-sm">trending_up</span>
                    <span className="text-sm text-gray-400 font-medium">Total Income</span>
                  </div>
                  <div className="text-xl font-bold text-white">+{currency} {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  {momIncomeDelta !== null && (
                    <span className={`text-xs font-medium ${momIncomeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatDelta(momIncomeDelta)}
                    </span>
                  )}
                </div>
                {/* Net */}
                <div className="glass-panel rounded-xl p-6 flex flex-col gap-2 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-sm">account_balance_wallet</span>
                    <span className="text-sm text-gray-400 font-medium">Net Balance</span>
                  </div>
                  <div className={`text-3xl font-bold ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {netBalance >= 0 ? '+' : ''}{currency} {Math.abs(netBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {/* Expense */}
                <div className="glass-panel rounded-xl p-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500 text-sm">trending_down</span>
                    <span className="text-sm text-gray-400 font-medium">Total Expenses</span>
                  </div>
                  <div className="text-xl font-bold text-white">-{currency} {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  {momExpenseDelta !== null && (
                    <span className={`text-xs font-medium ${momExpenseDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatDelta(momExpenseDelta)}
                    </span>
                  )}
                </div>
              </div>

              {/* Insight banner */}
              {analyticsInsight && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${analyticsInsight.colorClass}`}>
                  <span className="material-symbols-outlined text-base mt-0.5">{analyticsInsight.icon}</span>
                  <p className="leading-snug">{analyticsInsight.text}</p>
                </div>
              )}

              {/* Daily line chart */}
              <div className="glass-panel rounded-xl p-6 flex flex-col min-h-[320px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-sm text-gray-400">Income</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-sm text-gray-400">Expense</span></div>
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-widest">
                    {viewDate.toLocaleString('default', { month: 'long' })} {year} — Daily
                  </span>
                </div>
                <div className="flex-1 relative min-h-0" style={{ minHeight: 240 }}>
                  <Line
                    data={mainChartData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      interaction: { mode: 'index' as const, intersect: false },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(10,10,12,0.95)', borderColor: 'rgba(168,85,247,0.3)', borderWidth: 1,
                          titleColor: '#9CA3AF', bodyColor: '#fff', padding: 12,
                          callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${currency} ${ctx.parsed.y.toFixed(2)}` },
                        },
                      },
                      scales: {
                        x: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4B5563', font: { size: 10 }, maxTicksLimit: 7, maxRotation: 0 }, border: { display: false } },
                        y: { display: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6B7280', font: { size: 10 }, callback: (v: any) => v === 0 ? '' : `${currency} ${(v as number).toLocaleString()}` }, border: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Month-over-month bar chart */}
              <div className="glass-panel rounded-xl p-6 flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-white">Month-over-Month</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-xs text-gray-400">Income</span></div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-xs text-gray-400">Expense</span></div>
                  </div>
                </div>
                <div className="flex-1 relative min-h-0" style={{ minHeight: 160 }}>
                  <Bar
                    data={momBarData}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(10,10,12,0.95)', borderColor: 'rgba(168,85,247,0.3)', borderWidth: 1,
                          titleColor: '#9CA3AF', bodyColor: '#fff', padding: 10,
                          callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${currency} ${(ctx.parsed.y as number).toFixed(2)}` },
                        },
                      },
                      scales: {
                        x: { grid: { display: false }, ticks: { color: '#4B5563', font: { size: 10 } }, border: { display: false } },
                        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6B7280', font: { size: 10 }, callback: (v: any) => `${currency} ${(v as number).toLocaleString()}` }, border: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Category breakdown + Wallet Summary */}
            <div className="w-72 flex flex-col gap-4 flex-shrink-0">
              {/* Category Breakdown */}
              <div className="glass-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-[18px]">donut_large</span>
                  <h3 className="font-semibold text-sm text-white">Spending by Category</h3>
                </div>
                {sortedCategories.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No expenses this month</p>
                ) : (
                  <div className="space-y-3">
                    {sortedCategories.slice(0, 7).map(([cat, amount], i) => {
                      const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                      const col = categoryColors[i % categoryColors.length];
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${col.bg} ${col.text}`}>{cat}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-semibold text-white">{currency} {amount.toFixed(2)}</span>
                              <span className="text-[10px] text-gray-500 ml-1">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col.bar }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Wallet Summary */}
              <div className="flex items-center gap-2 text-white/90 pt-1">
                <span className="material-symbols-outlined text-gray-400 text-[20px]">account_balance_wallet</span>
                <h3 className="font-semibold text-sm">Wallet Summary</h3>
              </div>

              {accounts.length === 0 ? (
                <div className="glass-panel rounded-xl p-6 flex flex-col items-center gap-2 text-center">
                  <span className="material-symbols-outlined text-3xl text-gray-700">account_balance</span>
                  <p className="text-xs text-gray-500">No accounts yet</p>
                </div>
              ) : accounts.map((account) => {
                // Income/expense filtered to the SELECTED MONTH — not all-time
                const accIncome = transactions.filter(t => t.type === 'income' && t.account_id === account.id).reduce((s, t) => s + t.amount, 0);
                const accExpense = transactions.filter(t => t.type === 'expense' && t.account_id === account.id).reduce((s, t) => s + t.amount, 0);
                const allowance = account.monthly_allowance || 0;
                const usedPct = allowance > 0 ? Math.min(Math.round((accExpense / allowance) * 100), 100) : 0;
                const selectedMonthLabel = viewDate.toLocaleString('default', { month: 'short', year: 'numeric' });

                return (
                  <div key={account.id} className="glass-panel rounded-xl p-5 relative overflow-hidden cursor-pointer hover:border-purple-500/20 border border-transparent transition-all" onClick={() => navigate(`/account-details/${account.id}`)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-400 text-[18px]">
                          {account.type === 'savings' ? 'savings' : account.type === 'wallet' ? 'wallet' : 'account_balance'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{account.name}</h4>
                        <p className="text-[10px] text-gray-500 capitalize">{account.type}</p>
                      </div>
                    </div>
                    {/* Current balance (all-time) clearly labelled */}
                    <div className="mb-1">
                      <p className="text-[10px] text-gray-500">Current balance</p>
                      <div className="text-lg font-bold text-white">
                        {currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    {allowance > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-gray-400">Monthly Allowance</span>
                          <span className="text-white">{currency} {allowance.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-purple-700 via-purple-500 to-purple-300" style={{ width: `${usedPct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] mt-1 text-gray-500">
                          <span>{usedPct}% used</span>
                          <span className="text-purple-400">{currency} {Math.max(allowance - accExpense, 0).toLocaleString()} remaining</span>
                        </div>
                      </div>
                    )}
                    {/* Period income/expense clearly labelled */}
                    <p className="text-[9px] text-gray-600 mb-1">{selectedMonthLabel}</p>
                    <div className="pt-2 border-t border-white/5 flex justify-between text-[11px]">
                      <div className="flex items-center gap-1 text-purple-400">
                        <span className="material-symbols-outlined text-[12px]">north_east</span>
                        +{currency} {accIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`flex items-center gap-1 ${accExpense > 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                        <span className="material-symbols-outlined text-[12px]">south_east</span>
                        -{currency} {accExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Stats;
