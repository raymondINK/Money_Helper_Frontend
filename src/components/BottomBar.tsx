import React, { useState, useEffect, useRef } from 'react'
import { Send, ChevronDown, Paperclip, X, Loader2, Sparkles, ArrowLeftRight } from 'lucide-react'
import api from '../api/axios'

interface Budget {
  id: number;
  name: string;
  icon: string;
  budget_amount: number;
  account_id: number;
}

interface ParsedTransaction {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category?: string;
  fromAccountId?: number;
  toAccountId?: number;
  date?: string; // ISO date string
}

interface BottomBarProps {
  accounts: any[];
  selectedAccount?: any;
  onTransactionCreated: () => void;
}

const BottomBar = ({ accounts, selectedAccount, onTransactionCreated }: BottomBarProps) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('General');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanningImage, setScanningImage] = useState(false);
  const [llmResponse, setLlmResponse] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [parsedTx, setParsedTx] = useState<ParsedTransaction | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    note: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBudgets();
  }, [selectedAccount]);

  const loadBudgets = async () => {
    try {
      const url = selectedAccount
        ? `/budgets?account_id=${selectedAccount.id}`
        : '/budgets';
      const res = await api.get(url);
      setBudgets(res.data);
      setSelectedCategory('General');
    } catch (err) {
      console.error('Error loading budgets:', err);
    }
  };

  // Call local LLM to understand the transaction
  const callLocalLLM = async (text: string, imageBase64?: string): Promise<ParsedTransaction | null> => {
    try {
      const categoryList = budgets.map(b => b.name).join(', ') || 'Food, Transport, Shopping, Bills';

      // Get today's date for reference
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Simplified prompt for better parsing
      const systemPrompt = `Extract transaction info from text. Return JSON only. Today is ${todayStr}.

Format: {"type": "expense", "amount": 50, "description": "lunch", "category": "Food", "date": "${todayStr}"}

Rules:
- type: "income" for money received, "expense" for money spent, "transfer" for moving between accounts
- amount: number only (no currency symbols)
- description: brief text
- category: pick from [General, Income, ${categoryList}]
- date: ISO date (YYYY-MM-DD). Parse "yesterday", "last week", "2 days ago" etc. Default to today.

Examples:
"spent rm50 on lunch yesterday" -> {"type":"expense","amount":50,"description":"lunch","category":"Food","date":"${new Date(today.getTime() - 86400000).toISOString().split('T')[0]}"}
"received 1000 salary" -> {"type":"income","amount":1000,"description":"salary","category":"Income","date":"${todayStr}"}
"bought coffee last monday 5" -> {"type":"expense","amount":5,"description":"coffee","category":"Food","date":"calculate from last monday"}`;

      // Build the request body based on whether we have an image
      const requestBody: any = {
        model: "qwen3-vl-4b",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
        stream: false
      };

      // Handle image vs text-only content
      if (imageBase64) {
        // Vision model format with image
        requestBody.messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: text || "Please analyze this receipt/image and extract the transaction details (type, amount, description, category). Return as JSON."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        });
      } else {
        // Text-only format
        requestBody.messages.push({
          role: "user",
          content: `Parse this transaction: "${text}"`
        });
      }

      console.log('Calling LLM with:', { hasImage: !!imageBase64, textLength: text?.length });

      const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM response error:', response.status, errorText);
        throw new Error(`LLM request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('LLM response:', data);
      const content = data.choices?.[0]?.message?.content || '';
      setLlmResponse(content);

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          return null;
        }
        return {
          type: parsed.type || 'expense',
          amount: parseFloat(parsed.amount) || 0,
          description: parsed.description || 'Transaction',
          category: parsed.category || selectedCategory,
          date: parsed.date || new Date().toISOString().split('T')[0],
        };
      }
      return null;
    } catch (err) {
      console.error('Error calling LLM:', err);
      // Fallback to simple parsing
      return fallbackParse(text);
    }
  };

  // Parse date from text like "yesterday", "last week", etc.
  const parseDateFromText = (text: string): string => {
    const lower = text.toLowerCase();
    const today = new Date();

    if (lower.includes('yesterday')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }
    if (lower.includes('day before yesterday') || lower.includes('2 days ago')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return d.toISOString().split('T')[0];
    }
    if (lower.includes('last week')) {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    }
    // Match "X days ago"
    const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
    if (daysAgoMatch) {
      const d = new Date(today);
      d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
      return d.toISOString().split('T')[0];
    }
    // Match day names like "last monday", "last tuesday"
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (lower.includes('last ' + dayNames[i]) || lower.includes(dayNames[i] + ' night') || lower.includes(dayNames[i] + ' morning')) {
        const d = new Date(today);
        const currentDay = d.getDay();
        let daysBack = currentDay - i;
        if (daysBack <= 0) daysBack += 7;
        d.setDate(d.getDate() - daysBack);
        return d.toISOString().split('T')[0];
      }
    }
    return today.toISOString().split('T')[0];
  };

  // Fallback simple parser if LLM is not available
  const fallbackParse = (text: string): ParsedTransaction | null => {
    const lower = text.toLowerCase();
    const isIncome = /earned|received|got|salary|income|\+/.test(lower);
    const isExpense = /spent|paid|bought|purchase|-/.test(lower);
    const isTransfer = /transfer|move|send to|from .* to/i.test(lower);

    // Parse date from text
    const parsedDate = parseDateFromText(text);

    const amtMatch = text.match(/(?:rm|RM|MYR|myr|\$)?\s*(-?\d+(?:[.,]\d{1,2})?)/);
    if (!amtMatch) return null;

    const amount = parseFloat(amtMatch[1].replace(',', '.'));
    if (Number.isNaN(amount) || amount === 0) return null;

    let type: 'income' | 'expense' | 'transfer' = isTransfer ? 'transfer' : (isIncome ? 'income' : (isExpense ? 'expense' : 'expense'));

    // Extract description - remove the amount and common keywords
    const description = text
      .replace(/(?:rm|RM|MYR|myr|\$)?\s*-?\d+(?:[.,]\d{1,2})?/, '')
      .replace(/\b(spent|paid|bought|earned|received|got|on|for|from|transfer|to)\b/gi, '')
      .trim() || 'Transaction';

    return { type, amount: Math.abs(amount), description, category: selectedCategory, date: parsedDate };
  };

  // // Handle transfer between accounts
  // const handleTransfer = async () => {
  //   if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
  //     alert('Please fill in all transfer fields');
  //     return;
  //   }

  //   if (transferData.fromAccountId === transferData.toAccountId) {
  //     alert('Cannot transfer to the same account');
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const amount = parseFloat(transferData.amount);
  //     const fromAccount = accounts.find(a => a.id === parseInt(transferData.fromAccountId));
  //     const toAccount = accounts.find(a => a.id === parseInt(transferData.toAccountId));

  //     // Create expense from source account
  //     await api.post('/transactions', {
  //       account_id: parseInt(transferData.fromAccountId),
  //       amount: amount,
  //       type: 'expense',
  //       note: transferData.note || `Transfer to ${toAccount?.name}`,
  //       category: 'Transfer',
  //       date: new Date().toISOString(),
  //     });

  //     // Create income to destination account
  //     await api.post('/transactions', {
  //       account_id: parseInt(transferData.toAccountId),
  //       amount: amount,
  //       type: 'income',
  //       note: transferData.note || `Transfer from ${fromAccount?.name}`,
  //       category: 'Transfer',
  //       date: new Date().toISOString(),
  //     });

  //     // Reset and close
  //     setTransferData({ fromAccountId: '', toAccountId: '', amount: '', note: '' });
  //     setShowTransferModal(false);
  //     onTransactionCreated();
  //   } catch (err) {
  //     console.error('Error creating transfer:', err);
  //     alert('Failed to create transfer');
  //   }
  //   setLoading(false);
  // };
  // Handle transfer between accounts
  const handleTransfer = async () => {
    // Basic validation
    if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
      alert('Please fill in all transfer fields');
      return;
    }

    if (transferData.fromAccountId === transferData.toAccountId) {
      alert('Cannot transfer to the same account');
      return;
    }

    setLoading(true);

    try {
      const amount = parseFloat(transferData.amount);
      const fromAccount = accounts.find(a => a.id === parseInt(transferData.fromAccountId));
      const toAccount = accounts.find(a => a.id === parseInt(transferData.toAccountId));

      // --- Create transfer transaction in backend ---
      // 1. Expense from source account
      await api.post('/transactions', {
        account_id: parseInt(transferData.fromAccountId),
        amount: amount,
        type: 'transfer', // keep transfer type
        direction: 'out', // custom field to know it's outgoing
        note: transferData.note || `Transfer to ${toAccount?.name}`,
        category: 'Transfer',
        date: new Date().toISOString(),
      });

      // 2. Income to destination account
      await api.post('/transactions', {
        account_id: parseInt(transferData.toAccountId),
        amount: amount,
        type: 'transfer', // keep transfer type
        direction: 'in', // custom field to know it's incoming
        note: transferData.note || `Transfer from ${fromAccount?.name}`,
        category: 'Transfer',
        date: new Date().toISOString(),
      });

      // --- Update frontend state to show correctly ---
      // Optional: add to local transactions to immediately reflect balances
      const newTransactions = [
        {
          id: Date.now(), // temp ID for frontend
          account_id: parseInt(transferData.fromAccountId),
          amount: -amount, // show as negative for UI
          type: 'expense',
          note: transferData.note || `Transfer to ${toAccount?.name}`,
          category: 'Transfer',
          date: new Date().toISOString(),
        },
        {
          id: Date.now() + 1,
          account_id: parseInt(transferData.toAccountId),
          amount: amount, // positive for UI
          type: 'income',
          note: transferData.note || `Transfer from ${fromAccount?.name}`,
          category: 'Transfer',
          date: new Date().toISOString(),
        }
      ];

      // Optionally, update transactions state immediately
      onTransactionCreated(newTransactions);

      // Reset form & close modal
      setTransferData({ fromAccountId: '', toAccountId: '', amount: '', note: '' });
      setShowTransferModal(false);
    } catch (err) {
      console.error('Error creating transfer:', err);
      alert('Failed to create transfer');
    }

    setLoading(false);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert image to base64 for LLM
  const getImageBase64 = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!imageFile) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(imageFile);
    });
  };

  // Scan uploaded image
  const handleScanImage = async () => {
    if (!uploadedImage) return;

    setScanningImage(true);
    try {
      const base64 = await getImageBase64();
      const parsed = await callLocalLLM(message, base64);

      if (parsed) {
        setParsedTx(parsed);
        setShowPreview(true);
      } else {
        alert('Could not extract transaction from image. Please enter details manually.');
      }
    } catch (err) {
      console.error('Error scanning image:', err);
      alert('Failed to scan image. Please try again.');
    } finally {
      setScanningImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const accountToUse = selectedAccount || (accounts.length > 0 ? accounts[0] : null);
    if ((!message.trim() && !uploadedImage) || !accountToUse || loading) return;

    setLoading(true);

    try {
      let parsed: ParsedTransaction | null = null;

      // If there's an image, scan it first
      if (uploadedImage && !parsedTx) {
        const base64 = await getImageBase64();
        parsed = await callLocalLLM(message || 'Extract transaction from this receipt', base64);
      } else if (parsedTx) {
        parsed = parsedTx;
      } else {
        // Use LLM to parse text
        parsed = await callLocalLLM(message);
      }

      if (parsed && parsed.amount > 0) {
        // Show preview for confirmation
        setParsedTx(parsed);
        setShowPreview(true);
      } else {
        alert('Could not understand the transaction. Please try again with more details.\nExample: "Spent RM50 on lunch" or "Received RM1000 salary"');
      }
    } catch (err) {
      console.error('Error processing:', err);
      alert('Failed to process. Please try again.');
    }

    setLoading(false);
  };

  // Confirm and create the transaction
  const confirmTransaction = async () => {
    if (!parsedTx) return;

    const accountToUse = selectedAccount || (accounts.length > 0 ? accounts[0] : null);
    if (!accountToUse) return;

    // If it's a transfer, handle it with the selected accounts from preview
    if (parsedTx.type === 'transfer') {
      const fromAccId = parsedTx.fromAccountId || accountToUse.id;
      const toAccId = parsedTx.toAccountId;

      if (!toAccId) {
        alert('Please select a destination account for the transfer');
        return;
      }

      if (fromAccId === toAccId) {
        alert('Cannot transfer to the same account');
        return;
      }

      const fromAccount = accounts.find(a => a.id === fromAccId);
      const toAccount = accounts.find(a => a.id === toAccId);

      setLoading(true);
      try {
        // Use parsed date or default to today
        const txDate = parsedTx.date
          ? new Date(parsedTx.date + 'T12:00:00').toISOString()
          : new Date().toISOString();

        // Create expense from source account
        await api.post('/transactions', {
          account_id: fromAccId,
          amount: parsedTx.amount,
          type: 'expense',
          note: parsedTx.description || `Transfer to ${toAccount?.name}`,
          category: 'Transfer',
          date: txDate,
        });

        // Create income to destination account
        await api.post('/transactions', {
          account_id: toAccId,
          amount: parsedTx.amount,
          type: 'income',
          note: parsedTx.description || `Transfer from ${fromAccount?.name}`,
          category: 'Transfer',
          date: txDate,
        });

        // Clear everything
        setMessage('');
        setUploadedImage(null);
        setImageFile(null);
        setParsedTx(null);
        setShowPreview(false);
        setLlmResponse('');
        onTransactionCreated();
      } catch (err) {
        console.error('Error creating transfer:', err);
        alert('Failed to create transfer');
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Use parsed date or default to today
      const txDate = parsedTx.date
        ? new Date(parsedTx.date + 'T12:00:00').toISOString()
        : new Date().toISOString();

      await api.post('/transactions', {
        account_id: accountToUse.id,
        amount: parsedTx.amount,
        type: parsedTx.type,
        note: parsedTx.description,
        category: parsedTx.category || selectedCategory,
        date: txDate,
      });

      // Clear everything
      setMessage('');
      setUploadedImage(null);
      setImageFile(null);
      setParsedTx(null);
      setShowPreview(false);
      setLlmResponse('');
      onTransactionCreated();
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert('Failed to create transaction');
    }
    setLoading(false);
  };

  // Remove uploaded image
  const removeImage = () => {
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get all categories
  const allCategories = [
    { name: 'General', icon: '📦' },
    { name: 'Income', icon: '💰' },
    ...budgets.map(b => ({ name: b.name, icon: b.icon || '📦' }))
  ];

  return (
    <div className="border-t border-gray-700 p-4">
      {/* Transaction Preview Modal */}
      {showPreview && parsedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Confirm Transaction</h3>
              </div>
              <button
                onClick={() => { setShowPreview(false); setParsedTx(null); }}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${parsedTx.type === 'income' ? 'bg-emerald-500/10 border border-emerald-500/30' : parsedTx.type === 'transfer' ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <div className="text-sm text-slate-400 mb-1">Amount</div>
                <div className={`text-3xl font-bold ${parsedTx.type === 'income' ? 'text-emerald-400' : parsedTx.type === 'transfer' ? 'text-blue-400' : 'text-red-400'}`}>
                  {parsedTx.type === 'income' ? '+' : parsedTx.type === 'transfer' ? '↔' : '-'}RM {parsedTx.amount.toFixed(2)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0f1115] rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Type</div>
                  <select
                    value={parsedTx.type}
                    onChange={(e) => setParsedTx({ ...parsedTx, type: e.target.value as 'income' | 'expense' | 'transfer' })}
                    className="w-full bg-transparent text-white font-medium focus:outline-none"
                  >
                    <option value="expense">💸 Expense</option>
                    <option value="income">💰 Income</option>
                    <option value="transfer">↔️ Transfer</option>
                  </select>
                </div>
                <div className="bg-[#0f1115] rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Category</div>
                  <select
                    value={parsedTx.category}
                    onChange={(e) => setParsedTx({ ...parsedTx, category: e.target.value })}
                    className="w-full bg-transparent text-white font-medium focus:outline-none"
                  >
                    {allCategories.map(cat => (
                      <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transfer Account Selection */}
              {parsedTx.type === 'transfer' && (
                <div className="space-y-3">
                  <div className="bg-[#0f1115] rounded-xl p-3 border border-orange-500/20">
                    <div className="text-xs text-orange-400 mb-1">💳 From Account (Money Out)</div>
                    <select
                      value={parsedTx.fromAccountId || selectedAccount?.id || ''}
                      onChange={(e) => setParsedTx({ ...parsedTx, fromAccountId: parseInt(e.target.value) })}
                      className="w-full bg-transparent text-white font-medium focus:outline-none"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-center">
                    <div className="p-1 bg-blue-500/20 rounded-full">
                      <ArrowLeftRight className="text-blue-400" size={16} />
                    </div>
                  </div>
                  <div className="bg-[#0f1115] rounded-xl p-3 border border-emerald-500/20">
                    <div className="text-xs text-emerald-400 mb-1">💰 To Account (Money In)</div>
                    <select
                      value={parsedTx.toAccountId || ''}
                      onChange={(e) => setParsedTx({ ...parsedTx, toAccountId: parseInt(e.target.value) })}
                      className="w-full bg-transparent text-white font-medium focus:outline-none"
                    >
                      <option value="">Select destination...</option>
                      {accounts.filter(acc => acc.id !== (parsedTx.fromAccountId || selectedAccount?.id)).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="bg-[#0f1115] rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Description</div>
                <input
                  type="text"
                  value={parsedTx.description}
                  onChange={(e) => setParsedTx({ ...parsedTx, description: e.target.value })}
                  className="w-full bg-transparent text-white font-medium focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0f1115] rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">Amount (RM)</div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={parsedTx.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setParsedTx({ ...parsedTx, amount: parseFloat(val) || 0 });
                      }
                    }}
                    className="w-full bg-transparent text-white font-medium focus:outline-none"
                  />
                </div>
                <div className="bg-[#0f1115] rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1">📅 Date</div>
                  <input
                    type="date"
                    value={parsedTx.date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setParsedTx({ ...parsedTx, date: e.target.value })}
                    className="w-full bg-transparent text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              {llmResponse && (
                <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2">
                  <span className="text-blue-400">AI Response:</span> {llmResponse.substring(0, 100)}...
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPreview(false); setParsedTx(null); }}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmTransaction}
                disabled={loading || (parsedTx.type === 'transfer' && !parsedTx.toAccountId)}
                className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-all shadow-lg ${parsedTx.type === 'income'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/30'
                    : parsedTx.type === 'transfer'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30'
                  } text-white disabled:opacity-50`}
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : (parsedTx.type === 'transfer' ? 'Confirm Transfer' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Transfer Between Accounts</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-2 hover:bg-white/5 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* From Account */}
              <div className="bg-[#0f1115] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">From Account</div>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                  className="w-full bg-transparent text-white font-medium focus:outline-none"
                >
                  <option value="">Select account...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (RM {acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Arrow Icon */}
              <div className="flex justify-center">
                <div className="p-2 bg-blue-500/20 rounded-full">
                  <ArrowLeftRight className="text-blue-400" size={20} />
                </div>
              </div>

              {/* To Account */}
              <div className="bg-[#0f1115] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">To Account</div>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                  className="w-full bg-transparent text-white font-medium focus:outline-none"
                >
                  <option value="">Select account...</option>
                  {accounts.filter(a => a.id !== parseInt(transferData.fromAccountId)).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (RM {acc.balance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Amount (RM)</div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transferData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setTransferData({ ...transferData, amount: val });
                    }
                  }}
                  className="w-full bg-transparent text-2xl font-bold text-blue-400 focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Note */}
              <div className="bg-[#0f1115] rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-2">Note (optional)</div>
                <input
                  type="text"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  className="w-full bg-transparent text-white focus:outline-none"
                  placeholder="e.g., Monthly savings"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading || !transferData.fromAccountId || !transferData.toAccountId || !transferData.amount}
                className="flex-1 px-4 py-3 font-semibold rounded-lg transition-all shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/30 text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Image Preview */}
      {uploadedImage && (
        <div className="mb-3 relative inline-block">
          <img
            src={uploadedImage}
            alt="Upload preview"
            className="h-20 rounded-lg border border-white/10"
          />
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
          >
            <X size={14} />
          </button>
          {!scanningImage && (
            <button
              onClick={handleScanImage}
              className="absolute bottom-1 right-1 px-2 py-1 bg-blue-500 rounded text-xs text-white hover:bg-blue-600 flex items-center gap-1"
            >
              <Sparkles size={12} />
              Scan
            </button>
          )}
          {scanningImage && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={24} />
            </div>
          )}
        </div>
      )}

      {/* Category Picker */}
      <div className="mb-3 relative">
        <button
          type="button"
          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <span>{allCategories.find(c => c.name === selectedCategory)?.icon || '📦'}</span>
          <span>{selectedCategory}</span>
          <ChevronDown size={14} className={`transition-transform ${showCategoryPicker ? 'rotate-180' : ''}`} />
        </button>

        {showCategoryPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
            <div className="p-2 text-xs text-gray-500 border-b border-gray-700">Select Category</div>
            {allCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => {
                  setSelectedCategory(cat.name);
                  setShowCategoryPicker(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-left ${selectedCategory === cat.name ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything or log a transaction..."
            className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
          />
        </div>

        {/* Image Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          title="Upload receipt image"
        >
          <Paperclip size={20} />
        </button>

        <button
          type="submit"
          disabled={loading || (!message.trim() && !uploadedImage)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/30"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
        </button>
      </form>

      {/* Quick Actions */}
      <div className="flex items-center justify-center space-x-6 mt-4">
        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm">New Transaction</span>
        </button>

        <button
          onClick={() => {
            setTransferData({ fromAccountId: selectedAccount?.id?.toString() || '', toAccountId: '', amount: '', note: '' });
            setShowTransferModal(true);
          }}
          className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeftRight size={16} />
          <span className="text-sm">Transfer</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm">Search Reports</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-sm">Export Data</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Budget Help</span>
        </button>

        <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-sm">More</span>
        </button>
      </div>
    </div>
  )
}

export default BottomBar
