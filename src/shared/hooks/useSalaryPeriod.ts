// Re-export SalaryPeriod from the central context so callers don't need to change imports.
export type { SalaryPeriod } from '../context/AppDataContext';

import { useAppData } from '../context/AppDataContext';

/**
 * Returns the user's salary period from the shared AppDataContext.
 * The context fetches /settings/check-monthly-reset once on app load;
 * this hook simply reads from it so there are no duplicate API calls.
 */
export function useSalaryPeriod() {
  return useAppData().salaryPeriod;
}
