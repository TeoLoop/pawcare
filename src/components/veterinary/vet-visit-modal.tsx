// src/components/veterinary/vet-visit-modal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { KiraRepository } from '@/lib/storage/repository';
import { getLocalDateString } from '@/lib/date-utils';

interface VetVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function VetVisitModal({ isOpen, onClose, onSuccess }: VetVisitModalProps) {
  const [visitDate, setVisitDate] = useState(getLocalDateString());
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [nextAppointment, setNextAppointment] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    try {
      KiraRepository.addVetVisit({
        visit_date: new Date(visitDate).toISOString(),
        clinic_name: clinicName.trim() || undefined,
        veterinarian_name: vetName.trim() || undefined,
        reason: reason.trim(),
        diagnosis: diagnosis.trim() || undefined,
        professional_recommendations: recommendations.trim() || undefined,
        next_appointment_at: nextAppointment ? new Date(nextAppointment).toISOString() : undefined,
        cost: cost ? Number(cost) : undefined,
      });

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
      title="Registrar Control Veterinario"
      description="Visita, diagnóstico clínico profesional y recomendaciones"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Fecha de consulta <span className="text-[#C34A3E]">*</span>
            </label>
            <input
              type="date"
              required
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Próximo control agendado (opcional)
            </label>
            <input
              type="datetime-local"
              value={nextAppointment}
              onChange={(e) => setNextAppointment(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Clínica / Hospital
            </label>
            <input
              type="text"
              placeholder="Ej: Clínica Pocitos"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Veterinario tratante
            </label>
            <input
              type="text"
              placeholder="Ej: Dra. Morales"
              value={vetName}
              onChange={(e) => setVetName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Motivo de la consulta <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Control por renguera tras paseos o control de rutina"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Diagnóstico comunicado por el profesional
          </label>
          <textarea
            rows={2}
            placeholder="Diagnóstico exacto emitido por el veterinario..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="w-full text-xs p-3 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Recomendaciones e indicaciones médicas
          </label>
          <textarea
            rows={2}
            placeholder="Pautas de medicación, ejercicios prohibidos o cuidados..."
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            className="w-full text-xs p-3 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Costo (UYU, opcional)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            placeholder="Ej: 1800"
            value={cost}
            onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
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
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
