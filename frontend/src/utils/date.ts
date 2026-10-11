/**
 * Date utilities for consistent local and UTC date handling across the app.
 * Avoids timezone shifts (e.g. UTC midnight 00:00:00Z converting to 21:00:00 the day before in UTC-3 Argentina).
 */

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export interface ParsedDate {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
}

/**
 * Extracts year, month (1-12) and day safely from an ISO date string or Date object
 * without local timezone midnight shift bugs.
 */
export function parseTransactionDate(input: string | Date | null | undefined): ParsedDate | null {
  if (!input) return null;

  if (typeof input === 'string') {
    // Check if format is or begins with YYYY-MM-DD
    const datePart = input.slice(0, 10);
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day };
      }
    }

    // Fallback: try parsing Date
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      };
    }
    return null;
  }

  if (input instanceof Date && !isNaN(input.getTime())) {
    return {
      year: input.getFullYear(),
      month: input.getMonth() + 1,
      day: input.getDate(),
    };
  }

  return null;
}

/**
 * Checks if a date falls strictly within the specified month (1-12) and year.
 */
export function isSameMonthAndYear(
  input: string | Date | null | undefined,
  targetMonth: number,
  targetYear: number
): boolean {
  const parsed = parseTransactionDate(input);
  if (!parsed) return false;
  return parsed.month === targetMonth && parsed.year === targetYear;
}

/**
 * Formats date as DD/MM/YYYY for UI tables and cards.
 */
export function formatTransactionDate(input: string | Date | null | undefined): string {
  const parsed = parseTransactionDate(input);
  if (!parsed) return 'Sin fecha';
  const dayStr = parsed.day.toString().padStart(2, '0');
  const monthStr = parsed.month.toString().padStart(2, '0');
  return `${dayStr}/${monthStr}/${parsed.year}`;
}

/**
 * Returns current date in local YYYY-MM-DD format for HTML date inputs.
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string to an ISO string safely pinned at 12:00:00 UTC.
 * This guarantees that in any timezone (UTC-11 to UTC+12), the date never shifts to previous or next day.
 */
export function toSafeISODate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.length === 10 && dateStr.includes('-')) {
    return `${dateStr}T12:00:00.000Z`;
  }
  // If already full ISO or timestamp, check if it ends with T00:00:00
  if (dateStr.includes('T00:00:00')) {
    return dateStr.replace('T00:00:00', 'T12:00:00');
  }
  return new Date(dateStr).toISOString();
}

/**
 * Returns formatted month and year label, e.g. "Octubre 2026"
 */
export function formatMonthYear(month: number, year: number): string {
  const name = MONTH_NAMES[month - 1] || '';
  return `${name} ${year}`;
}
