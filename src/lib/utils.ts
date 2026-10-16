import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a dose amount into human-friendly fractions for display (e.g. 0.5 -> "1/2", 0.25 -> "1/4", 1.5 -> "1 1/2").
 */
export function formatDoseAmount(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
  if (isNaN(num)) return String(amount);

  const integer = Math.floor(num);
  const remainder = Number((num - integer).toFixed(3));

  let fraction = '';
  if (Math.abs(remainder - 0.5) < 0.01) {
    fraction = '1/2';
  } else if (Math.abs(remainder - 0.25) < 0.01) {
    fraction = '1/4';
  } else if (Math.abs(remainder - 0.75) < 0.01) {
    fraction = '3/4';
  } else if (Math.abs(remainder - 0.333) < 0.02 || Math.abs(remainder - 0.33) < 0.01) {
    fraction = '1/3';
  } else if (Math.abs(remainder - 0.667) < 0.02 || Math.abs(remainder - 0.66) < 0.01) {
    fraction = '2/3';
  } else if (Math.abs(remainder - 0.125) < 0.01) {
    fraction = '1/8';
  }

  if (fraction) {
    return integer > 0 ? `${integer} ${fraction}` : fraction;
  }

  if (remainder === 0) {
    return String(integer);
  }

  return String(Number(num.toFixed(2)));
}

/**
 * Parses user input which can be a fraction ("1/2", "1/4", "1 1/2") or a decimal ("0.5", "0,25")
 * into a standard numeric float for database and inventory calculations.
 */
export function parseDoseAmount(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || typeof val !== 'string') return 0;

  const trimmed = val.trim().replace(',', '.');

  // Mixed fraction like "1 1/2" or "2 1/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den !== 0) return Number((whole + num / den).toFixed(4));
  }

  // Simple fraction like "1/2" or "1/4"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den !== 0) return Number((num / den).toFixed(4));
  }

  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(4));
}
