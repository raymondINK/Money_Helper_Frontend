import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../shared/components';

export const HomePage: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
    // Navigate or trigger AI action
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log('Processing:', inputValue);
      // Send to AI/backend for processing
      setInputValue('');
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex-1 relative h-full flex flex-col items-center justify-center p-6">
      {/* Gradient Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-teal-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-10 animate-float">
        {/* Greeting */}
        <div className="text-center space-y-3">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-xl">
            Good evening, Alex.
          </h2>
          <h3 className="text-2xl md:text-3xl font-light text-gray-300">
            What did you{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-400 font-semibold">
              spend on
            </span>{' '}
            today?
          </h3>
        </div>

        {/* Input Box */}
        <div className="w-full relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
          <div className="relative chat-input-glow glass-panel rounded-2xl flex items-center p-2 transition-all duration-300 border border-white/10">
            <button className="p-4 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <span className="material-symbols-outlined text-[28px]">mic</span>
            </button>
            <input
              className="w-full bg-transparent border-none text-xl text-white placeholder-gray-500 focus:ring-0 px-4 py-4 outline-none"
              placeholder="Type a transaction or ask anything..."
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              className="p-3 mr-1 rounded-xl bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300 hover:shadow-[0_0_15px_rgba(45,212,191,0.3)] transition-all border border-teal-500/20"
            >
              <span className="material-symbols-outlined text-[28px]">arrow_upward</span>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          <button
            onClick={() => handleQuickAction('lunch')}
            className="quick-prompt-btn group flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border border-white/5 h-32 backdrop-blur-sm"
          >
            <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-[24px]">lunch_dining</span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Logged Lunch</span>
          </button>

          <button
            onClick={() => handleQuickAction('coffee')}
            className="quick-prompt-btn group flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border border-white/5 h-32 backdrop-blur-sm animate-float-delayed"
            style={{ animationDelay: '0.5s' }}
          >
            <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-[24px]">coffee</span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Morning Coffee</span>
          </button>

          <button
            onClick={() => handleQuickAction('monthly')}
            className="quick-prompt-btn group flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border border-white/5 h-32 backdrop-blur-sm animate-float-delayed"
            style={{ animationDelay: '1s' }}
          >
            <div className="p-3 rounded-full bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 group-hover:text-teal-300 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Monthly Check</span>
          </button>

          <button
            onClick={() => handleQuickAction('scan')}
            className="quick-prompt-btn group flex flex-col items-center justify-center gap-3 rounded-2xl p-6 border border-white/5 h-32 backdrop-blur-sm animate-float-delayed"
            style={{ animationDelay: '1.5s' }}
          >
            <div className="p-3 rounded-full bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 group-hover:text-orange-300 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Scan Receipt</span>
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
