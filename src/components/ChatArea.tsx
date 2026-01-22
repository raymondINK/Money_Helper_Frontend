import React, { useState, useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'
import api from '../api/axios'
import { MessageSquare } from 'lucide-react'

interface ChatAreaProps {
  accounts: any[];
  selectedAccount: any;
  onBalanceUpdate: (balance: number) => void;
}

const ChatArea = ({ accounts, selectedAccount, onBalanceUpdate }: ChatAreaProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!selectedAccount) return;
      try {
        // Filter transactions by selected account
        const res = await api.get(`/transactions?account_id=${selectedAccount.id}&limit=10`);
        setTransactions(res.data);
        
        // Build initial messages - more compact
        const msgs: any[] = [
          {
            id: 0,
            sender: 'Finny',
            isBot: true,
            content: `📊 Viewing ${selectedAccount.name}. Recent transactions below:`,
            timestamp: 'Today'
          }
        ];
        
        res.data.slice(0, 5).reverse().forEach((tx: any, idx: number) => {
          msgs.push({
            id: msgs.length,
            sender: 'Finny',
            isBot: true,
            content: `Transaction logged: ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)} for ${tx.note || 'No description'}.`,
            isConfirmation: true,
            amount: `${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)}`
          });
        });
        
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading transactions:', err);
      }
    };
    
    loadTransactions();
  }, [selectedAccount]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {/* Compact date header */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className="h-px bg-white/10 flex-1"></div>
        <span className="text-xs text-slate-500 px-2">Today</span>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>
      
      {/* Messages with compact spacing */}
      <div className="space-y-2">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} compact />
        ))}
      </div>
      <div ref={endRef} />
    </div>
  )
}

export default ChatArea
