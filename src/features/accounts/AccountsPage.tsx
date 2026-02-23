import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from '../../shared/components';
import { useTheme } from '../../theme';
import api from '../../api/axios';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
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

const AccountsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(4500);
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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [userRes, accountsRes, transactionsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/accounts'),
          api.get('/transactions')
        ]);

        setUser(userRes.data);
        setAccounts(accountsRes.data);
        setTransactions(transactionsRes.data.slice(0, 5));

        const total = accountsRes.data.reduce((sum: number, acc: Account) => sum + acc.balance, 0);
        setTotalBalance(total);

        const currentMonth = new Date().getMonth();
        const spent = transactionsRes.data
          .filter((t: Transaction) => {
            const txDate = new Date(t.date);
            return t.type === 'expense' && txDate.getMonth() === currentMonth;
          })
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        setMonthlySpent(spent);

      } catch (err) {
        console.error(err);
        if ((err as any).response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };

    fetchData();
  }, [navigate]);

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

  const usagePercentage = Math.round((monthlySpent / monthlyLimit) * 100);

  return (
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
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary shadow-[0_0_8px_#0df259]"></span>
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
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-sm font-bold">trending_up</span>
                        <span className="text-sm font-bold text-primary">+12.5%</span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-tight">Monthly Trend</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-auto pt-8 w-full h-32">
                  <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0df259" stopOpacity="0.25"></stop>
                        <stop offset="100%" stopColor="#0df259" stopOpacity="0"></stop>
                      </linearGradient>
                    </defs>
                    <path d="M0 80 Q 40 70, 80 85 T 160 55 T 240 75 T 320 40 T 400 60 V 100 H 0 Z" fill="url(#chartGradient)"></path>
                    <path className="chart-line" d="M0 80 Q 40 70, 80 85 T 160 55 T 240 75 T 320 40 T 400 60" fill="none" stroke="#0df259" strokeLinecap="round" strokeWidth="3"></path>
                    <circle className="animate-pulse shadow-[0_0_10px_#0df259]" cx="160" cy="55" fill="#0df259" r="4"></circle>
                    <circle className="shadow-[0_0_10px_#0df259]" cx="320" cy="40" fill="#0df259" r="4"></circle>
                  </svg>
                  <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>01 Oct</span>
                    <span>08 Oct</span>
                    <span>15 Oct</span>
                    <span>22 Oct</span>
                    <span>31 Oct</span>
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
                      <path className="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                      <path className="text-primary drop-shadow-[0_0_6px_rgba(13,242,89,0.8)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${usagePercentage}, 100`} strokeLinecap="round" strokeWidth="3"></path>
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
                    <span className="text-white font-bold">${monthlySpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400 font-medium">Remaining</span>
                    <span className="text-primary font-bold">${(monthlyLimit - monthlySpent).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Your Accounts</h2>
                  <button 
                    onClick={() => navigate('/settings')}
                    className="text-sm font-bold text-primary hover:text-white transition-colors uppercase tracking-tight"
                  >
                    Manage Accounts
                  </button>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  {accounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => {
                        setSelectedAccount(account);
                        localStorage.setItem('selectedAccountId', account.id.toString());
                      }}
                      className="glass-panel account-card-glow group relative flex flex-col justify-between rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(13,242,89,0.2)] cursor-pointer text-left"
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
                            <p className="text-xs text-gray-400">**** {account.id.toString().slice(-4)}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white">
                          Active
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Available Balance</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
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
                    className="text-sm font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-tight"
                  >
                    See All
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {transactions.map((transaction) => (
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
                        <p className={`text-sm font-bold ${transaction.type === 'income' ? 'text-primary' : 'text-white'}`}>
                          {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
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
  );
};

export default AccountsPage;
