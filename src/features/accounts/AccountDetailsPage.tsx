import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sidebar } from '../../shared/components';
import api from '../../api/axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

const getIconForCategory = (category: string) => {
  const icons: Record<string, string> = {
    'Subscription': 'subscriptions',
    'Transfer': 'swap_horiz',
    'Shopping': 'shopping_bag',
    'Utilities': 'bolt',
    'Food': 'restaurant',
    'Entertainment': 'movie',
    'Transportation': 'directions_car',
    'Bills': 'receipt',
    'Salary': 'payments',
    'Income': 'trending_up',
    'Healthcare': 'medical_services',
  };
  return icons[category] || 'receipt_long';
};

const AccountDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
        const periodEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

        const [userRes, accountsRes, transactionsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/accounts'),
          api.get(`/transactions/account/${parseInt(id || '0')}`, {
            params: { start_date: periodStart, end_date: periodEnd, limit: 500 }
          }),
        ]);

        setUser(userRes.data);

        const found = accountsRes.data.find((a: Account) => a.id === parseInt(id || '0'));
        setAccount(found || null);

        setTransactions(transactionsRes.data);
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

    fetchData();
  }, [id, navigate]);

  // ── Weekly cashflow data for current month ──────────────────────────────────
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = now.getDate();

  const weekLabels = ['W1', 'W2', 'W3', 'W4', daysInMonth > 28 ? 'W5' : 'NOW'];
  const weekBoundaries = [7, 14, 21, 28, daysInMonth];

  const weeklyIn = weekBoundaries.map((end, i) => {
    const start = i === 0 ? 1 : weekBoundaries[i - 1] + 1;
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        const day = d.getDate();
        return (
          t.type === 'income' &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          day >= start &&
          day <= end
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const weeklyOut = weekBoundaries.map((end, i) => {
    const start = i === 0 ? 1 : weekBoundaries[i - 1] + 1;
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        const day = d.getDate();
        return (
          t.type === 'expense' &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          day >= start &&
          day <= end
        );
      })
      .reduce((sum, t) => sum + t.amount, 0);
  });

  const chartData = {
    labels: weekLabels,
    datasets: [
      {
        label: 'IN',
        data: weeklyIn,
        backgroundColor: 'rgba(0, 255, 136, 0.7)',
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'OUT',
        data: weeklyOut,
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `RM ${ctx.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF', font: { size: 11, weight: 700 as const } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#6B7280',
          font: { size: 10 },
          callback: (v: any) => `RM ${v}`,
        },
        border: { display: false },
      },
    },
  };

  // ── Net flow totals ───────────────────────────────────────────────────────
  const netInflow = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const netOutflow = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // ── Group transactions by date for history ────────────────────────────────
  const grouped: Record<string, Transaction[]> = {};
  const sortedTxs = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  sortedTxs.forEach(t => {
    const d = new Date(t.date);
    const key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const accNumber = account
    ? String(account.id).padStart(6, '0') + Math.abs(account.id * 7654321).toString().slice(-8)
    : '000000000000';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-2 border-white/10 border-t-[#00FF88]"></div>
          <p className="text-sm text-gray-400 uppercase tracking-widest">Loading account…</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-gray-600 mb-4 block">account_balance</span>
          <p className="text-white font-bold mb-2">Account not found</p>
          <button onClick={() => navigate('/accounts')} className="text-sm text-[#00FF88] hover:text-white">
            ← Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top Header ───────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/accounts')}
              className="flex size-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              <span className="material-symbols-outlined text-white text-[18px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white">{account.name}</h1>
              <span className="rounded-full bg-[#00FF88]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#00FF88] border border-[#00FF88]/30">
                LIVE
              </span>
            </div>
            <span className="text-xs text-gray-500 font-mono tracking-widest">
              ACC · {accNumber.slice(0, 11)}
            </span>
          </div>

          {/* Balance top right */}
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Available Liquidity</p>
            <p className="text-2xl font-extrabold text-white tracking-tight">
              RM {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[900px] flex flex-col gap-6 p-6">

            {/* ── Action Buttons ──────────────────────────────────────────────── */}
            <div className="flex gap-3">
              {[
                { icon: 'swap_horiz', label: 'Transfer' },
                { icon: 'download', label: 'Export' },
                { icon: 'tune', label: 'Manage' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Monthly Analytics Chart ──────────────────────────────────── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Monthly Analytics</h2>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                  {now.toLocaleString('default', { month: 'long' }).toUpperCase()} {currentYear}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mb-5">Cashflow Performance</p>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm bg-[#00FF88]/70"></div>
                  <span className="text-[11px] text-gray-400 font-semibold">IN</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2.5 rounded-sm bg-red-500/70"></div>
                  <span className="text-[11px] text-gray-400 font-semibold">OUT</span>
                </div>
              </div>

              <div className="h-[180px]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* ── Net Inflow / Outflow ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#00FF88]/20 bg-[#00FF88]/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Net Inflow</p>
                <p className="text-3xl font-extrabold text-[#00FF88] tracking-tight">
                  +RM {netInflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">This month</p>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Net Outflow</p>
                <p className="text-3xl font-extrabold text-red-400 tracking-tight">
                  -RM {netOutflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">This month</p>
              </div>
            </div>

            {/* ── Transaction History ──────────────────────────────────────── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Latest Activity</h2>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <span className="material-symbols-outlined text-4xl text-gray-700">receipt_long</span>
                  <p className="text-sm text-gray-500">No transactions for this account yet</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(grouped).map(([dateLabel, txs]) => (
                    <div key={dateLabel}>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">{dateLabel}</p>
                      <div className="space-y-2">
                        {txs.map(tx => {
                          const isIncome = tx.type === 'income';
                          const isToday =
                            new Date(tx.date).toDateString() === new Date().toDateString();
                          return (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between rounded-xl bg-white/5 p-4 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex size-10 items-center justify-center rounded-full ${
                                    isIncome
                                      ? 'bg-[#00FF88]/15 text-[#00FF88]'
                                      : 'bg-red-500/15 text-red-400'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {getIconForCategory(tx.category)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {tx.note || tx.category}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                      {tx.category}
                                    </span>
                                    <span className="text-[10px] text-gray-600">{formatTime(tx.date)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-sm font-bold ${
                                    isIncome ? 'text-[#00FF88]' : 'text-white'
                                  }`}
                                >
                                  {isIncome ? '+' : '-'}RM {tx.amount.toFixed(2)}
                                </p>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                    isToday
                                      ? 'bg-amber-500/15 text-amber-400'
                                      : 'bg-white/10 text-gray-500'
                                  }`}
                                >
                                  {isToday ? 'PENDING' : 'SETTLED'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {transactions.length > 0 && (
                <div className="mt-8 flex justify-center">
                  <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Review Older Archives
                  </button>
                </div>
              )}
            </div>

            {/* Bottom spacer */}
            <div className="pb-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsPage;
