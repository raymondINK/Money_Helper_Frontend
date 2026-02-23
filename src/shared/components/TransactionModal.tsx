import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [categoriesRes, accountsRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts')
      ]);
      setCategories(categoriesRes.data);
      setAccounts(accountsRes.data);
      
      // Set default selections
      if (accountsRes.data.length > 0) {
        setAccountId(accountsRes.data[0].id.toString());
      }
      if (categoriesRes.data.length > 0) {
        const defaultCategory = categoriesRes.data.find((c: Category) => c.type === type);
        if (defaultCategory) {
          setCategoryId(defaultCategory.id.toString());
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/transactions', {
        type,
        amount: parseFloat(amount),
        date,
        category_id: parseInt(categoryId),
        account_id: parseInt(accountId),
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
    // Update category to match type
    const matchingCategory = categories.find(c => c.type === newType);
    if (matchingCategory) {
      setCategoryId(matchingCategory.id.toString());
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === type);

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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  type === 'expense'
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  type === 'income'
                    ? 'bg-primary/20 text-primary border-2 border-primary/50 shadow-[0_0_15px_rgba(13,242,89,0.3)]'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  type === 'transfer'
                    ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10'
                }`}
              >
                Transfer
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="w-full rounded-xl bg-white/5 border border-white/10 py-4 pl-10 pr-4 text-2xl font-bold text-white placeholder-gray-600 outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Category
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              >
                <option value="">Select category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-gray-900">
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Account */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Account
            </label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full appearance-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-10 text-sm font-medium text-white outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id} className="bg-gray-900">
                    {account.name} - ${account.balance.toFixed(2)}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-gray-500">
              Note
              <span className="ml-2 text-gray-600">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-medium text-white placeholder-gray-600 outline-none focus:border-primary/50 focus:bg-white/10 transition-all resize-none"
            />
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-gray-400">repeat</span>
              <div>
                <p className="text-sm font-bold text-white">Recurring Transaction</p>
                <p className="text-xs text-gray-500">Set up automatic entries</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isRecurring ? 'bg-primary' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow-lg transition-transform ${
                  isRecurring ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-white/5 py-4 text-sm font-bold text-gray-300 hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-teal-500 py-4 text-sm font-bold text-black hover:shadow-[0_0_30px_rgba(13,242,89,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>

        {/* AI Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          <span>Powered by AI categorization</span>
        </div>
      </div>
    </div>
  );
};
