import React, { useState, useEffect, useRef, useCallback } from 'react'
import ChatMessage from './ChatMessage'
import api from '../api/axios'
import { MessageSquare, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'

interface Message {
  id: number;
  sender: string;
  isBot: boolean;
  content: string;
  timestamp?: string;
  isConfirmation?: boolean;
  amount?: string;
  isTyping?: boolean;
}

interface ChatAreaProps {
  accounts: any[];
  selectedAccount: any;
  onBalanceUpdate: (balance: number) => void;
  onNewMessage?: (message: Message) => void;
}

const ChatArea = ({ accounts, selectedAccount, onBalanceUpdate, onNewMessage }: ChatAreaProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Generate a typing animation message
  const addTypingIndicator = () => {
    setIsTyping(true);
  };

  const removeTypingIndicator = () => {
    setIsTyping(false);
  };

  // Add a new message from the bot with typing effect
  const addBotMessage = useCallback((content: string, isConfirmation = false, amount?: string) => {
    removeTypingIndicator();
    
    const newMessage: Message = {
      id: Date.now(),
      sender: 'Finny',
      isBot: true,
      content,
      isConfirmation,
      amount,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    onNewMessage?.(newMessage);
  }, [onNewMessage]);

  // Add a user message
  const addUserMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: Date.now(),
      sender: 'You',
      isBot: false,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Load initial transactions and show welcome message
  useEffect(() => {
    const loadTransactions = async () => {
      if (!selectedAccount) return;
      
      try {
        const res = await api.get(`/transactions?account_id=${selectedAccount.id}&limit=10`);
        const transactions = res.data;
        
        // Create welcome message
        const welcomeMsg: Message = {
          id: 0,
          sender: 'Finny',
          isBot: true,
          content: `👋 Hey! I'm viewing your **${selectedAccount.name}** wallet. Your current balance is **RM${selectedAccount.balance.toFixed(2)}**.\n\nHere's your recent activity:`,
          timestamp: 'Today'
        };
        
        const msgs: Message[] = [welcomeMsg];
        
        // Add recent transactions as messages
        transactions.slice(0, 5).reverse().forEach((tx: any) => {
          const isIncome = tx.type === 'income';
          msgs.push({
            id: msgs.length,
            sender: 'Finny',
            isBot: true,
            content: `${isIncome ? '💵' : '💸'} ${tx.note || tx.category || 'Transaction'} - ${isIncome ? '+' : '-'}RM${tx.amount.toFixed(2)}`,
            isConfirmation: true,
            amount: `${isIncome ? '+' : '-'}$${tx.amount.toFixed(2)}`
          });
        });
        
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading transactions:', err);
        // Show error-friendly message
        setMessages([{
          id: 0,
          sender: 'Finny',
          isBot: true,
          content: `👋 Hey! I'm ready to help you track your finances. Just type what you spent or earned, like "lunch rm15" or "salary 3000"!`,
          timestamp: 'Today'
        }]);
      }
    };
    
    loadTransactions();
  }, [selectedAccount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle sending a message via the chat API
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addUserMessage(text);
    
    // Show typing indicator
    addTypingIndicator();

    try {
      // Call the backend chat API
      const res = await api.post('/chat', {
        message: text,
        account_id: selectedAccount?.id
      });

      const chatResponse = res.data;
      
      // Small delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      // Add bot response
      if (chatResponse.action === 'transaction_created') {
        addBotMessage(
          chatResponse.response,
          true,
          `${chatResponse.parsed_transaction?.type === 'income' ? '+' : '-'}$${chatResponse.parsed_transaction?.amount.toFixed(2)}`
        );
        
        // Update balance if provided
        if (chatResponse.data?.new_balance !== undefined) {
          onBalanceUpdate(chatResponse.data.new_balance);
        }
      } else {
        addBotMessage(chatResponse.response);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      removeTypingIndicator();
      
      // Try fallback to local processing
      addBotMessage(
        "Hmm, I couldn't process that right now. Try using the + button below to add a transaction manually! 💡"
      );
    }
  };

  // Expose sendMessage to parent
  useEffect(() => {
    // Store sendMessage function for BottomBar to use
    (window as any).__finnyChat = {
      sendMessage,
      addUserMessage,
      addBotMessage,
      addTypingIndicator,
      removeTypingIndicator
    };
  }, [sendMessage, addUserMessage, addBotMessage]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Date header */}
      <div className="flex items-center justify-center gap-2 py-3 mb-2">
        <div className="h-px bg-white/10 flex-1"></div>
        <span className="text-xs text-slate-500 px-3 py-1 bg-white/5 rounded-full">Today</span>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>
      
      {/* Quick Stats */}
      {selectedAccount && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <div className="flex-shrink-0 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Balance: RM{selectedAccount.balance?.toFixed(2) || '0.00'}</span>
          </div>
          {selectedAccount.monthly_allowance > 0 && (
            <div className="flex-shrink-0 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400" />
              <span className="text-xs text-violet-400 font-medium">Allowance: RM{selectedAccount.monthly_allowance?.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Messages */}
      <div className="space-y-3">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} compact />
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2 py-1">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-white text-sm">Finny</span>
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 p-2 rounded-xl bg-[#1a1d24]/80">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div ref={endRef} className="h-4" />
    </div>
  )
}

export default ChatArea
