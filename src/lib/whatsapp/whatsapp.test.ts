import { describe, it, expect, beforeEach } from 'vitest';
import { KiraRepository } from '@/lib/storage/repository';
import { NotificationScheduler } from './scheduler';
import { WhatsAppCloudApiClient } from './client';
import { buildDoseIdempotencyKey } from './token';

describe('WhatsApp Scheduler & Reliability Tests', () => {
  beforeEach(() => {
    KiraRepository.clearAllData();
    const pet = KiraRepository.addPet({
      name: 'Kira',
      species: 'Canino',
      breed: 'Mestiza (tipo Pastor)',
      owner_id: 'user-default-001',
    });
    KiraRepository.updateSettings({
      whatsapp_phone: '+59899123456',
      reminders_enabled: true,
      advance_notice_minutes: 15,
    });
    KiraRepository.saveMedication(
      {
        pet_id: pet.id,
        name: 'Meloxicam 1.5 mg/ml',
        presentation: 'Gotas',
        dose_amount: 1,
        dose_unit: 'ml',
        instructions: 'Con el desayuno',
        track_inventory: false,
        current_stock: 0,
        low_stock_threshold: 0,
        is_active: true,
      },
      {
        frequency_type: 'daily',
        times_of_day: ['09:00'],
        start_date: '2026-01-01',
        is_active: true,
      }
    );
    expect(KiraRepository.getPet().name).toBe('Kira');
  });

  it('generates consistent idempotency key for scheduled doses', () => {
    const key1 = buildDoseIdempotencyKey('dose-123', '2026-10-15T12:00:00.000Z');
    const key2 = buildDoseIdempotencyKey('dose-123', '2026-10-15T12:00:00.000Z');
    expect(key1).toBe(key2);
    expect(key1).toContain('pawcare-dose-dose-123');
  });

  it('prevents enqueuing duplicate notification jobs for the same dose', () => {
    const doses = KiraRepository.getScheduledDoses();
    expect(doses.length).toBeGreaterThan(0);
    const dose = doses[0];

    const job1 = NotificationScheduler.enqueueReminderForDose(dose.id);
    expect(job1).toBeDefined();

    // Second call with same dose must return existing job and NOT duplicate
    const job2 = NotificationScheduler.enqueueReminderForDose(dose.id);
    expect(job2?.id).toBe(job1?.id);

    const jobs = KiraRepository.getNotificationJobs().filter(
      (j) => j.scheduled_dose_id === dose.id
    );
    expect(jobs.length).toBe(1);
  });

  it('formats reminder message body clearly with Montevideo details and secure URL', () => {
    const message = WhatsAppCloudApiClient.buildReminderText({
      petName: 'Kira',
      medicationName: 'Meloxicam 1.5 mg/ml',
      scheduledTime: '09:00',
      instructions: 'Con el desayuno',
      confirmationUrl: 'https://pawcare.app/confirmar-toma/test-token-123',
    });

    expect(message).toContain('*PawCare:* Recordatorio de medicación para Kira.');
    expect(message).toContain('Meloxicam 1.5 mg/ml');
    expect(message).toContain('09:00');
    expect(message).toContain('Con el desayuno');
    expect(message).toContain('https://pawcare.app/confirmar-toma/test-token-123');
  });

  it('operates safely in simulation mode when Meta credentials are not configured', async () => {
    const result = await WhatsAppCloudApiClient.sendReminder({
      toPhone: '+59899123456',
      petName: 'Kira',
      medicationName: 'Condroprotector',
      scheduledTime: '21:00',
      confirmationUrl: 'https://kiracare.app/confirmar-toma/sim-token',
    });

    expect(result.success).toBe(true);
    expect(result.isSimulated).toBe(true);
    expect(result.messageId).toContain('sim-wamid');
  });

  it('handles simulated job processing and logs attempts without marking dose as administered', async () => {
    const doses = KiraRepository.getScheduledDoses();
    const dose = doses[0];
    const initialStatus = dose.status;

    // Enqueue
    NotificationScheduler.enqueueReminderForDose(dose.id);

    // Process jobs
    const dispatch = await NotificationScheduler.processPendingJobs();
    expect(dispatch.processedCount).toBeGreaterThanOrEqual(1);

    // Dose status MUST NOT be marked as administered just because reminder was sent!
    const updatedDoses = KiraRepository.getScheduledDoses();
    const updatedDose = updatedDoses.find((d) => d.id === dose.id);
    expect(updatedDose?.status).not.toBe('administered');
    expect(updatedDose?.status).toBe(initialStatus);

    // Attempt log must be recorded
    const attempts = KiraRepository.getNotificationAttempts();
    expect(attempts.length).toBeGreaterThan(0);
    expect(attempts[0].status).toBe('success');
  });
});
