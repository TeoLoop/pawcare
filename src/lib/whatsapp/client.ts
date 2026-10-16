// src/lib/whatsapp/client.ts
// Alternativas a Meta WhatsApp Cloud API:
// 1. Direct Click-to-Chat (wa.me): 100% gratuito, sin configuración ni verificación de empresa.
// 2. CallMeBot API: Notificaciones automáticas a WhatsApp personal con un API key gratuito.

import { ScheduledDose } from '@/types/medication';

export interface CallMeBotResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isSimulated?: boolean;
}

export interface SendReminderParams {
  toPhone: string;
  apiKey?: string;
  petName: string;
  medicationName: string;
  scheduledTime: string;
  doseInstructions?: string;
  confirmationUrl: string;
}

export interface WhatsAppDirectLinkParams {
  phone?: string;
  petName: string;
  medicationName: string;
  doseAmount?: number | string;
  doseUnit?: string;
  scheduledTime: string;
  instructions?: string;
  confirmationUrl?: string;
}

export interface ScheduleShareParams {
  petName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  doses: ScheduledDose[];
  phone?: string;
}

/**
 * Builds a clean multi-day or single-day medication schedule to share with any contact or group on WhatsApp.
 */
export function buildScheduleWhatsAppMessage(params: ScheduleShareParams): { text: string; shareUrl: string } {
  const { petName, startDate, endDate, doses, phone } = params;

  const isSingleDay = startDate === endDate;
  const lines: string[] = [
    `🐾 *PawCare — Cronograma de Medicación*`,
    `🐶 Mascota: *${petName}*`,
  ];

  if (isSingleDay) {
    lines.push(`📅 Fecha: *${startDate}*`);
  } else {
    lines.push(`📅 Período: *${startDate}* al *${endDate}*`);
  }
  lines.push('');

  if (doses.length === 0) {
    lines.push(`_No hay tomas programadas registradas en este período._`);
  } else {
    // Group doses by scheduled_date
    const byDate = new Map<string, ScheduledDose[]>();
    for (const d of doses) {
      if (!byDate.has(d.scheduled_date)) {
        byDate.set(d.scheduled_date, []);
      }
      byDate.get(d.scheduled_date)!.push(d);
    }

    const sortedDates = Array.from(byDate.keys()).sort();

    for (const dateKey of sortedDates) {
      const dayDoses = byDate.get(dateKey) || [];
      if (!isSingleDay) {
        lines.push(`🗓️ *Fecha ${dateKey}:*`);
      }

      dayDoses.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

      for (const d of dayDoses) {
        const medName = d.medication?.name || 'Medicamento';
        const amount = d.dose_amount ? ` (${d.dose_amount} ${d.dose_unit || ''})`.trim() : '';
        const statusIcon = d.status === 'administered' ? '✅' : '⏳';
        const statusLabel = d.status === 'administered' ? 'Administrada' : 'Pendiente';
        lines.push(`  ${statusIcon} *${d.scheduled_time} hs* — ${medName}${amount} [${statusLabel}]`);
      }
      lines.push('');
    }
  }

  lines.push(`ℹ️ Compartido desde PawCare 🐾`);

  const text = lines.join('\n');
  const encoded = encodeURIComponent(text);
  const cleanPhone = phone ? CallMeBotClient.normalizePhone(phone) : '';

  const shareUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  return { text, shareUrl };
}

/**
 * Genera un enlace directo Click-to-Chat de WhatsApp (https://wa.me/).
 * No requiere registrar ninguna empresa en Meta, ni cuenta comercial ni tokens.
 * Abre directamente WhatsApp (Web o App) con el mensaje preparado para enviar
 * a uno mismo (chat personal) o a cualquier familiar / cuidador.
 */
export function buildWhatsAppDirectLink(params: WhatsAppDirectLinkParams): string {
  const lines: string[] = [
    `🐾 *PawCare* — Recordatorio de medicación`,
    ``,
    `🐶 Mascota: *${params.petName}*`,
    `💊 Medicamento: *${params.medicationName}*` +
      (params.doseAmount && params.doseUnit ? ` (${params.doseAmount} ${params.doseUnit})` : ''),
    `⏰ Hora prevista: *${params.scheduledTime} hs*`,
  ];

  if (params.instructions) {
    lines.push(`📋 Indicación: ${params.instructions}`);
  }

  if (params.confirmationUrl) {
    lines.push(``);
    lines.push(`Registrá la toma aquí: ${params.confirmationUrl}`);
  }

  const encoded = encodeURIComponent(lines.join('\n'));
  const phone = params.phone ? CallMeBotClient.normalizePhone(params.phone) : '';

  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export class CallMeBotClient {
  private static readonly BASE_URL = 'https://api.callmebot.com/whatsapp.php';

  /**
   * Normaliza el número a formato internacional numérico sin '+' ni espacios.
   * ej: "+598 99 123 456" → "59899123456"
   */
  public static normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Indica si hay teléfono configurado.
   */
  public static isConfigured(phone?: string, apiKey?: string): boolean {
    return Boolean(phone?.trim() && apiKey?.trim());
  }

  /**
   * Construye el texto legible para el recordatorio.
   */
  public static buildReminderText(params: {
    petName: string;
    medicationName: string;
    scheduledTime: string;
    instructions?: string;
    confirmationUrl: string;
  }): string {
    const lines = [
      `*PawCare:* Recordatorio de medicación para ${params.petName}.`,
      ``,
      `💊 Tratamiento: ${params.medicationName}`,
      `⏰ Horario previsto: ${params.scheduledTime} (hora Montevideo)`,
    ];

    if (params.instructions) {
      lines.push(`📋 Indicaciones: ${params.instructions}`);
    }

    lines.push(``);
    lines.push(`Registrá la toma aquí: ${params.confirmationUrl}`);

    return lines.join('\n');
  }

  /**
   * Envía un recordatorio por WhatsApp sin necesitar cuenta de empresa en Meta.
   * Si no hay API Key configurada, opera en modo de simulación segura sin fallar.
   */
  public static async sendReminder(params: SendReminderParams): Promise<CallMeBotResult> {
    const phone = this.normalizePhone(params.toPhone);

    if (!phone) {
      return { success: false, error: 'Número de teléfono inválido o vacío.' };
    }

    // Modo simulación si no se configuró API Key personal de CallMeBot
    if (!params.apiKey?.trim()) {
      return {
        success: true,
        isSimulated: true,
        messageId: `sim-wamid-${Date.now()}`,
      };
    }

    const text = this.buildReminderText({
      petName: params.petName,
      medicationName: params.medicationName,
      scheduledTime: params.scheduledTime,
      instructions: params.doseInstructions,
      confirmationUrl: params.confirmationUrl,
    });

    const encodedText = encodeURIComponent(text);
    const url = `${this.BASE_URL}?phone=${phone}&text=${encodedText}&apikey=${params.apiKey.trim()}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const body = await response.text();

      if (!response.ok || body.toLowerCase().includes('error')) {
        return {
          success: false,
          error: `CallMeBot error (${response.status}): ${body.substring(0, 120)}`,
        };
      }

      console.info(`[CallMeBot] Mensaje enviado a ${phone}: ${params.medicationName}`);
      return {
        success: true,
        messageId: `callmebot-${Date.now()}`,
        isSimulated: false,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con CallMeBot';
      return { success: false, error: msg };
    }
  }
}

// Compatibilidad hacia atrás
export const WhatsAppCloudApiClient = CallMeBotClient;
