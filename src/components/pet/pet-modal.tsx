// src/components/pet/pet-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Pet } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';

interface PetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pet: Pet) => void;
  petToEdit?: Pet | null;
}

export function PetModal({ isOpen, onClose, onSuccess, petToEdit }: PetModalProps) {
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('Canino');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weightKg, setWeightKg] = useState<number | ''>(20);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (petToEdit) {
      setName(petToEdit.name);
      setSpecies(petToEdit.species);
      setBreed(petToEdit.breed || '');
      setBirthDate(petToEdit.birth_date || '');
      setWeightKg(petToEdit.weight_kg ?? '');
      setNotes(petToEdit.notes || '');
    } else {
      setName('');
      setSpecies('Canino');
      setBreed('');
      setBirthDate('');
      setWeightKg(15);
      setNotes('');
    }
  }, [petToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      let saved: Pet;
      if (petToEdit) {
        saved = KiraRepository.updatePet(petToEdit.id, {
          name: name.trim(),
          species: species.trim(),
          breed: breed.trim() || undefined,
          birth_date: birthDate || undefined,
          weight_kg: weightKg !== '' ? Number(weightKg) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        saved = KiraRepository.addPet({
          owner_id: 'user-default-001',
          name: name.trim(),
          species: species.trim(),
          breed: breed.trim() || undefined,
          birth_date: birthDate || undefined,
          weight_kg: weightKg !== '' ? Number(weightKg) : undefined,
          notes: notes.trim() || undefined,
        });
      }

      onSuccess(saved);
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
      title={petToEdit ? `Editar Perfil de ${petToEdit.name}` : 'Añadir Nueva Mascota'}
      description="Perfil individual para gestionar medicamentos y salud"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Nombre de la mascota <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Kira, Milo, Luna, Oliver..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Especie <span className="text-[#C34A3E]">*</span>
            </label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              <option value="Canino">Perro (Canino)</option>
              <option value="Felino">Gato (Felino)</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Raza / Tipo
            </label>
            <input
              type="text"
              placeholder="Ej: Mestizo, Siamés, Labrador..."
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Fecha de nacimiento (opcional)
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Peso aproximado (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Notas permanentes de salud o cuidados
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, sensibilidad estomacal, indicaciones de alimentación..."
            className="w-full text-xs p-3 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D] resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EFECE5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E1D6] text-xs font-medium text-[#606763] hover:bg-[#FAF8F5]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] shadow-xs disabled:opacity-50"
          >
            {petToEdit ? 'Guardar Cambios' : 'Añadir Mascota'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
