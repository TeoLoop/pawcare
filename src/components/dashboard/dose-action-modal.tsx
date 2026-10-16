// src/components/dashboard/dose-action-modal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { ScheduledDose } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Pill, MessageSquare } from 'lucide-react';
import { getLocalTimeString } from '@/lib/date-utils';
import { formatDoseAmount } from '@/lib/utils';
import { buildWhatsAppDirectLink } from '@/lib/whatsapp/client';

interface DoseActionModalProps {
  dose: ScheduledDose | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DoseActionModal({ dose, isOpen, onClose, onSuccess }: DoseActionModalProps) {
  const [actionType, setActionType] = useState<'administered' | 'skipped'>('administered');
  const [actualTime, setActualTime] = useState(getLocalTimeString());
  const [notes, setNotes] = useState('');
  const [reasonSkipped, setReasonSkipped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!dose || !dose.medication) return null;

  const isDelayed = dose.status === 'delayed';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      KiraRepository.recordDoseAction({
        scheduled_dose_id: dose.id,
        medication_id: dose.medication_id,
        status: actionType,
        registered_by: 'manual',
        notes: notes.trim() || undefined,
        reason_skipped: actionType === 'skipped' ? reasonSkipped.trim() || 'Omitida manualmente' : undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Toma de Medicación"
      description={`Confirmación para ${dose.medication.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Medication Info Card */}
        <div className="p-3.5 rounded-2xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#E5E1D6] dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#222624] dark:text-stone-100">{dose.medication.name}</p>
                <p className="text-xs text-[#606763] dark:text-stone-400">{dose.medication.presentation}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:text-emerald-300">
              {formatDoseAmount(dose.dose_amount)} {dose.dose_unit}
            </span>
          </div>

          <div className="mt-2.5 pt-2 border-t border-[#EFECE5] dark:border-stone-700/80 flex items-center justify-between text-xs text-[#606763] dark:text-stone-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" /> Horario programado: {dose.scheduled_time} hs
            </span>
            {dose.medication.track_inventory && (
              <span>Stock actual: {dose.medication.current_stock} {dose.medication.dose_unit}</span>
            )}
          </div>
        </div>

        {/* Delayed Dose Warning */}
        {isDelayed && (
          <div className="p-3 rounded-xl bg-[#FFF5E6] dark:bg-amber-950/30 border border-[#FFE0B2] dark:border-amber-900/50 text-xs text-[#8A5300] dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#C97A24] dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold">Esta dosis se encuentra retrasada</p>
              <p className="mt-0.5 leading-relaxed">
                Registrá la situación real. Recordá no duplicar ni suministrar dosis compensatorias sin indicación veterinaria expresa.
              </p>
            </div>
          </div>
        )}

        {/* Action Selector: Administered vs Skipped */}
        <div>
          <label className="block text-xs font-semibold text-[#606763] dark:text-stone-400 uppercase tracking-wider mb-2">
            Resultado de la toma
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActionType('administered')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                actionType === 'administered'
                  ? 'border-[#3E5A4D] bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5]'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${actionType === 'administered' ? 'text-[#3E5A4D] dark:text-emerald-400' : 'text-[#8E9490]'}`} />
              Administrada
            </button>

            <button
              type="button"
              onClick={() => setActionType('skipped')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                actionType === 'skipped'
                  ? 'border-[#C34A3E] bg-[#FDF2F0] text-[#C34A3E] dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-300 shadow-xs'
                  : 'border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5]'
              }`}
            >
              <XCircle className={`w-4 h-4 ${actionType === 'skipped' ? 'text-[#C34A3E] dark:text-rose-400' : 'text-[#8E9490]'}`} />
              Omitida
            </button>
          </div>
        </div>

        {/* Fields for Administered */}
        {actionType === 'administered' && (
          <div>
            <label className="block text-xs font-medium text-[#606763] dark:text-stone-300 mb-1">
              Hora real de administración
            </label>
            <input
              type="time"
              value={actualTime}
              onChange={(e) => setActualTime(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#222624] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
            {dose.medication.track_inventory && (
              <p className="text-[11px] text-[#606763] dark:text-stone-400 mt-1">
                Se descontará {formatDoseAmount(dose.dose_amount)} {dose.dose_unit} del inventario disponible.
              </p>
            )}
          </div>
        )}

        {/* Fields for Skipped */}
        {actionType === 'skipped' && (
          <div>
            <label className="block text-xs font-medium text-[#606763] dark:text-stone-300 mb-1">
              Motivo de la omisión <span className="text-[#C34A3E]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Rechazó el alimento, vomitó previamente, etc."
              value={reasonSkipped}
              onChange={(e) => setReasonSkipped(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#222624] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#C34A3E]"
            />
            <p className="text-[11px] text-[#606763] dark:text-stone-400 mt-1">
              La omisión quedará registrada en el historial. No se descontará stock.
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-[#606763] dark:text-stone-300 mb-1">
            Notas adicionales (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: Tomada sin resistencia junto con la comida"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#222624] dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-[#EFECE5] dark:border-stone-800">
          <a
            href={buildWhatsAppDirectLink({
              phone: KiraRepository.getSettings().whatsapp_phone,
              petName: KiraRepository.getActivePet()?.name || 'Mascota',
              medicationName: dose.medication.name,
              doseAmount: formatDoseAmount(dose.dose_amount),
              doseUnit: dose.dose_unit,
              scheduledTime: dose.scheduled_time,
              instructions: dose.medication.instructions,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors shadow-2xs"
            title="Abrir WhatsApp con el recordatorio listo para enviar"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Avisar por WhatsApp</span>
          </a>

          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 text-xs font-medium text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (actionType === 'skipped' && !reasonSkipped.trim())}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-xs disabled:opacity-50 ${
                actionType === 'administered' ? 'bg-[#3E5A4D] hover:bg-[#32493E]' : 'bg-[#C34A3E] hover:bg-[#AA3E33]'
              }`}
            >
              {actionType === 'administered' ? 'Guardar' : 'Omitir'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
