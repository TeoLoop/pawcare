// src/components/health/weight-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { KiraRepository } from '@/lib/storage/repository';
import { getLocalDateString } from '@/lib/date-utils';
import { Scale, AlertCircle, Plus, Minus } from 'lucide-react';

interface WeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWeight?: number;
}

export function WeightModal({ isOpen, onClose, onSuccess, initialWeight }: WeightModalProps) {
  const [weight, setWeight] = useState<number | ''>(initialWeight || 10);
  const [loggedDate, setLoggedDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const activePet = KiraRepository.getActivePet();
      setWeight(activePet?.weight_kg || initialWeight || 10);
      setLoggedDate(getLocalDateString());
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, initialWeight]);

  const handleAdjust = (delta: number) => {
    setWeight((prev) => {
      const current = typeof prev === 'number' ? prev : 10;
      const next = Math.max(0.1, Number((current + delta).toFixed(2)));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || Number(weight) <= 0) {
      setErrorMessage('Por favor ingresá un peso válido mayor a 0 kg.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const activePet = KiraRepository.getActivePet();
      KiraRepository.addWeightLog({
        pet_id: activePet.id,
        weight_kg: Number(weight),
        logged_date: loggedDate,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el peso.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Peso"
      description="Registrá el pesaje de tu mascota para seguir su evolución clínica"
      maxWidth="max-w-md"
      headerAction={
        <button
          form="weight-log-form"
          type="submit"
          disabled={isSubmitting || !weight}
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] transition-all shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      }
    >
      <form id="weight-log-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FDF2F0] dark:bg-rose-950/30 border border-[#F8D7DA] dark:border-rose-900/50 text-xs text-[#C34A3E] dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Big Weight Input */}
        <div className="bg-[#FAF8F5] dark:bg-stone-850 p-4 rounded-2xl border border-[#E5E1D6] dark:border-stone-750 text-center space-y-3">
          <label className="block text-xs font-semibold text-[#606763] dark:text-stone-300">
            Peso de la mascota
          </label>

          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="200"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-36 text-3xl font-extrabold text-center text-[#222624] dark:text-stone-100 bg-white dark:bg-stone-900 border border-[#D3DFD7] dark:border-stone-700 rounded-2xl py-2 px-3 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
            <span className="text-xl font-bold text-[#606763] dark:text-stone-400">kg</span>
          </div>

          {/* Quick Increment/Decrement Buttons for Phone */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleAdjust(-0.5)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#E9EFEA] dark:hover:bg-stone-800 transition-colors"
            >
              -0.5
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(-0.1)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#E9EFEA] dark:hover:bg-stone-800 transition-colors"
            >
              -0.1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(0.1)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#E9EFEA] dark:hover:bg-stone-800 transition-colors"
            >
              +0.1
            </button>
            <button
              type="button"
              onClick={() => handleAdjust(0.5)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#E9EFEA] dark:hover:bg-stone-800 transition-colors"
            >
              +0.5
            </button>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
            Fecha de pesaje <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="date"
            required
            value={loggedDate}
            onChange={(e) => setLoggedDate(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
            Observaciones o contexto (opcional)
          </label>
          <input
            type="text"
            placeholder="Ej: En ayunas, post-operatorio, pesaje en la veterinaria"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E1D6] dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5] dark:hover:bg-stone-850"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !weight}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Guardando...' : 'Guardar Pesaje'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
