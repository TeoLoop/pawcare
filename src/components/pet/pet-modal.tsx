// src/components/pet/pet-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Pet } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

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
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (petToEdit) {
        setName(petToEdit.name);
        setSpecies(petToEdit.species);
        setBreed(petToEdit.breed || '');
        setBirthDate(petToEdit.birth_date || '');
        setWeightKg(petToEdit.weight_kg ?? '');
        setNotes(petToEdit.notes || '');
        setPhotoUrl(petToEdit.photo_url || '');
      } else {
        setName('');
        setSpecies('Canino');
        setBreed('');
        setBirthDate('');
        setWeightKg(15);
        setNotes('');
        setPhotoUrl('');
      }
    });
  }, [petToEdit, isOpen]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar los 10 MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'pets');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.publicUrl) {
          setPhotoUrl(data.publicUrl);
          setIsUploadingPhoto(false);
          return;
        }
      }

      // Fallback: Read as base64 data URL
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Error uploading pet photo:', err);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    }
  };

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
          photo_url: photoUrl.trim() || undefined,
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
          photo_url: photoUrl.trim() || undefined,
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
        {/* Photo Upload Avatar Picker */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3 rounded-2xl bg-[#FAF8F5] dark:bg-stone-850 border border-[#E5E1D6] dark:border-stone-800">
          <div className="relative group w-20 h-20 rounded-2xl border-2 border-dashed border-[#D3DFD7] dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-800 flex items-center justify-center shrink-0 shadow-2xs">
            {photoUrl ? (
              <>
                <img src={photoUrl} alt="Foto de la mascota" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  title="Eliminar foto"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="text-center p-2 text-[#606763] dark:text-stone-400">
                {isUploadingPhoto ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#3E5A4D] dark:text-emerald-400" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 mx-auto mb-1 text-[#3E5A4D] dark:text-emerald-400" />
                    <span className="text-[9px] font-bold block leading-tight">Subir foto</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 hover:bg-[#FAF8F5] dark:hover:bg-stone-700 text-xs font-semibold text-[#222624] dark:text-stone-100 cursor-pointer shadow-xs transition-colors">
              <Upload className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
              <span>{photoUrl ? 'Cambiar foto' : 'Elegir foto de tu perra'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                disabled={isUploadingPhoto}
              />
            </label>
            <p className="text-[11px] text-[#606763] dark:text-stone-400 mt-1">
              JPG, PNG o WebP. Se mostrará en el Inicio, barra lateral y perfiles.
            </p>
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            disabled={submitting || !name.trim()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] shadow-xs disabled:opacity-50"
          >
            {petToEdit ? 'Guardar' : 'Añadir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
