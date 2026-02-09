/**
 * Theme utility functions for consistent styling across the app
 */

export type Theme = 'light' | 'dark';

export const getThemeClasses = (theme: Theme) => ({
  // Background colors
  bg: theme === 'dark' ? 'bg-[#0f1115]' : 'bg-gray-50',
  bgCard: theme === 'dark' ? 'bg-[#1a1d24]' : 'bg-white',
  bgHover: theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100',
  bgInput: theme === 'dark' ? 'bg-[#0f1115]' : 'bg-gray-50',
  
  // Text colors
  text: theme === 'dark' ? 'text-white' : 'text-gray-900',
  textSecondary: theme === 'dark' ? 'text-slate-400' : 'text-gray-500',
  textMuted: theme === 'dark' ? 'text-slate-500' : 'text-gray-400',
  
  // Border colors
  border: theme === 'dark' ? 'border-white/10' : 'border-gray-200',
  borderHover: theme === 'dark' ? 'hover:border-white/20' : 'hover:border-gray-300',
  
  // Component-specific
  cardBg: theme === 'dark' ? 'bg-[#1a1d24]/80 border-white/10' : 'bg-white border-gray-200',
  inputBg: theme === 'dark' ? 'bg-[#0f1115] border-white/10 text-white' : 'bg-gray-50 border-gray-300 text-gray-900',
  divider: theme === 'dark' ? 'border-white/5' : 'border-gray-100',
});

export const applyTheme = (theme: Theme) => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  localStorage.setItem('theme', theme);
};

export const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark';
};
