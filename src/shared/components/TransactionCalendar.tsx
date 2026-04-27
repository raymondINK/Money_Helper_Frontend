import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  note?: string;
  category?: string;
}

interface Installment {
  id: number;
  name: string;
  icon: string;
  monthly_amount: number;
  next_payment_date: string;
  status: string;
}

interface RecurringPayment {
  id: number;
  name: string;
  icon: string;
  amount: number;
  next_due_date: string;
  status: string;
}

interface TransactionCalendarProps {
  transactions: Transaction[];
  installments?: Installment[];
  recurringPayments?: RecurringPayment[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick?: (date: Date, dayTransactions: Transaction[]) => void;
}

const TransactionCalendar: React.FC<TransactionCalendarProps> = ({
  transactions,
  installments = [],
  recurringPayments = [],
  currentDate,
  onDateChange,
  onDayClick
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Clear selection when month changes
  useEffect(() => {
    setSelectedDate(null);
  }, [year, month]);

  const getDayTransactions = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return transactions.filter(tx => tx.date.startsWith(dateStr));
  };

  // Compute per-day expense totals to determine max (used for intensity scale)
  const dayExpenses: number[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const txs = getDayTransactions(d);
    dayExpenses.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  }
  const maxExpense = Math.max(...dayExpenses, 1);

  const getDaySummary = (day: number) => {
    const dayTxs = getDayTransactions(day);
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      hasTransactions: dayTxs.length > 0,
      count: dayTxs.length,
      hasIncome: income > 0,
      hasExpense: expense > 0
    };
  };

  // Intensity: 0 = none, 1 = low (<25%), 2 = medium (25-65%), 3 = high (>65%)
  const getExpenseIntensity = (day: number): 0 | 1 | 2 | 3 => {
    const exp = dayExpenses[day - 1];
    if (exp === 0) return 0;
    const ratio = exp / maxExpense;
    if (ratio < 0.25) return 1;
    if (ratio < 0.65) return 2;
    return 3;
  };

  const intensityBg: Record<0 | 1 | 2 | 3, string> = {
    0: '',
    1: 'bg-emerald-500/10',
    2: 'bg-amber-500/15',
    3: 'bg-rose-500/20',
  };

  const intensityDot: Record<0 | 1 | 2 | 3, string> = {
    0: '',
    1: 'bg-emerald-500',
    2: 'bg-amber-400',
    3: 'bg-rose-500',
  };

  const periodIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const periodExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  const goToPreviousMonth = () => onDateChange(new Date(year, month - 1, 1));
  const goToNextMonth = () => onDateChange(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    if (onDayClick) onDayClick(date, getDayTransactions(day));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const weekDays = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
  const calendarDays: (number | null)[] = [];
  const adjustedStartDay = (startingDayOfWeek + 1) % 7;
  for (let i = 0; i < adjustedStartDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center justify-between bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-3 rounded-2xl">
          <button onClick={goToPreviousMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <h3 className="font-bold text-base">{monthNames[month]} {year}</h3>
          </div>
          <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        {/* Period summary + intensity legend */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex flex-col justify-center min-w-[100px]">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Income</p>
            <h4 className="text-base font-bold text-emerald-400">+{periodIncome.toLocaleString()}</h4>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl flex flex-col justify-center min-w-[100px]">
            <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Expense</p>
            <h4 className="text-base font-bold text-rose-400">-{periodExpense.toLocaleString()}</h4>
          </div>
          {/* Intensity legend */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 self-end pb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />Low
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block ml-1" />Mid
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ml-1" />High
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {weekDays.map((day, index) => (
            <div key={day} className={`py-3 text-center text-[10px] font-bold uppercase tracking-widest ${index === 0 ? 'text-indigo-400' : index === 1 ? 'text-rose-400' : 'text-zinc-500'}`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-16 p-2 border-r border-b border-zinc-800 last:border-r-0" />;
            }
            const summary = getDaySummary(day);
            const intensity = getExpenseIntensity(day);
            const dayOfWeek = index % 7;
            const isSaturday = dayOfWeek === 0;
            const isSunday = dayOfWeek === 1;
            const today = isToday(day);
            const isSelected = selectedDate?.getDate() === day &&
              selectedDate?.getMonth() === month &&
              selectedDate?.getFullYear() === year;

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className={`h-16 p-1.5 border-r border-b border-zinc-800 cursor-pointer transition-all relative
                  ${isSelected ? 'ring-2 ring-violet-500 ring-inset bg-violet-500/20 shadow-lg shadow-violet-500/20'
                    : intensity > 0 ? intensityBg[intensity]
                    : 'hover:bg-white/[0.02]'}
                  ${index % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium ${today ? 'text-violet-400 font-bold'
                    : isSaturday ? 'text-indigo-400 font-bold'
                    : isSunday ? 'text-rose-400 font-bold'
                    : summary.hasTransactions ? 'text-white font-bold' : 'text-zinc-500'
                  }`}>
                    {day}
                  </span>
                  {/* Intensity dot */}
                  {intensity > 0 && !isSelected && (
                    <div className={`w-1.5 h-1.5 rounded-full ${intensityDot[intensity]}`} />
                  )}
                  {isSelected && summary.count > 0 && (
                    <span className="text-[8px] px-1 bg-violet-500 text-white rounded-full">{summary.count}</span>
                  )}
                </div>
                {/* Day total amount (expense if any, else income) */}
                {summary.hasTransactions && (
                  <div className="absolute bottom-1 left-1 right-1">
                    {summary.hasExpense && (
                      <p className={`text-[8px] font-semibold leading-none truncate ${intensity === 3 ? 'text-rose-400' : intensity === 2 ? 'text-amber-400' : 'text-emerald-500'}`}>
                        -{summary.expense > 999 ? `${(summary.expense / 1000).toFixed(1)}k` : summary.expense.toFixed(0)}
                      </p>
                    )}
                    {!summary.hasExpense && summary.hasIncome && (
                      <p className="text-[8px] font-semibold leading-none truncate text-emerald-400">
                        +{summary.income > 999 ? `${(summary.income / 1000).toFixed(1)}k` : summary.income.toFixed(0)}
                      </p>
                    )}
                  </div>
                )}
                {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TransactionCalendar;

