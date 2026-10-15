// src/lib/whatsapp/client.ts
import { MetaSendResult } from '@/types/whatsapp';

export interface SendReminderMessageParams {
  toPhone: string;
  petName: string;
  medicationName: string;
  scheduledTime: string; // HH:MM
  doseInstructions?: string;
  confirmationUrl: string;
  useTemplate?: boolean;
}

export class WhatsAppCloudApiClient {
  private static getCredentials() {
    return {
      token: process.env.WHATSAPP_API_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      templateName: process.env.WHATSAPP_REMINDER_TEMPLATE_NAME || 'kira_medication_reminder',
    };
  }

  public static isConfigured(): boolean {
    const { token, phoneNumberId } = this.getCredentials();
    return Boolean(token && phoneNumberId && token.trim() !== '' && phoneNumberId.trim() !== '');
  }

  /**
   * Normalizes phone number to E.164 without '+' or spaces.
   * e.g., "+598 99 123 456" -> "59899123456"
   */
  public static normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Builds the reminder message text in Spanish according to spec.
   */
  public static buildReminderText(params: {
    petName: string;
    medicationName: string;
    scheduledTime: string;
    instructions?: string;
    confirmationUrl: string;
  }): string {
    const instructionLine = params.instructions
      ? `\n📋 Indicación: ${params.instructions}`
      : '\n📋 Consultá la pauta registrada antes de administrarla.';

    return `*Kira Care:* Recordatorio de medicación para ${params.petName}.\n\n` +
      `💊 Tratamiento: ${params.medicationName}\n` +
      `⏰ Horario previsto: ${params.scheduledTime}` +
      `${instructionLine}\n\n` +
      `Para registrar o consultar la toma, abrí tu enlace seguro:\n${params.confirmationUrl}`;
  }

  /**
   * Sends WhatsApp reminder via official Meta Cloud API.
   * If credentials are not set, operates in safe simulation mode with full audit trail.
   */
  public static async sendReminder(params: SendReminderMessageParams): Promise<MetaSendResult> {
    const { token, phoneNumberId, templateName } = this.getCredentials();
    const recipient = this.normalizePhoneNumber(params.toPhone);

    if (!recipient) {
      return {
        success: false,
        error: 'Número de WhatsApp de destino inválido o vacío.',
      };
    }

    // Development / Safe Simulation Mode
    if (!token || !phoneNumberId) {
      console.info(
        `[WhatsApp Cloud API - MODO SIMULACIÓN]\nDestino: ${recipient}\nMascota: ${params.petName}\nMedicamento: ${params.medicationName}\nHora: ${params.scheduledTime}\nEnlace: ${params.confirmationUrl}`
      );
      return {
        success: true,
        isSimulated: true,
        messageId: `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
    }

    const apiUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    let payload: Record<string, unknown>;

    if (params.useTemplate) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.petName },
                { type: 'text', text: params.medicationName },
                { type: 'text', text: params.scheduledTime },
                { type: 'text', text: params.confirmationUrl },
              ],
            },
          ],
        },
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: {
          preview_url: true,
          body: this.buildReminderText({
            petName: params.petName,
            medicationName: params.medicationName,
            scheduledTime: params.scheduledTime,
            instructions: params.doseInstructions,
            confirmationUrl: params.confirmationUrl,
          }),
        },
      };
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: Error al enviar mensaje`;
        return {
          success: false,
          error: errorMsg,
        };
      }

      const messageId = data?.messages?.[0]?.id;
      return {
        success: true,
        messageId: messageId || `wamid-${Date.now()}`,
        isSimulated: false,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido al contactar Meta API';
      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
