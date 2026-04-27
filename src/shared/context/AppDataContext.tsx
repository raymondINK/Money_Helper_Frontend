import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { getSalaryCycleRange } from '../utils/salaryCycle';

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  monthly_allowance?: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  type: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  account_id: number;
}

export interface SalaryPeriod {
  resetDay: number;
  periodStart: Date;
  periodEnd: Date;
  /** Days already elapsed since period start (including today) */
  daysElapsed: number;
  /** Days remaining in the period (including today) */
  daysLeft: number;
  /** Total days in the period */
  totalDays: number;
  /** 0-100 progress through the period */
  periodProgress: number;
  loading: boolean;
}

const DEFAULT_PERIOD: SalaryPeriod = {
  resetDay: 1,
  periodStart: new Date(),
  periodEnd: new Date(),
  daysElapsed: 0,
  daysLeft: 0,
  totalDays: 1,
  periodProgress: 0,
  loading: true,
};

interface AppData {
  user: any | null;
  accounts: Account[];
  transactions: Transaction[];
  salaryPeriod: SalaryPeriod;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>(DEFAULT_PERIOD);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchAll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    // Guard browser-only APIs in case this ever runs in a non-browser runtime.
    if (typeof window === 'undefined') {
      setLoading(false);
      fetchingRef.current = false;
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      fetchingRef.current = false;
      return;
    }
    try {
      setLoading(true);
      const [userRes, accountsRes, txRes, periodRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/accounts'),
        api.get('/transactions'),
        api.get('/settings/check-monthly-reset'),
      ]);

      setUser(userRes.data);
      setAccounts(accountsRes.data);
      setTransactions(txRes.data);

      const resetDay: number = periodRes.data.reset_day ?? 1;
      const today = new Date();
      const range = getSalaryCycleRange(today, resetDay);
      const msPerDay = 86400000;
      const daysElapsed = Math.floor((today.getTime() - range.start.getTime()) / msPerDay) + 1;
      const totalDays = Math.round((range.end.getTime() - range.start.getTime()) / msPerDay) + 1;
      const daysLeft = Math.max(totalDays - daysElapsed, 0);
      const periodProgress = Math.min(Math.round((daysElapsed / totalDays) * 100), 100);

      setSalaryPeriod({
        resetDay,
        periodStart: range.start,
        periodEnd: range.end,
        daysElapsed,
        daysLeft,
        totalDays,
        periodProgress,
        loading: false,
      });
    } catch {
      // Fallback: calendar month
      const today = new Date();
      const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const msPerDay = 86400000;
      const daysElapsed = Math.floor((today.getTime() - periodStart.getTime()) / msPerDay) + 1;
      const totalDays = periodEnd.getDate();
      const daysLeft = Math.max(totalDays - daysElapsed, 0);
      setSalaryPeriod({
        resetDay: 1,
        periodStart,
        periodEnd,
        daysElapsed,
        daysLeft,
        totalDays,
        periodProgress: Math.min(Math.round((daysElapsed / totalDays) * 100), 100),
        loading: false,
      });
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    fetchingRef.current = false;
    await fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <AppDataContext.Provider value={{ user, accounts, transactions, salaryPeriod, loading, refresh }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
