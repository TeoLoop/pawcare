// src/app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppWebhookService } from '@/lib/whatsapp/webhook';
import { KiraRepository } from '@/lib/storage/repository';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verification = WhatsAppWebhookService.handleVerification(mode, token, challenge);

  if (verification.isValid && verification.challenge) {
    return new NextResponse(verification.challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verificación fallida: token no coincide' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify Meta HMAC signature
    if (!WhatsAppWebhookService.verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);

    // Process status updates from Meta (delivered, read, failed)
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const value = change.value;

            // Handle delivery status update
            if (value?.statuses && Array.isArray(value.statuses)) {
              for (const statusObj of value.statuses) {
                const messageId = statusObj.id;
                const statusName = statusObj.status; // 'delivered', 'read', 'failed'

                const jobs = KiraRepository.getNotificationJobs();
                const job = jobs.find((j) => j.meta_message_id === messageId);
                if (job) {
                  if (statusName === 'delivered') {
                    KiraRepository.updateNotificationJob(job.id, { status: 'delivered' });
                  } else if (statusName === 'failed') {
                    const errorDetail = statusObj.errors?.[0]?.title || 'Error de entrega Meta';
                    KiraRepository.updateNotificationJob(job.id, {
                      status: 'failed',
                      failure_reason: errorDetail,
                    });
                  }
                }
              }
            }

            // Handle incoming message replies (e.g. "SI", "TOMADA", "LISTO")
            if (value?.messages && Array.isArray(value.messages)) {
              for (const msg of value.messages) {
                const textBody = msg.text?.body?.trim().toUpperCase();
                const affirmativeKeywords = ['SI', 'SÍ', 'TOMADA', 'LISTO', 'ADMINISTRADA', 'OK'];

                if (textBody && affirmativeKeywords.includes(textBody)) {
                  // Find latest pending or scheduled dose today
                  const doses = KiraRepository.getScheduledDoses();
                  const pendingDose = doses.find(
                    (d) => d.status === 'pending' || d.status === 'delayed' || d.status === 'scheduled'
                  );

                  if (pendingDose) {
                    KiraRepository.recordDoseAction({
                      scheduled_dose_id: pendingDose.id,
                      medication_id: pendingDose.medication_id,
                      status: 'administered',
                      registered_by: 'whatsapp_webhook',
                      notes: `Confirmado vía respuesta directa de WhatsApp: "${textBody}"`,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error al procesar webhook';
    console.error('Webhook error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
