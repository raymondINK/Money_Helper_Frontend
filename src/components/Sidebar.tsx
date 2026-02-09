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
    { icon: PieChart, label: 'Stats & Budget', path: '/stats' },
    { icon: Wallet, label: 'Accounts', path: '/accounts' },
    { icon: Calendar, label: 'Transactions', path: '/transactions' },
    { icon: Repeat, label: 'Recurring', path: '/recurring' },
    // { icon: FileText, label: 'Reports', path: '/reports' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <div className={`${collapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-[#0f1115] to-[#1a1d24] border-r border-white/10 flex flex-col transition-all duration-300 relative flex-shrink-0`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform z-50"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo & Brand */}
      <div className="p-4 border-b border-white/10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity w-full"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col items-start">
              <span className="font-bold text-lg bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Finny</span>
              <span className="text-[10px] text-slate-500">Smart Money Assistant</span>
            </div>
          )}
        </button>
      </div>
      
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={index}>
                <button 
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-violet-500/30' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={collapsed ? item.label : ''}
                >
                  <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-violet-400' : 'group-hover:text-violet-400'}`} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-violet-500/20">
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.username || 'User'}</div>
              <div className="text-xs text-slate-500">Free Plan</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className={`p-3 flex ${collapsed ? 'justify-center' : 'gap-2'} border-t border-white/10`}>
        <button 
          onClick={handleLogout} 
          className={`${collapsed ? '' : 'flex-1'} flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all`}
          title="Logout"
        >
          <LogOut size={18} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
