// src/lib/whatsapp/scheduler.ts
import { KiraRepository } from '@/lib/storage/repository';
import { WhatsAppCloudApiClient } from './client';
import { buildDoseIdempotencyKey } from './token';
import { NotificationJob, NotificationAttempt } from '@/types/whatsapp';

export interface DispatchResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  details: Array<{
    jobId: string;
    scheduledDoseId: string;
    status: string;
    isSimulated?: boolean;
    error?: string;
  }>;
}

export class NotificationScheduler {
  /**
   * Enqueues a notification job for a scheduled dose if one does not already exist.
   * Strictly uses idempotency key to prevent duplication.
   */
  public static enqueueReminderForDose(scheduledDoseId: string): NotificationJob | null {
    const doses = KiraRepository.getScheduledDoses();
    const dose = doses.find((d) => d.id === scheduledDoseId);
    if (!dose || !dose.medication) return null;

    const settings = KiraRepository.getSettings();
    if (!settings.reminders_enabled || !settings.whatsapp_phone) return null;

    const idempotencyKey = buildDoseIdempotencyKey(dose.id, dose.scheduled_for);

    // Check if job already exists with this idempotency key
    const existingJobs = KiraRepository.getNotificationJobs();
    const alreadyEnqueued = existingJobs.find((j) => j.idempotency_key === idempotencyKey);
    if (alreadyEnqueued) {
      return alreadyEnqueued;
    }

    // Calculate scheduled send time: scheduled_for - advance_notice_minutes
    const scheduledDate = new Date(dose.scheduled_for);
    const sendAtDate = new Date(scheduledDate.getTime() - (settings.advance_notice_minutes || 15) * 60 * 1000);

    const now = new Date().toISOString();
    const newJob: NotificationJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scheduled_dose_id: dose.id,
      idempotency_key: idempotencyKey,
      channel: 'whatsapp',
      recipient_phone: settings.whatsapp_phone,
      scheduled_send_at: sendAtDate.toISOString(),
      status: 'pending',
      attempts_count: 0,
      max_attempts: 3,
      created_at: now,
      updated_at: now,
    };

    KiraRepository.addNotificationJob(newJob);
    return newJob;
  }

  /**
   * Enqueues reminders for all upcoming doses today and tomorrow.
   */
  public static enqueueUpcomingDoses(): number {
    const doses = KiraRepository.getScheduledDoses();
    let count = 0;
    for (const dose of doses) {
      if (dose.status === 'scheduled' || dose.status === 'pending') {
        const job = this.enqueueReminderForDose(dose.id);
        if (job) count++;
      }
    }
    return count;
  }

  /**
   * Processes all pending and retryable notification jobs.
   */
  public static async processPendingJobs(): Promise<DispatchResult> {
    const jobs = KiraRepository.getNotificationJobs();
    const now = new Date();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const pet = KiraRepository.getPet();

    const result: DispatchResult = {
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      details: [],
    };

    // Filter jobs that are ready to send and haven't exceeded max attempts
    const eligibleJobs = jobs.filter((job) => {
      if (job.status !== 'pending' && job.status !== 'failed') return false;
      if (job.attempts_count >= job.max_attempts) return false;
      const sendAt = new Date(job.scheduled_send_at);
      return sendAt <= now;
    });

    for (const job of eligibleJobs) {
      result.processedCount++;
      const dose = KiraRepository.getScheduledDoses().find((d) => d.id === job.scheduled_dose_id);

      if (!dose || !dose.medication) {
        KiraRepository.updateNotificationJob(job.id, {
          status: 'cancelled',
          failure_reason: 'Dosis programada eliminada o no disponible',
        });
        continue;
      }

      // Check quiet hours
      const settings = KiraRepository.getSettings();
      if (settings.quiet_hours_enabled && settings.quiet_hours_start && settings.quiet_hours_end) {
        // e.g. "23:00" - "07:00"
        const currentHourMin = now.toLocaleTimeString('es-UY', {
          timeZone: 'America/Montevideo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const isQuiet =
          settings.quiet_hours_start > settings.quiet_hours_end
            ? currentHourMin >= settings.quiet_hours_start || currentHourMin <= settings.quiet_hours_end
            : currentHourMin >= settings.quiet_hours_start && currentHourMin <= settings.quiet_hours_end;

        if (isQuiet) {
          // Postpone until quiet hours end
          continue;
        }
      }

      const attemptNumber = job.attempts_count + 1;
      const confirmationToken = dose.confirmation_token || 'direct';
      const confirmationUrl = `${appUrl}/confirmar-toma/${confirmationToken}`;

      // Dispatch via Meta Cloud API
      const sendResult = await WhatsAppCloudApiClient.sendReminder({
        toPhone: job.recipient_phone,
        petName: pet.name,
        medicationName: dose.medication.name,
        scheduledTime: dose.scheduled_time,
        doseInstructions: dose.medication.instructions,
        confirmationUrl,
      });

      const attemptTime = new Date().toISOString();

      if (sendResult.success) {
        result.successCount++;
        KiraRepository.updateNotificationJob(job.id, {
          status: 'sent',
          attempts_count: attemptNumber,
          last_attempt_at: attemptTime,
          meta_message_id: sendResult.messageId,
          failure_reason: undefined,
        });

        const attempt: NotificationAttempt = {
          id: `att-${Date.now()}`,
          job_id: job.id,
          attempt_number: attemptNumber,
          attempted_at: attemptTime,
          status: 'success',
          response_payload: {
            messageId: sendResult.messageId,
            isSimulated: sendResult.isSimulated ?? false,
          },
          created_at: attemptTime,
        };
        KiraRepository.addNotificationAttempt(attempt);

        result.details.push({
          jobId: job.id,
          scheduledDoseId: job.scheduled_dose_id,
          status: 'sent',
          isSimulated: sendResult.isSimulated,
        });
      } else {
        result.failureCount++;
        const isTerminal = attemptNumber >= job.max_attempts;
        KiraRepository.updateNotificationJob(job.id, {
          status: isTerminal ? 'failed' : 'pending',
          attempts_count: attemptNumber,
          last_attempt_at: attemptTime,
          failure_reason: sendResult.error,
        });

        const attempt: NotificationAttempt = {
          id: `att-${Date.now()}`,
          job_id: job.id,
          attempt_number: attemptNumber,
          attempted_at: attemptTime,
          status: 'failure',
          error_message: sendResult.error,
          created_at: attemptTime,
        };
        KiraRepository.addNotificationAttempt(attempt);

        result.details.push({
          jobId: job.id,
          scheduledDoseId: job.scheduled_dose_id,
          status: 'failure',
          error: sendResult.error,
        });
      }
    }

    return result;
  }
}
