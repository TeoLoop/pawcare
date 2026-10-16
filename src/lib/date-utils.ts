// src/lib/date-utils.ts
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime, fromZonedTime, format as formatZoned } from 'date-fns-tz';
import { FrequencyType, ScheduledDose, DoseStatus } from '@/types/medication';

export const MONTEVIDEO_TZ = 'America/Montevideo';

/**
 * Gets the current date/time in America/Montevideo timezone.
 */
export function getNowInMontevideo(): Date {
  return toZonedTime(new Date(), MONTEVIDEO_TZ);
}

/**
 * Formats a Date or ISO string into America/Montevideo representation.
 */
export function formatInMontevideo(
  date: Date | string,
  formatPattern: string = 'dd/MM/yyyy HH:mm',
  options?: { locale?: any }
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatZoned(d, formatPattern, {
    timeZone: MONTEVIDEO_TZ,
    locale: options?.locale || es,
  });
}

/**
 * Formats date part YYYY-MM-DD for Montevideo.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const zoned = toZonedTime(date, MONTEVIDEO_TZ);
  return format(zoned, 'yyyy-MM-dd');
}

/**
 * Formats time part HH:mm for Montevideo.
 */
export function getLocalTimeString(date: Date = new Date()): string {
  const zoned = toZonedTime(date, MONTEVIDEO_TZ);
  return format(zoned, 'HH:mm');
}

/**
 * Converts a Montevideo date string (YYYY-MM-DD) and time string (HH:MM)
 * to a standardized UTC ISO string.
 */
export function toUtcFromMontevideo(dateStr: string, timeStr: string): string {
  // Combine date and time, e.g. "2026-10-15T08:00:00"
  const localDateTimeStr = `${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`;
  // Parse as naive date, then interpret in Montevideo time zone, converted to UTC Date
  const naiveDate = parseISO(localDateTimeStr);
  const utcDate = fromZonedTime(naiveDate, MONTEVIDEO_TZ);
  return utcDate.toISOString();
}

/**
 * Calculates current computed status of a scheduled dose.
 * If scheduled time was > 45 minutes ago and dose is still 'scheduled' or 'pending',
 * it is computed as 'delayed' (retrasada).
 */
export function computeDoseStatus(
  status: DoseStatus,
  scheduledForUtc: string,
  toleranceMinutes: number = 45
): DoseStatus {
  if (status === 'administered' || status === 'skipped' || status === 'cancelled') {
    return status;
  }

  const now = new Date();
  const scheduledTime = parseISO(scheduledForUtc);
  const diffMs = now.getTime() - scheduledTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes > toleranceMinutes) {
    return 'delayed';
  }

  if (diffMinutes >= -15 && diffMinutes <= toleranceMinutes) {
    return 'pending';
  }

  return 'scheduled';
}

export interface ScheduleDefinition {
  frequency_type: FrequencyType;
  times_of_day: string[]; // ['08:00', '20:00']
  days_of_week?: number[]; // [0, 1, 2, 3, 4, 5, 6]
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

export interface GeneratedDosePreview {
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  scheduled_for: string; // ISO UTC
  day_name: string; // "Lunes", etc.
}

const SPANISH_DAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/**
 * Generates dose occurrences for a schedule definition over a range of days (default 14 days preview).
 * Guaranteed to be idempotent and ordered.
 */
export function generateScheduleDoses(
  definition: ScheduleDefinition,
  options: {
    previewDays?: number;
    fromDate?: string; // YYYY-MM-DD
  } = {}
): GeneratedDosePreview[] {
  const { previewDays = 14, fromDate } = options;
  const startDayStr = fromDate && fromDate > definition.start_date ? fromDate : definition.start_date;
  
  const [startYear, startMonth, startDay] = startDayStr.split('-').map(Number);
  const startDate = new Date(startYear, startMonth - 1, startDay, 12, 0, 0);

  const results: GeneratedDosePreview[] = [];
  const times = [...definition.times_of_day].sort();

  for (let i = 0; i < previewDays; i++) {
    const currentDay = addDays(startDate, i);
    const dateStr = format(currentDay, 'yyyy-MM-dd');

    // Check end_date boundary if defined
    if (definition.end_date && dateStr > definition.end_date) {
      break;
    }

    const dayOfWeek = currentDay.getDay(); // 0 = Sunday

    // Check days_of_week filter if specific_days
    if (
      definition.frequency_type === 'specific_days' &&
      definition.days_of_week &&
      definition.days_of_week.length > 0
    ) {
      if (!definition.days_of_week.includes(dayOfWeek)) {
        continue;
      }
    }

    for (const time of times) {
      const utcIso = toUtcFromMontevideo(dateStr, time);
      results.push({
        scheduled_date: dateStr,
        scheduled_time: time,
        scheduled_for: utcIso,
        day_name: SPANISH_DAYS[dayOfWeek],
      });
    }
  }

  // Sort chronologically
  return results.sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
}

/**
 * Filters out duplicate doses against existing scheduled doses using the unique (medication_id, scheduled_for) key.
 */
export function deduplicateDoses(
  newDoses: GeneratedDosePreview[],
  existingDoses: Pick<ScheduledDose, 'scheduled_for'>[]
): GeneratedDosePreview[] {
  const existingSet = new Set(existingDoses.map((d) => d.scheduled_for));
  return newDoses.filter((dose) => !existingSet.has(dose.scheduled_for));
}
