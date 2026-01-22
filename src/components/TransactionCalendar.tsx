import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
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

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

  // Calculate transactions per day
  const getDayTransactions = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return transactions.filter(tx => tx.date.startsWith(dateStr));
  };

  // Get installments due on a specific day
  const getDayInstallments = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return installments.filter(inst => inst.next_payment_date.startsWith(dateStr) && inst.status === 'active');
  };

  // Get recurring payments due on a specific day
  const getDayRecurringPayments = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return recurringPayments.filter(rp => rp.next_due_date.startsWith(dateStr) && rp.status === 'active');
  };

  const getDaySummary = (day: number) => {
    const dayTxs = getDayTransactions(day);
    const dayInstallments = getDayInstallments(day);
    const dayRecurring = getDayRecurringPayments(day);
    const income = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const installmentTotal = dayInstallments.reduce((sum, i) => sum + i.monthly_amount, 0);
    const recurringTotal = dayRecurring.reduce((sum, r) => sum + r.amount, 0);
    const total = income - expense;
    return { 
      income, 
      expense, 
      total, 
      hasTransactions: dayTxs.length > 0, 
      count: dayTxs.length,
      installments: dayInstallments,
      installmentTotal,
      recurringPayments: dayRecurring,
      recurringTotal,
      hasUpcoming: dayInstallments.length > 0 || dayRecurring.length > 0
    };
  };

  // Calculate period totals
  const periodIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const periodExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const periodTotal = periodIncome - periodExpense;

  // Navigate months
  const goToPreviousMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    if (onDayClick) {
      onDayClick(date, getDayTransactions(day));
    }
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };

  const weekDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Adjust for Saturday start (shift by 1)
  const adjustedStartDay = (startingDayOfWeek + 1) % 7;
  
  for (let i = 0; i < adjustedStartDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="bg-gradient-to-br from-[#0f1115] to-[#1a1d24] rounded-2xl overflow-hidden shadow-xl">
      {/* Header with Month/Year */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:scale-105"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Calendar size={20} className="text-blue-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{monthNames[month]}</h2>
              <p className="text-sm text-slate-400">{year}</p>
            </div>
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 text-slate-400 hover:text-white hover:scale-105"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 p-4">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-3 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-300/80">Income</span>
          </div>
          <div className="text-emerald-400 font-bold text-lg">
            +{periodIncome.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl p-3 border border-red-500/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-xs text-red-300/80">Expense</span>
          </div>
          <div className="text-red-400 font-bold text-lg">
            -{periodExpense.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className={`bg-gradient-to-br ${periodTotal >= 0 ? 'from-blue-500/20 to-blue-600/10 border-blue-500/20' : 'from-orange-500/20 to-orange-600/10 border-orange-500/20'} rounded-xl p-3 border`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400">Balance</span>
          </div>
          <div className={`font-bold text-lg ${periodTotal >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
            {periodTotal >= 0 ? '+' : ''}{periodTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 px-2">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className={`text-center py-2 text-xs font-semibold tracking-wider ${
              index === 0 ? 'text-blue-400' : index === 1 ? 'text-red-400' : 'text-slate-500'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 p-2 pb-4">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-20 rounded-lg" />;
          }

          const summary = getDaySummary(day);
          const dayOfWeek = (index % 7);
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
              className={`h-20 rounded-xl p-1.5 cursor-pointer transition-all duration-200 relative overflow-hidden
                ${today 
                  ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20 ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/20' 
                  : summary.hasUpcoming
                    ? 'bg-gradient-to-br from-cyan-500/10 to-violet-500/10 hover:from-cyan-500/20 hover:to-violet-500/20 border border-cyan-500/20'
                    : summary.hasTransactions 
                      ? 'bg-white/5 hover:bg-white/10' 
                      : 'hover:bg-white/5'
                }
                ${isSelected && !today ? 'ring-2 ring-purple-400/50' : ''}
              `}
            >
              {/* Day Number */}
              <div className={`text-sm font-semibold flex items-center gap-1 ${
                today 
                  ? 'text-blue-300' 
                  : isSaturday 
                    ? 'text-blue-400' 
                    : isSunday 
                      ? 'text-red-400' 
                      : 'text-slate-400'
              }`}>
                <span className={today ? 'bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : ''}>
                  {day}
                </span>
                {today && <span className="text-[10px] text-blue-300 font-normal">Today</span>}
              </div>
              
              {/* Transaction Summary */}
              {(summary.hasTransactions || summary.hasUpcoming) && (
                <div className="mt-1 space-y-0.5">
                  {summary.income > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                      <span className="text-[10px] text-emerald-400 font-medium truncate">
                        +{summary.income >= 1000 ? `${(summary.income/1000).toFixed(1)}k` : summary.income.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {summary.expense > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-red-400"></div>
                      <span className="text-[10px] text-red-400 font-medium truncate">
                        -{summary.expense >= 1000 ? `${(summary.expense/1000).toFixed(1)}k` : summary.expense.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {/* Installments - Blue color */}
                  {summary.installments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                      <span className="text-[10px] text-cyan-400 font-medium truncate">
                        📱 {summary.installmentTotal >= 1000 ? `${(summary.installmentTotal/1000).toFixed(1)}k` : summary.installmentTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {/* Recurring Payments - Purple color */}
                  {summary.recurringPayments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-violet-400"></div>
                      <span className="text-[10px] text-violet-400 font-medium truncate">
                        🔄 {summary.recurringTotal >= 1000 ? `${(summary.recurringTotal/1000).toFixed(1)}k` : summary.recurringTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Transaction Count Badge */}
              {(summary.count > 0 || summary.hasUpcoming) && (
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                  {summary.count > 0 && (
                    <div className="w-4 h-4 rounded-full bg-slate-700/80 flex items-center justify-center">
                      <span className="text-[9px] text-slate-300 font-medium">{summary.count}</span>
                    </div>
                  )}
                  {summary.installments.length > 0 && (
                    <div className="w-4 h-4 rounded-full bg-cyan-500/30 flex items-center justify-center" title="Installment Due">
                      <Clock size={8} className="text-cyan-400" />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TransactionCalendar;
