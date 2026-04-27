/**
 * Salary-cycle date helpers.
 *
 * A salary cycle runs from `salaryDay` of one month up to (but not including)
 * `salaryDay` of the next month. For example, with salaryDay=25:
 *   - If today is 27 Apr 2026 → current period: 25 Apr – 24 May 2026
 *   - If today is 10 Apr 2026 → current period: 25 Mar – 24 Apr 2026
 */

export interface CycleRange {
  start: Date;
  end: Date;
}

/**
 * Returns the start and end dates of the salary cycle that contains `today`.
 * `end` is the day before the *next* salary day (i.e. 24th when salaryDay=25).
 */
export function getSalaryCycleRange(today: Date, salaryDay: number): CycleRange {
  const d = today.getDate();

  let start: Date;
  let end: Date;

  if (d >= salaryDay) {
    // We are in the cycle that started this month
    start = new Date(today.getFullYear(), today.getMonth(), salaryDay);
    // End = one day before salaryDay next month
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, salaryDay);
    end = new Date(nextMonthStart.getTime() - 86400000); // -1 day
  } else {
    // We are before this month's salary day — cycle started last month
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    start = new Date(lastMonthYear, lastMonth, salaryDay);
    // End = one day before salaryDay this month
    const thisMonthSalary = new Date(today.getFullYear(), today.getMonth(), salaryDay);
    end = new Date(thisMonthSalary.getTime() - 86400000);
  }

  return { start, end };
}

/**
 * Returns the salary cycle immediately *before* the one containing `today`.
 */
export function getPreviousCycleRange(today: Date, salaryDay: number): CycleRange {
  const current = getSalaryCycleRange(today, salaryDay);
  // Previous cycle ends the day before current cycle start
  const prevEnd = new Date(current.start.getTime() - 86400000);
  // Previous cycle start is salaryDay one month earlier than current start
  const prevStart = new Date(current.start.getFullYear(), current.start.getMonth() - 1, salaryDay);
  return { start: prevStart, end: prevEnd };
}

/** Format a Date as YYYY-MM-DD for API query params */
export function formatDateForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the ISO datetime string used for /summary/period queries.
 * Start gets 00:00:00, end gets 23:59:59.
 */
export function toApiDateRange(range: CycleRange): { start_date: string; end_date: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date, time: string) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time}`;
  return {
    start_date: fmt(range.start, '00:00:00'),
    end_date: fmt(range.end, '23:59:59'),
  };
}
