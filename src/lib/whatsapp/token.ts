// src/lib/whatsapp/token.ts
import crypto from 'crypto';

/**
 * Generates a high-entropy, cryptographically secure random token for dose confirmation links.
 */
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates an idempotency key for scheduled doses to prevent duplicate messages.
 */
export function buildDoseIdempotencyKey(scheduledDoseId: string, scheduledForIso: string): string {
  const normalizedIso = new Date(scheduledForIso).toISOString();
  return `kira-dose-${scheduledDoseId}-${normalizedIso}`;
}
