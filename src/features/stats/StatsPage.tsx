import { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Sidebar from '../../shared/components/Sidebar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const Stats = () => {
    const incomeSparkRef = useRef(null);
    const expenseSparkRef = useRef(null);
    const [user, setUser] = useState<any>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    const handleSidebarToggle = () => {
        setSidebarCollapsed((prev: boolean) => {
            localStorage.setItem('sidebarCollapsed', JSON.stringify(!prev));
            return !prev;
        });
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const mainChartData = {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
        datasets: [
            {
                label: 'Income Trend',
                data: [1500, 3200, 3000, 4200, 2500, 3000, 4500, 6800],
                borderColor: '#4ade80',
                borderWidth: 3,
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
                    gradient.addColorStop(0.5, 'rgba(74, 222, 128, 0.1)');
                    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#4ade80',
                pointHoverBorderColor: '#fff',
            },
        ],
    };

    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { display: false },
            y: { display: false, min: 0 },
        },
    };

    return (
        <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
            <Sidebar
                user={user}
                collapsed={sidebarCollapsed}
                onToggle={handleSidebarToggle}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="sticky top-0 z-10 flex h-20 w-full items-center justify-between border-b border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md px-6 lg:px-12">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold tracking-tight text-white">Analytics & Budget</h2>
                        <p className="text-sm text-gray-400">Track your financial performance</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 pt-0 relative z-10">
                <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none z-0"></div>

                <div className="max-w-7xl mx-auto h-full flex gap-8 relative z-10">
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Tabs */}
                        <div className="bg-surface-dark/50 p-1 rounded-xl inline-flex w-fit border border-zinc-800">
                            <button className="px-6 py-2 text-sm font-medium text-white bg-white/10 rounded-lg shadow-sm border border-white/5">Analytics</button>
                            <button className="px-6 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Budget</button>
                            <button className="px-6 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Notes</button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-6 items-stretch">
                            <div className="glass-panel rounded-xl p-6 relative group overflow-hidden flex flex-col justify-between h-48">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="material-symbols-outlined text-emerald-500 text-sm">trending_up</span>
                                        <span className="text-sm text-gray-400 font-medium">Total Income</span>
                                    </div>
                                    <div className="text-xl font-bold text-white tracking-tight mt-1">+RM 5,100.00</div>
                                    <div className="flex-1 min-h-0 mt-2 relative w-full">
                                        <Line
                                            data={{
                                                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                                                datasets: [{
                                                    data: [12, 19, 15, 25, 22, 30, 35],
                                                    borderColor: '#4ade80',
                                                    borderWidth: 2,
                                                    backgroundColor: 'rgba(74, 222, 128, 0.1)',
                                                    fill: true,
                                                    tension: 0.4,
                                                    pointRadius: 0,
                                                }],
                                            }}
                                            options={sparklineOptions}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel rounded-xl p-6 relative overflow-hidden border-emerald-500/20 shadow-[0_0_30px_-10px_rgba(74,222,128,0.1)] flex flex-col justify-between h-48">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="material-symbols-outlined text-emerald-500/80 text-sm">account_balance_wallet</span>
                                        <span className="text-sm text-emerald-500/80 font-medium">Net Balance</span>
                                    </div>
                                    <div className="text-3xl font-bold text-white tracking-tight drop-shadow-sm mt-auto mb-auto">+RM 3,300.00</div>
                                </div>
                            </div>

                            <div className="glass-panel rounded-xl p-6 relative group overflow-hidden flex flex-col justify-between h-48">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="material-symbols-outlined text-rose-500 text-sm">trending_down</span>
                                        <span className="text-sm text-gray-400 font-medium">Total Expenses</span>
                                    </div>
                                    <div className="text-xl font-bold text-white tracking-tight mt-1">-RM 1,800.00</div>
                                    <div className="flex-1 min-h-0 mt-2 relative w-full">
                                        <Line
                                            data={{
                                                labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
                                                datasets: [{
                                                    data: [25, 20, 28, 15, 18, 12, 15],
                                                    borderColor: '#f87171',
                                                    borderWidth: 2,
                                                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                                                    fill: true,
                                                    tension: 0.4,
                                                    pointRadius: 0,
                                                }],
                                            }}
                                            options={sparklineOptions}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Chart */}
                        <div className="glass-panel rounded-xl p-6 flex-1 min-h-[400px] flex flex-col relative w-full">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    <h3 className="font-medium text-gray-200">Income vs Expense Trend</h3>
                                </div>
                                <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                                    <button className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-md transition-colors">Week</button>
                                    <button className="px-3 py-1 text-xs text-white bg-white/10 rounded-md shadow-sm border border-white/5">Month</button>
                                    <button className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-md transition-colors">Year</button>
                                    <button className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-md transition-colors">All</button>
                                </div>
                            </div>
                            <div className="flex-1 w-full relative">
                                <Line
                                    data={mainChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: {
                                                display: true,
                                                grid: {
                                                    color: 'rgba(255, 255, 255, 0.05)',
                                                },
                                                ticks: { display: false },
                                            },
                                            y: {
                                                display: true,
                                                grid: {
                                                    color: 'rgba(255, 255, 255, 0.05)',
                                                },
                                                ticks: {
                                                    callback: function (value: any) {
                                                        return (value as number) / 1000 + 'k';
                                                    },
                                                    padding: 10,
                                                    color: '#6b7280',
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Wallet Summary Sidebar */}
                    <div className="w-80 flex flex-col gap-6 pt-[56px]">
                        <div className="flex items-center space-x-2 text-white/90 -mt-10">
                            <span className="material-symbols-outlined text-gray-400">account_balance_wallet</span>
                            <h3 className="font-medium">Wallet Summary</h3>
                        </div>

                        {[
                            { name: 'Main Checking', balance: 'RM 5,000.00', icon: 'payment', color: 'blue', income: '+RM 5,000', expense: '-RM 1,750' },
                            { name: 'Savings Account', balance: 'RM 10,000.00', icon: 'savings', color: 'purple', income: '+RM 100', expense: '-RM 0' },
                            { name: 'Cash Wallet', balance: 'RM 500.00', icon: 'wallet', color: 'pink', income: '+RM 0', expense: '-RM 50', hasProgress: true },
                        ].map((wallet, idx) => (
                            <div key={idx} className="glass-panel rounded-xl p-5 relative overflow-hidden group shadow-lg hover:shadow-primary/10 transition-shadow">
                                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg bg-gray-800/80 border border-white/10 flex items-center justify-center text-${wallet.color}-400`}>
                                            <span className="material-symbols-outlined">{wallet.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-white">{wallet.name}</h4>
                                            <p className="text-xs text-gray-500">Current Balance</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-white mb-4">{wallet.balance}</div>
                                {wallet.hasProgress && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-gray-400">Monthly Allowance</span>
                                            <span className="text-white">RM 100</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-1/2 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                                            <span>50.0% used</span>
                                            <span className="text-emerald-500">RM 50 remaining</span>
                                        </div>
                                    </div>
                                )}
                                <div className="pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                                    <div className="flex items-center text-emerald-500">
                                        <span className="material-symbols-outlined text-[10px] mr-1">north_east</span>
                                        {wallet.income}
                                    </div>
                                    <div className={`flex items-center ${wallet.expense === '-RM 0' ? 'text-gray-500' : 'text-rose-500'}`}>
                                        <span className="material-symbols-outlined text-[10px] mr-1">south_east</span>
                                        {wallet.expense}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default Stats;
