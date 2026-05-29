/**
 * Salary-cycle date helpers.
 *
 * A salary cycle runs from `salaryDay` of one month up to (but not including)
 * `salaryDay` of the next month. For example, with salaryDay=25:
 *   - If today is 27 Apr 2026 → current period: 25 Apr – 24 May 2026
 *   - If today is 10 Apr 2026 → current period: 25 Mar – 24 Apr 2026
 *
 * IMPORTANT: All Date objects are constructed using Date.UTC() so period
 * boundaries are midnight UTC, matching the UTC timestamps stored in the
 * database. Without this, browsers in UTC+8 (Malaysia) would shift every
 * boundary 8 hours into the wrong calendar day.
 */

export interface CycleRange {
  start: Date;
  end: Date;
}

/**
 * Clamp a day to the actual last day of the given month (UTC).
 * Prevents "Feb 30" wrapping into March.
 */
function clampDay(year: number, month: number, day: number): number {
  // Day 0 of next month = last day of this month
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

/**
 * Returns the start and end dates of the salary cycle that contains `today`.
 * Both dates are at midnight UTC (start = 00:00:00 UTC, end = 23:59:59 UTC).
 */
export function getSalaryCycleRange(today: Date, salaryDay: number): CycleRange {
  const d = today.getUTCDate();
  const month = today.getUTCMonth();
  const year = today.getUTCFullYear();

  let start: Date;
  let end: Date;

  if (d >= salaryDay) {
    // Cycle started this month
    const clampedDay = clampDay(year, month, salaryDay);
    start = new Date(Date.UTC(year, month, clampedDay, 0, 0, 0));

    // End = 23:59:59 UTC on the day before salaryDay next month
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextClampedDay = clampDay(nextYear, nextMonth, salaryDay);
    // One day before next salary day
    const beforeNext = new Date(Date.UTC(nextYear, nextMonth, nextClampedDay, 0, 0, 0));
    beforeNext.setUTCDate(beforeNext.getUTCDate() - 1);
    end = new Date(Date.UTC(beforeNext.getUTCFullYear(), beforeNext.getUTCMonth(), beforeNext.getUTCDate(), 23, 59, 59));
  } else {
    // We are before this month's salary day — cycle started last month
    const lastMonthYear = month === 0 ? year - 1 : year;
    const lastMonth = month === 0 ? 11 : month - 1;
    const clampedDay = clampDay(lastMonthYear, lastMonth, salaryDay);
    start = new Date(Date.UTC(lastMonthYear, lastMonth, clampedDay, 0, 0, 0));

    // End = 23:59:59 UTC on the day before salaryDay this month
    const thisClampedDay = clampDay(year, month, salaryDay);
    const beforeThis = new Date(Date.UTC(year, month, thisClampedDay, 0, 0, 0));
    beforeThis.setUTCDate(beforeThis.getUTCDate() - 1);
    end = new Date(Date.UTC(beforeThis.getUTCFullYear(), beforeThis.getUTCMonth(), beforeThis.getUTCDate(), 23, 59, 59));
  }

  return { start, end };
}

/**
 * Returns the salary cycle immediately *before* the one containing `today`.
 */
export function getPreviousCycleRange(today: Date, salaryDay: number): CycleRange {
  const current = getSalaryCycleRange(today, salaryDay);
  // Previous cycle ends 23:59:59 UTC on the day before current start
  const prevEndDay = new Date(current.start.getTime() - 1000); // 1 second before = 23:59:59 prev day
  const prevEnd = new Date(Date.UTC(prevEndDay.getUTCFullYear(), prevEndDay.getUTCMonth(), prevEndDay.getUTCDate(), 23, 59, 59));

  // Previous cycle start is salaryDay one month earlier than current start
  const csYear = current.start.getUTCFullYear();
  const csMonth = current.start.getUTCMonth();
  const prevYear = csMonth === 0 ? csYear - 1 : csYear;
  const prevMonth = csMonth === 0 ? 11 : csMonth - 1;
  const prevClampedDay = clampDay(prevYear, prevMonth, salaryDay);
  const prevStart = new Date(Date.UTC(prevYear, prevMonth, prevClampedDay, 0, 0, 0));

  return { start: prevStart, end: prevEnd };
}

/** Format a Date as YYYY-MM-DD for API query params */
export function formatDateForApi(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the ISO datetime strings used for /summary/period queries.
 * Start gets 00:00:00Z, end gets 23:59:59Z.
 */
export function toApiDateRange(range: CycleRange): { start_date: string; end_date: string } {
  return {
    start_date: range.start.toISOString(),
    end_date: range.end.toISOString(),
  };
}
