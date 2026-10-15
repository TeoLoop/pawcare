import { describe, it, expect } from 'vitest';
import {
  toUtcFromMontevideo,
  formatInMontevideo,
  generateScheduleDoses,
  deduplicateDoses,
  computeDoseStatus,
} from './date-utils';

describe('date-utils (America/Montevideo)', () => {
  it('converts Montevideo date and time to UTC and formats back correctly', () => {
    const dateStr = '2026-10-15';
    const timeStr = '08:00';
    const utcIso = toUtcFromMontevideo(dateStr, timeStr);
    
    // Montevideo is typically UTC-3
    const formattedLocal = formatInMontevideo(utcIso, 'yyyy-MM-dd HH:mm');
    expect(formattedLocal).toBe('2026-10-15 08:00');
  });

  it('generates correct daily doses for 3 days', () => {
    const definition = {
      frequency_type: 'daily' as const,
      times_of_day: ['09:00', '21:00'],
      start_date: '2026-10-15',
    };

    const doses = generateScheduleDoses(definition, { previewDays: 3 });
    // 3 days * 2 doses/day = 6 doses
    expect(doses.length).toBe(6);
    expect(doses[0].scheduled_date).toBe('2026-10-15');
    expect(doses[0].scheduled_time).toBe('09:00');
    expect(doses[1].scheduled_date).toBe('2026-10-15');
    expect(doses[1].scheduled_time).toBe('21:00');
    expect(doses[2].scheduled_date).toBe('2026-10-16');
  });

  it('generates specific days doses only on configured weekdays', () => {
    const definition = {
      frequency_type: 'specific_days' as const,
      times_of_day: ['10:00'],
      days_of_week: [1, 3, 5], // Mon, Wed, Fri
      start_date: '2026-10-19', // Monday
    };

    const doses = generateScheduleDoses(definition, { previewDays: 7 });
    // In 7 days starting Monday: Mon (19), Wed (21), Fri (23) -> 3 doses
    expect(doses.length).toBe(3);
    expect(doses[0].day_name).toBe('Lunes');
    expect(doses[1].day_name).toBe('Miércoles');
    expect(doses[2].day_name).toBe('Viernes');
  });

  it('respects end_date boundary', () => {
    const definition = {
      frequency_type: 'daily' as const,
      times_of_day: ['08:00'],
      start_date: '2026-10-15',
      end_date: '2026-10-17',
    };

    const doses = generateScheduleDoses(definition, { previewDays: 10 });
    // Should stop at 2026-10-17: 15, 16, 17 -> 3 doses
    expect(doses.length).toBe(3);
    expect(doses[doses.length - 1].scheduled_date).toBe('2026-10-17');
  });

  it('deduplicates new doses against existing database doses', () => {
    const definition = {
      frequency_type: 'daily' as const,
      times_of_day: ['08:00'],
      start_date: '2026-10-15',
    };

    const generated = generateScheduleDoses(definition, { previewDays: 3 });
    const existing = [{ scheduled_for: generated[0].scheduled_for }];

    const filtered = deduplicateDoses(generated, existing);
    expect(filtered.length).toBe(2);
    expect(filtered[0].scheduled_date).toBe('2026-10-16');
  });

  it('computes dose status as delayed when overdue by more than tolerance', () => {
    // 2 hours ago
    const pastTwoHours = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const status = computeDoseStatus('scheduled', pastTwoHours, 45);
    expect(status).toBe('delayed');
  });

  it('preserves administered or skipped status without altering retroactively', () => {
    const pastTwoHours = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(computeDoseStatus('administered', pastTwoHours)).toBe('administered');
    expect(computeDoseStatus('skipped', pastTwoHours)).toBe('skipped');
  });
});
