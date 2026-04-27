import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Budget {
  id: number;
  name: string;
  icon?: string | null;
  budget_amount: number;
  spent_amount?: number;
  account_id: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultAccountId?: number;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, defaultAccountId }) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [budgetId, setBudgetId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const accountsRes = await api.get('/accounts');
      setAccounts(accountsRes.data);

      if (accountsRes.data.length > 0) {
        const preferred = defaultAccountId
          ? accountsRes.data.find((a: Account) => a.id === defaultAccountId)
          : null;
        const initialAccountId = (preferred ?? accountsRes.data[0]).id;
        setAccountId(String(initialAccountId));

        const budgetsRes = await api.get(`/budgets?account_id=${initialAccountId}`);
        setBudgets(budgetsRes.data || []);
        if ((budgetsRes.data || []).length > 0) {
          setBudgetId(budgetsRes.data[0].id.toString());
        } else {
          setBudgetId('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  useEffect(() => {
    // When user switches account in the modal, reload budgets for that account
    if (!accountId || !isOpen) return;
    const fetchBudgets = async () => {
      try {
        const res = await api.get(`/budgets?account_id=${accountId}`);
        setBudgets(res.data || []);
        if ((res.data || []).length > 0) {
          setBudgetId(res.data[0].id.toString());
        } else {
          setBudgetId('');
        }
      } catch (err) {
        console.error('Failed to fetch budgets for account:', err);
      }
    };
    fetchBudgets();
  }, [accountId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedBudget = budgets.find(b => String(b.id) === String(budgetId));

      await api.post('/transactions', {
        type,
        amount: parseFloat(amount),
        date,
        account_id: parseInt(accountId),
        budget_id: selectedBudget ? selectedBudget.id : undefined,
        category: selectedBudget ? selectedBudget.name : undefined,
        note: note.trim() || undefined,
        is_recurring: isRecurring
      });

      // Reset form
      setAmount('');
      setNote('');
      setType('expense');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create transaction:', err);
      alert(err.response?.data?.detail || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    setType(newType);
  };

  if (!isOpen) return null;

  const filteredBudgets = budgets; // budgets are already scoped to account

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel relative w-full max-w-md rounded-3xl p-8 shadow-2xl border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex size-10 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Add Transaction</h2>
          <p className="text-sm text-gray-400">Quick entry for your expenses and income</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Account</label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id} className="bg-[#1a1a2e]">
                    {account.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'expense'
                    ? 'bg-red-500/15 text-red-400 border-2 border-red-500/50'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                <span>🌀</span> Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'income'
                    ? 'bg-green-500/15 text-green-400 border-2 border-green-500/50'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                <span>💰</span> Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  type === 'transfer'
                    ? 'bg-blue-500/15 text-blue-400 border-2 border-blue-500/50'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                <span>↔️</span> Transfer
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">RM</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full rounded-xl bg-white/5 border border-white/10 py-3 pl-12 pr-4 text-xl font-bold text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Description</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Grocery shopping"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white placeholder-gray-600 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Budget Category (based on selected account) */}
          {type !== 'transfer' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">Budget Category</label>
              <div className="relative">
                <select
                  value={budgetId}
                  onChange={(e) => setBudgetId(e.target.value)}
                  required
                  className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="">Select category</option>
                  {filteredBudgets.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#1a1a2e]">
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-white/[0.06] py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all border border-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
