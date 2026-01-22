import React from 'react'
import { Wallet, ChevronDown, Search, Bookmark } from 'lucide-react'

interface HeaderProps {
  accounts: any[];
  currentBalance: number;
  selectedAccount?: any;
  onAccountChange?: (accountId: string) => void;
}

const Header = ({ accounts, currentBalance, selectedAccount, onAccountChange }: HeaderProps) => {
  const currentAccount = selectedAccount || (accounts.length > 0 ? accounts[0] : null);

  return (
    <header className="bg-gradient-to-r from-[#0f1115] to-[#1a1d24] border-b border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search transactions or ask for help..."
              className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 placeholder:text-slate-500 transition-all"
            />
          </div>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Wallet Selector */}
          {onAccountChange ? (
            <div className="relative">
              <select
                value={currentAccount?.id || ''}
                onChange={(e) => onAccountChange(e.target.value)}
                className="appearance-none flex items-center bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 px-4 py-2.5 pr-10 rounded-xl hover:border-violet-500/40 transition-all cursor-pointer text-slate-200 focus:outline-none focus:border-violet-500/50"
                style={{ colorScheme: 'dark' }}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-[#1a1d24] text-slate-200">{acc.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" size={16} />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 px-4 py-2.5 rounded-xl">
              <div className="p-1 bg-violet-500/20 rounded-lg">
                <Wallet size={16} className="text-violet-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">{currentAccount?.name || 'No Account'}</span>
            </div>
          )}
          
          {/* Balance Display */}
          <div className="text-right px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Current Balance</div>
            <div className="text-lg font-bold text-emerald-400">${currentBalance.toFixed(2)}</div>
          </div>
          
          {/* Bookmark Button */}
          <button className="p-2.5 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Bookmark size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
