import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ChevronLeft, ChevronRight, LayoutDashboard, PieChart, Wallet, Calendar, FileText, Settings, Sparkles, Repeat } from 'lucide-react'

interface SidebarProps {
  user: any;
  collapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar = ({ user, collapsed = false, onToggle }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: PieChart, label: 'Analytics', path: '/stats' },
    { icon: Wallet, label: 'Accounts', path: '/accounts' },
    { icon: Calendar, label: 'Transactions', path: '/transactions' },
    { icon: Repeat, label: 'Recurring', path: '/recurring' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <div className={`${collapsed ? 'w-20' : 'w-[287px]'} bg-[#0a0a0c] border-r border-white/10 flex flex-col justify-between transition-all duration-300 relative flex-shrink-0`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50 border border-purple-500/50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Top Section */}
      <div className="flex flex-col gap-6 p-6 relative z-10">
        {/* Logo & Brand */}
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full"
          >
            <div className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.01] flex items-center justify-center shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)] flex-shrink-0 backdrop-blur-sm">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col items-start">
                <span className="font-bold text-base text-white">Finny</span>
                <span className="text-xs text-purple-500">COSMI AI</span>
              </div>
            )}
          </button>
        </div>

        {/* Home AI Button */}
        <button 
          onClick={() => navigate('/home')}
          className={`${
            location.pathname === '/home'
              ? 'bg-gradient-to-r from-purple-500/15 to-purple-500/0 border-purple-500/20'
              : 'bg-transparent border-transparent hover:bg-white/5'
          } flex items-center gap-3 px-4 py-3 rounded-xl transition-all border relative overflow-hidden group`}
        >
          {location.pathname === '/home' && (
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-purple-700/5 to-transparent"></div>
          )}
          <Sparkles className={`${
            location.pathname === '/home' ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-400'
          } w-5 h-5 transition-colors relative z-10`} />
          {!collapsed && (
            <span className={`${
              location.pathname === '/home' ? 'text-white' : 'text-gray-400 group-hover:text-white'
            } text-sm font-medium transition-colors relative z-10`}>Home AI</span>
          )}
        </button>

        {/* Menu Items */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/15 to-purple-500/0 border-purple-500/20'
                    : 'bg-transparent border-transparent hover:bg-white/5'
                } flex items-center gap-3 px-4 py-3 rounded-xl transition-all border relative overflow-hidden group`}
                title={collapsed ? item.label : ''}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-purple-700/5 to-transparent"></div>
                )}
                <Icon className={`${
                  isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-purple-400'
                } w-5 h-5 transition-colors relative z-10`} />
                {!collapsed && (
                  <span className={`${
                    isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  } text-sm font-medium transition-colors relative z-10`}>{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - User Profile */}
      <div className="p-6 border-t border-white/5 relative z-10">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} bg-white/5 p-3 rounded-xl border border-white/10`}>
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-purple-500/20 border border-purple-500/30">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-400">Free Plan</div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          title="Logout"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
