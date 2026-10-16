// src/components/pet/pet-switcher.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { PetModal } from './pet-modal';

export function PetSwitcher() {
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshPets = () => {
    setPets(KiraRepository.getPets());
    setActivePet(KiraRepository.getActivePet());
  };

  useEffect(() => {
    setMounted(true);
    refreshPets();

    const handlePetChange = () => {
      refreshPets();
    };

    window.addEventListener('pawcare_pet_changed', handlePetChange);
    return () => window.removeEventListener('pawcare_pet_changed', handlePetChange);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectPet = (petId: string) => {
    KiraRepository.setActivePetId(petId);
    setIsOpen(false);
  };

  if (!mounted) {
    return (
      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#274033] dark:text-emerald-300 border border-[#D3DFD7] dark:border-emerald-800 text-xs font-semibold shadow-2xs">
        <span className="text-sm">🐾</span>
        <span className="font-bold">Mascotas</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 opacity-60" />
      </div>
    );
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {activePet?.name ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#E9EFEA] hover:bg-[#DDE7DF] dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-[#274033] dark:text-emerald-300 border border-[#D3DFD7] dark:border-emerald-800 text-xs font-semibold transition-all shadow-2xs"
          aria-expanded={isOpen}
        >
          <span className="text-sm">🐾</span>
          <span className="font-bold truncate max-w-[100px] sm:max-w-none">{activePet.name}</span>
          <span className="text-[10px] text-[#3E5A4D] dark:text-emerald-400 font-normal hidden sm:inline">
            ({activePet.species})
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9EFEA] hover:bg-[#DDE7DF] dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-[#274033] dark:text-emerald-300 border border-[#D3DFD7] dark:border-emerald-800 text-xs font-semibold transition-all shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
          <span>Registrar Mascota</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute left-0 mt-2 w-60 rounded-2xl bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-[#606763] dark:text-stone-400 uppercase tracking-wider">
            Tus Mascotas
          </div>

          <div className="space-y-1 mb-1.5 max-h-48 overflow-y-auto">
            {pets.map((pet) => {
              const isSelected = pet.id === activePet?.id;
              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => handleSelectPet(pet.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-2xs'
                      : 'hover:bg-[#FAF8F5] dark:hover:bg-stone-800/60 text-[#222624] dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 flex items-center justify-center text-xs shrink-0">
                      🐾
                    </div>
                    <div className="min-w-0">
                      <p className="leading-tight truncate">{pet.name}</p>
                      <p className="text-[10px] text-[#606763] dark:text-stone-400 font-normal leading-tight truncate">
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-[#EFECE5] dark:border-stone-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-[#3E5A4D] dark:text-emerald-400 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir otra mascota</span>
            </button>
          </div>
        </div>
      )}

      <PetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          refreshPets();
        }}
      />
    </div>
  );
}
