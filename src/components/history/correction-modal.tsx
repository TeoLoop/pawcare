// src/components/history/correction-modal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { DoseLog } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';

interface CorrectionModalProps {
  log: DoseLog | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CorrectionModal({ log, isOpen, onClose, onSuccess }: CorrectionModalProps) {
  const [newStatus, setNewStatus] = useState<'administered' | 'skipped'>('administered');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!log) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      KiraRepository.correctDoseLog(log.id, newStatus, reason.trim());
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Corregir Registro de Toma"
      description={`Toma de ${log.medication?.name || 'Medicamento'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] text-xs">
          <p className="font-semibold text-[#222624]">Estado actual: {log.status === 'administered' ? 'Administrada' : 'Omitida'}</p>
          <p className="text-[#606763] mt-0.5">
            Método de registro original: {log.registered_by}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Nuevo estado corregido <span className="text-[#C34A3E]">*</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as 'administered' | 'skipped')}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          >
            <option value="administered">Administrada (ajustará stock automáticamente si corresponde)</option>
            <option value="skipped">Omitida (restaurará stock si fue descontado erróneamente)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Motivo explícito de la corrección <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Se marcó administrada por error, Kira rechazó la dosis"
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
          <p className="text-[11px] text-[#606763] mt-1">
            Se mantendrá una pista de auditoría completa con fecha y motivo en las notas del registro.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end pt-3 border-t border-[#EFECE5]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E5E1D6] text-xs font-semibold text-[#606763] hover:bg-[#FAF8F5] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] shadow-xs disabled:opacity-50"
          >
            Corregir
          </button>
        </div>
      </form>
    </Modal>
  );
}
