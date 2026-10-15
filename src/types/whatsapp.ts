// src/types/whatsapp.ts

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface NotificationJob {
  id: string;
  scheduled_dose_id: string;
  idempotency_key: string;
  channel: 'whatsapp';
  recipient_phone: string;
  scheduled_send_at: string;
  status: NotificationStatus;
  attempts_count: number;
  max_attempts: number;
  last_attempt_at?: string;
  meta_message_id?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationAttempt {
  id: string;
  job_id: string;
  attempt_number: number;
  attempted_at: string;
  status: 'success' | 'failure';
  response_payload?: Record<string, unknown>;
  error_message?: string;
  created_at: string;
}

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}
