// src/app/confirmar-toma/[token]/confirmar-client.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { KiraRepository } from '@/lib/storage/repository';
import { ScheduledDose } from '@/types/medication';
import { CheckCircle2, Clock, Pill, ArrowLeft, ShieldCheck } from 'lucide-react';
import { PawIcon } from '@/components/ui/paw-icon';

export function ConfirmarClient({ token }: { token: string }) {
  const [dose, setDose] = useState<ScheduledDose | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyProcessed, setAlreadyProcessed] = useState(false);
  const [actionDone, setActionDone] = useState<'administered' | 'skipped' | null>(null);
  const [notes, setNotes] = useState('');
  const [reasonSkipped, setReasonSkipped] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (!token) {
        setLoading(false);
        return;
      }

      const matchedDose = KiraRepository.getDoseByConfirmationToken(token);
      if (matchedDose) {
        setDose(matchedDose);
      } else {
        setAlreadyProcessed(true);
      }
      setLoading(false);
    });
  }, [token]);

  const handleConfirm = (status: 'administered' | 'skipped') => {
    if (!dose) return;
    setSubmitting(true);

    try {
      KiraRepository.recordDoseAction({
        scheduled_dose_id: dose.id,
        medication_id: dose.medication_id,
        status,
        registered_by: 'whatsapp_link',
        notes: notes.trim() || undefined,
        reason_skipped: status === 'skipped' ? reasonSkipped.trim() || 'Omitida desde enlace WhatsApp' : undefined,
      });

      setActionDone(status);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
        <div className="text-center text-[#606763]">
          <div className="w-10 h-10 border-3 border-[#3E5A4D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">Cargando verificación segura de toma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#222624] flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E9EFEA] text-[#274033] text-xs font-semibold tracking-wide uppercase mb-3">
            <PawIcon className="w-3.5 h-3.5 fill-current text-[#3E5A4D]" />
            PawCare • Confirmación Segura
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#222624]">
            Registro de Medicación
          </h1>
          <p className="text-sm text-[#606763] mt-1">
            Enlace de un solo uso para registrar la toma prescrita
          </p>
        </div>

        {/* State 1: Already processed or expired */}
        {alreadyProcessed && !actionDone && (
          <div className="bg-white rounded-2xl border border-[#E5E1D6] p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[#EFECE5] text-[#606763] flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-6 h-6 text-[#3E5A4D]" />
            </div>
            <h2 className="text-lg font-semibold text-[#222624] mb-2">
              Toma ya procesada o enlace caducado
            </h2>
            <p className="text-sm text-[#606763] mb-6 leading-relaxed">
              Este enlace de confirmación ya fue utilizado para registrar la dosis correspondiente o ha expirado por seguridad. Podés revisar el historial completo en la app.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-sm font-medium transition-colors"
            >
              Ir a Kira Care
            </Link>
          </div>
        )}

        {/* State 2: Successful submission */}
        {actionDone && (
          <div className="bg-white rounded-2xl border border-[#E5E1D6] p-6 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-[#E9EFEA] text-[#357A57] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-[#222624] mb-2">
              {actionDone === 'administered' ? '¡Dosis Registrada con Éxito!' : 'Toma Registrada como Omitida'}
            </h2>
            <p className="text-sm text-[#606763] mb-6 leading-relaxed">
              {actionDone === 'administered'
                ? `La dosis de ${dose?.medication?.name} ha quedado registrada en el historial y el inventario fue actualizado.`
                : `Se guardó el motivo de omisión en el historial clínico de Kira.`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-sm font-medium transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        )}

        {/* State 3: Active Confirmation View */}
        {dose && !alreadyProcessed && !actionDone && (
          <div className="bg-white rounded-2xl border border-[#E5E1D6] p-6 shadow-sm">
            {/* Medication Details Card */}
            <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#EFECE5] mb-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#E9EFEA] flex items-center justify-center text-[#3E5A4D]">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#222624] text-base leading-snug">
                      {dose.medication?.name}
                    </h3>
                    {dose.medication?.active_substance && (
                      <p className="text-xs text-[#606763]">
                        {dose.medication.active_substance}
                      </p>
                    )}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E9EFEA] text-[#274033]">
                  {dose.dose_amount} {dose.dose_unit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#606763] pt-2 border-t border-[#E5E1D6]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#3E5A4D]" />
                  <span>Horario: <strong>{dose.scheduled_time} hs</strong></span>
                </div>
                <div>
                  <span>Presentación: {dose.medication?.presentation}</span>
                </div>
              </div>

              {dose.medication?.instructions && (
                <div className="mt-3 p-2.5 bg-white rounded-lg border border-[#E5E1D6] text-xs text-[#222624]">
                  <strong className="text-[#3E5A4D]">Indicación veterinaria:</strong> {dose.medication.instructions}
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-medium text-[#606763] mb-1">
                  Notas u observación de la toma (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Tomada con comida, sin dificultad"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] text-[#222624]"
                />
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => handleConfirm('administered')}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white font-medium text-sm transition-all shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar toma administrada
              </button>

              <div className="pt-2 border-t border-[#EFECE5]">
                <details className="text-xs">
                  <summary className="cursor-pointer text-[#606763] hover:text-[#222624] py-1 text-center font-medium">
                    ¿No pudiste administrarla? Opciones adicionales
                  </summary>
                  <div className="pt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Motivo de omisión (ej: rechazo, vómito, control veterinario)"
                      value={reasonSkipped}
                      onChange={(e) => setReasonSkipped(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#C34A3E]"
                    />
                    <button
                      type="button"
                      onClick={() => handleConfirm('skipped')}
                      disabled={submitting}
                      className="w-full py-2 px-3 rounded-lg bg-[#FAF8F5] border border-[#E5E1D6] hover:bg-[#EFECE5] text-[#C34A3E] font-medium transition-colors"
                    >
                      Registrar como omitida
                    </button>
                  </div>
                </details>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-[#606763] hover:text-[#222624]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Abrir panel principal de PawCare
              </Link>
            </div>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-[#606763] py-4">
        PawCare • Cuidado responsable y seguimiento de salud de mascotas
      </footer>
    </div>
  );
}
