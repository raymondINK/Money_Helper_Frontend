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
  account_id: number;
}

export interface TransactionResult {
  amount: number;
  type: string;
  note?: string;
  category?: string;
  accountName?: string;
  isEdit?: boolean;
}

export interface EditableTransaction {
  id: number;
  type: string;
  amount: number;
  note?: string;
  category?: string;
  date?: string;
  account_id: number;
  budget_id?: number;
  to_account_id?: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result?: TransactionResult) => void;
  defaultAccountId?: number;
  editTransaction?: EditableTransaction;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultAccountId,
  editTransaction,
}) => {
  const isEdit = !!editTransaction;

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [budgetId, setBudgetId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Load accounts and seed form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError('');

    const init = async () => {
      try {
        const res = await api.get('/accounts');
        setAccounts(res.data);

        if (editTransaction) {
          // Pre-fill for edit
          setType(editTransaction.type as 'expense' | 'income' | 'transfer');
          setAmount(String(editTransaction.amount));
          setNote(editTransaction.note || '');
          setDate(editTransaction.date ? editTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
          setAccountId(String(editTransaction.account_id));
          setToAccountId(String(editTransaction.to_account_id || ''));
          setBudgetId(String(editTransaction.budget_id || ''));
        } else {
          // Defaults for new transaction
          setType('expense');
          setAmount('');
          setNote('');
          setDate(new Date().toISOString().split('T')[0]);
          setToAccountId('');
          const preferred = defaultAccountId
            ? res.data.find((a: Account) => a.id === defaultAccountId)
            : null;
          const initial = preferred ?? res.data[0];
          if (initial) setAccountId(String(initial.id));
        }
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    };

    init();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload budgets whenever selected account changes
  useEffect(() => {
    if (!accountId || !isOpen) return;

    const fetchBudgets = async () => {
      try {
        const res = await api.get(`/budgets?account_id=${accountId}`);
        const data: Budget[] = res.data || [];
        setBudgets(data);
        if (!editTransaction) {
          // auto-select first budget for expense
          setBudgetId(type === 'expense' && data.length > 0 ? String(data[0].id) : '');
        }
      } catch (err) {
        console.error('Failed to load budgets:', err);
      }
    };

    fetchBudgets();
  }, [accountId, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTypeChange = (next: 'expense' | 'income' | 'transfer') => {
    setType(next);
    setToAccountId('');
    setBudgetId(next === 'expense' && budgets.length > 0 ? String(budgets[0].id) : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);
    const dateWithTime = new Date(date + 'T12:00:00').toISOString();

    try {
      if (type === 'transfer') {
        if (!toAccountId) { setError('Please select a destination account.'); setLoading(false); return; }
        if (accountId === toAccountId) { setError('Cannot transfer to the same account.'); setLoading(false); return; }

        const fromAcc = accounts.find((a) => a.id === parseInt(accountId));
        const toAcc = accounts.find((a) => a.id === parseInt(toAccountId));

        await api.post('/transactions/transfer', {
          from_account_id: parseInt(accountId),
          to_account_id: parseInt(toAccountId),
          amount: amountNum,
          date: dateWithTime,
          note: note.trim() || `Transfer from ${fromAcc?.name} to ${toAcc?.name}`,
        });

        onSuccess({ amount: amountNum, type: 'transfer', note: note.trim(), accountName: fromAcc?.name, isEdit });
      } else {
        // expense or income
        const selectedBudget = budgets.find((b) => String(b.id) === String(budgetId));
        const payload: Record<string, unknown> = {
          type,
          amount: amountNum,
          date: dateWithTime,
          account_id: parseInt(accountId),
          note: note.trim() || undefined,
        };

        // expense: budget required → attach info; income: optional
        if (selectedBudget) {
          payload.budget_id = selectedBudget.id;
          payload.category = selectedBudget.name;
        }

        if (isEdit && editTransaction) {
          await api.put(`/transactions/${editTransaction.id}`, payload);
        } else {
          await api.post('/transactions', payload);
        }

        const acc = accounts.find((a) => a.id === parseInt(accountId));
        onSuccess({ amount: amountNum, type, note: note.trim(), category: selectedBudget?.name, accountName: acc?.name, isEdit });
      }

      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: unknown } }; message?: string };
      const detail = e.response?.data?.detail;
      const msg =
        typeof detail === 'string' ? detail
        : Array.isArray(detail) ? (detail as Array<{ msg?: string }>).map((d) => d.msg).join(', ')
        : e.message || 'Failed to save transaction.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel relative w-full max-w-md rounded-3xl p-8 shadow-2xl border border-white/10">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 flex size-10 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <p className="text-sm text-gray-400">
            {isEdit ? 'Update transaction details below.' : 'Quick entry for your expenses and income.'}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* From Account */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              {type === 'transfer' ? 'From Account' : 'Account'}
            </label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
              >
                <option value="">Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#1a1a2e]">{a.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>

          {/* To Account — transfer only */}
          {type === 'transfer' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-blue-400">To Account</label>
              <div className="relative">
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full appearance-none rounded-xl bg-white/5 border border-blue-500/30 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="">Select destination account</option>
                  {accounts.filter((a) => String(a.id) !== accountId).map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#1a1a2e]">{a.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[18px]">expand_more</span>
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'expense',  label: 'Expense',  emoji: '🌀', active: 'bg-red-500/15 text-red-400 border-red-500/50' },
                  { key: 'income',   label: 'Income',   emoji: '💰', active: 'bg-green-500/15 text-green-400 border-green-500/50' },
                  { key: 'transfer', label: 'Transfer', emoji: '↔️', active: 'bg-blue-500/15 text-blue-400 border-blue-500/50' },
                ] as const
              ).map(({ key, label, emoji, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleTypeChange(key)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 border-2 ${
                    type === key ? active : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                  }`}
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
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
                min="0.01"
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

          {/* Budget Category — expense: required, income: optional, transfer: hidden */}
          {type !== 'transfer' && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-400">
                Budget Category{' '}
                {type === 'income' && <span className="text-gray-500 font-normal">(optional)</span>}
              </label>
              <div className="relative">
                <select
                  value={budgetId}
                  onChange={(e) => setBudgetId(e.target.value)}
                  required={type === 'expense'}
                  className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                >
                  <option value="">{type === 'expense' ? 'Select budget category' : 'None (optional)'}</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id} className="bg-[#1a1a2e]">{b.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[18px]">expand_more</span>
              </div>
              {type === 'expense' && budgets.length === 0 && accountId && (
                <p className="mt-1.5 text-xs text-amber-400">
                  No budgets for this account.{' '}
                  <a href="/budget" className="underline hover:text-amber-300">Create one first.</a>
                </p>
              )}
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

          {/* Buttons */}
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
              {loading ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
