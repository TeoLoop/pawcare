// src/types/settings.ts

export interface UserSettings {
  id: string;
  user_id: string;
  pet_id: string;
  timezone: string; // 'America/Montevideo'
  whatsapp_phone: string;
  callmebot_api_key: string; // Free personal API key from CallMeBot (no Meta Business needed)
  reminders_enabled: boolean;
  advance_notice_minutes: number;
  pending_dose_alert: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:MM
  quiet_hours_end?: string; // HH:MM
  inventory_alerts_enabled: boolean;
  created_at: string;
  updated_at: string;
}
