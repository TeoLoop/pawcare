// src/components/health/symptom-form-modal.tsx
'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { KiraRepository } from '@/lib/storage/repository';
import { MobilityLevel, WalkingAbility, AppetiteLevel, BehaviorState } from '@/types/health';
import { AlertTriangle } from 'lucide-react';

interface SymptomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SymptomFormModal({ isOpen, onClose, onSuccess }: SymptomFormModalProps) {
  const [painLevel, setPainLevel] = useState<number>(3);
  const [mobility, setMobility] = useState<MobilityLevel>('somewhat_limited');
  const [walkingAbility, setWalkingAbility] = useState<WalkingAbility>('normal');
  const [pawSupport, setPawSupport] = useState<string>('Apoya las 4 patas con normalidad');
  const [appetite, setAppetite] = useState<AppetiteLevel>('normal');
  const [behavior, setBehavior] = useState<BehaviorState>('calm');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      KiraRepository.addSymptomLog({
        logged_at: new Date().toISOString(),
        pain_level: painLevel,
        mobility,
        walking_ability: walkingAbility,
        paw_support: pawSupport,
        appetite,
        behavior,
        notes: notes.trim() || undefined,
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
      title="Registrar Estado de Salud"
      description="Observación diaria del cuidador en el hogar"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Urgent clinical alert disclaimer */}
        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] text-xs text-[#606763] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#C97A24] mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#222624]">Apreciación del cuidador:</strong> Esta escala es subjetiva y no reemplaza la evaluación clínica veterinaria. Ante dolor agudo o descompensación, acudí a tu veterinario de urgencia.
          </p>
        </div>

        {/* Pain Level Slider (0-10) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#222624]">
              Nivel de molestia / dolor aparente (0 a 10)
            </label>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                painLevel <= 3
                  ? 'bg-[#E9EFEA] text-[#274033]'
                  : painLevel <= 6
                  ? 'bg-[#FFF5E6] text-[#8A5300]'
                  : 'bg-[#FDF2F0] text-[#C34A3E]'
              }`}
            >
              {painLevel} / 10 — {painLevel === 0 ? 'Sin signos' : painLevel <= 3 ? 'Leve' : painLevel <= 6 ? 'Moderado' : 'Severo'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={painLevel}
            onChange={(e) => setPainLevel(Number(e.target.value))}
            className="w-full accent-[#3E5A4D] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#606763] mt-1">
            <span>0: Cómoda y alegre</span>
            <span>5: Molestia visible</span>
            <span>10: Dolor agudo</span>
          </div>
        </div>

        {/* Mobility & Walking Ability */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Movilidad general
            </label>
            <select
              value={mobility}
              onChange={(e) => setMobility(e.target.value as MobilityLevel)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              <option value="normal">Normal (se mueve con soltura)</option>
              <option value="somewhat_limited">Algo limitada (rigidez o pereza)</option>
              <option value="severely_limited">Muy limitada (dificultad para erguirse)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Marcha / Caminata
            </label>
            <select
              value={walkingAbility}
              onChange={(e) => setWalkingAbility(e.target.value as WalkingAbility)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              <option value="normal">Normal</option>
              <option value="limping">Cojera o claudicación</option>
              <option value="needs_assistance">Requiere ayuda o soporte</option>
              <option value="unable">Imposibilitada de caminar</option>
            </select>
          </div>
        </div>

        {/* Paw Support */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Apoyo de las patas
          </label>
          <input
            type="text"
            value={pawSupport}
            onChange={(e) => setPawSupport(e.target.value)}
            placeholder="Ej: Apoya con normalidad / Evita apoyar trasera derecha"
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Appetite & Behavior */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Apetito
            </label>
            <select
              value={appetite}
              onChange={(e) => setAppetite(e.target.value as AppetiteLevel)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              <option value="normal">Normal (comió toda la ración)</option>
              <option value="increased">Aumentado</option>
              <option value="decreased">Disminuido (comió poco)</option>
              <option value="none">Nulo (rechazó el alimento)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Comportamiento
            </label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value as BehaviorState)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              <option value="calm">Tranquila y descansada</option>
              <option value="playful">Juguetona y activa</option>
              <option value="lethargic">Letárgica o decaída</option>
              <option value="anxious">Ansiosa</option>
              <option value="restless">Inquieta (no encuentra postura)</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Notas de observación (opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles sobre paseos, ánimo, ganas de jugar o reacción ante caricias..."
            className="w-full text-xs p-3 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] resize-none"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EFECE5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E1D6] text-xs font-medium text-[#606763] hover:bg-[#FAF8F5] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] transition-all shadow-xs disabled:opacity-50"
          >
            Guardar Registro de Salud
          </button>
        </div>
      </form>
    </Modal>
  );
}
