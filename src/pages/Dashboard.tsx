import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChatArea from '../components/ChatArea';
import BottomBar from '../components/BottomBar';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/axios';

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const navigate = useNavigate();
  const { theme } = useTheme();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        const [userRes, accountsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/accounts')
        ]);

        const userData = userRes.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        setAccounts(accountsRes.data);
        
        if (accountsRes.data.length > 0) {
          // Check if there's a saved account preference
          const savedAccountId = localStorage.getItem('selectedAccountId');
          const savedAccount = savedAccountId 
            ? accountsRes.data.find((a: any) => a.id === parseInt(savedAccountId))
            : null;
          
          const accountToSelect = savedAccount || accountsRes.data[0];
          setSelectedAccount(accountToSelect);
          setCurrentBalance(accountToSelect.balance);
        }
      } catch (err) {
        console.error(err);
        if ((err as any).response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
    };
    fetchData();
  }, [navigate]);

  const handleAccountChange = (accountId: string) => {
    const account = accounts.find(a => a.id === parseInt(accountId));
    if (account) {
      setSelectedAccount(account);
      setCurrentBalance(account.balance);
      // Save preference to localStorage
      localStorage.setItem('selectedAccountId', accountId);
    }
  };

  const reloadAccounts = async () => {
    const res = await api.get('/accounts');
    setAccounts(res.data);
    if (selectedAccount) {
      const updated = res.data.find((a: any) => a.id === selectedAccount.id);
      if (updated) {
        setSelectedAccount(updated);
        setCurrentBalance(updated.balance);
      }
    }
  };

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-[#0f1115] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Sidebar user={user} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          accounts={accounts} 
          currentBalance={currentBalance} 
          selectedAccount={selectedAccount}
          onAccountChange={handleAccountChange}
        />
        <ChatArea accounts={accounts} selectedAccount={selectedAccount} onBalanceUpdate={setCurrentBalance} />
        <BottomBar 
          accounts={accounts} 
          selectedAccount={selectedAccount}
          onTransactionCreated={reloadAccounts}
        />
      </div>
    </div>
  );
};

export default Dashboard;
