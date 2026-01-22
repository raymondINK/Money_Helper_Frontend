import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Transaction {
  id: number;
  amount: number;
  note: string;
  date: string;
}

interface CategoryBudgetRowProps {
  icon: string;
  name: string;
  budgetAmount: number;
  spentAmount: number;
  currency?: string;
  transactions?: Transaction[];
  onClick?: () => void;
}

const CategoryBudgetRow: React.FC<CategoryBudgetRowProps> = ({
  icon,
  name,
  budgetAmount,
  spentAmount,
  currency = 'RM',
  transactions = [],
  onClick
}) => {
  const [expanded, setExpanded] = useState(false);
  const remaining = budgetAmount - spentAmount;
  const percentage = budgetAmount > 0 ? Math.min((spentAmount / budgetAmount) * 100, 100) : 0;
  const isOverBudget = spentAmount > budgetAmount;

  const handleClick = () => {
    if (transactions.length > 0) {
      setExpanded(!expanded);
    }
    onClick?.();
  };

  return (
    <div className="bg-[#1a1d24]/60 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
      <div 
        className={`p-4 ${transactions.length > 0 ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">{icon}</span>
            <span className="text-slate-200 font-medium">{name}</span>
            {transactions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                <span>{transactions.length} items</span>
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </div>
            )}
          </div>
          <span className={`text-sm font-semibold ${isOverBudget ? 'text-red-400' : 'text-slate-400'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-[#0f1115] rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverBudget 
                ? 'bg-gradient-to-r from-red-500 to-red-400' 
                : percentage > 75 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-400'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        {/* Amounts */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
            {currency} {budgetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className={`font-medium ${isOverBudget ? 'text-red-400' : 'text-violet-400'}`}>
            {spentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className={`font-medium ${isOverBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Expanded Transaction List */}
      {expanded && transactions.length > 0 && (
        <div className="border-t border-white/5 bg-[#0f1115]/50 max-h-48 overflow-y-auto">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/5">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">{tx.note || 'No description'}</p>
                <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <div className="text-sm font-medium text-red-400">
                -{currency} {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryBudgetRow;
