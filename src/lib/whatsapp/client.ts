// src/lib/whatsapp/client.ts
// Alternativas a Meta WhatsApp Cloud API:
// 1. Direct Click-to-Chat (wa.me): 100% gratuito, sin configuración ni verificación de empresa.
// 2. CallMeBot API: Notificaciones automáticas a WhatsApp personal con un API key gratuito.

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
