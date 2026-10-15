// src/lib/whatsapp/webhook.ts
import crypto from 'crypto';

export class WhatsAppWebhookService {
  /**
   * Verifies the HMAC SHA-256 signature from Meta webhook requests.
   */
  public static verifySignature(rawBody: string, signatureHeader: string | null): boolean {
    const appSecret = process.env.META_APP_SECRET;

    // If no secret configured in development, allow for local testing
    if (!appSecret) {
      return true;
    }

    if (!signatureHeader) {
      return false;
    }

    const parts = signatureHeader.split('sha256=');
    if (parts.length !== 2) {
      return false;
    }

    const expectedSignature = parts[1];
    const computedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Validates the Meta Webhook setup challenge.
   */
  public static handleVerification(
    mode: string | null,
    verifyToken: string | null,
    challenge: string | null
  ): { isValid: boolean; challenge?: string } {
    const configuredToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'kira_care_dev_verify_token';

    if (mode === 'subscribe' && verifyToken === configuredToken && challenge) {
      return { isValid: true, challenge };
    }

    return { isValid: false };
  }
}
