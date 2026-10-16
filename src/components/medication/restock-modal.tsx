// src/components/medication/restock-modal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Medication } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';

interface RestockModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockModal({ medication, isOpen, onClose, onSuccess }: RestockModalProps) {
  const [quantity, setQuantity] = useState<number>(30);
  const [notes, setNotes] = useState<string>('Compra en farmacia veterinaria');
  const [submitting, setSubmitting] = useState(false);

  if (!medication) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setSubmitting(true);
    try {
      KiraRepository.restockMedication(medication.id, Number(quantity), notes.trim() || undefined);
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
      title="Registrar Reposición de Medicación"
      description={`Añadir unidades al inventario de ${medication.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] text-xs">
          <p className="font-medium text-[#222624]">
            Stock actual: <strong>{medication.current_stock} {medication.dose_unit}</strong>
          </p>
          <p className="text-[#606763] mt-0.5">
            Umbral de advertencia: {medication.low_stock_threshold} {medication.dose_unit}
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Cantidad a ingresar ({medication.dose_unit}) <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="number"
            step="any"
            min="0.01"
            required
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Notas de la compra o lote
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Caja de 30 comprimidos, Vto: 12/2027"
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
            disabled={submitting || quantity <= 0}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] shadow-xs disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </form>
    </Modal>
  );
}
