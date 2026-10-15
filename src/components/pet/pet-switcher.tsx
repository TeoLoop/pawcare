// src/components/pet/pet-switcher.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { Pet } from '@/types/medication';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { PetModal } from './pet-modal';

export function PetSwitcher() {
  const [activePet, setActivePet] = useState<Pet>(KiraRepository.getActivePet());
  const [pets, setPets] = useState<Pet[]>(KiraRepository.getPets());
  const [isOpen, setIsOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshPets = () => {
    setPets(KiraRepository.getPets());
    setActivePet(KiraRepository.getActivePet());
  };

  useEffect(() => {
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

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#E9EFEA] hover:bg-[#DDE7DF] text-[#274033] border border-[#D3DFD7] text-xs font-semibold transition-all shadow-xs"
        aria-expanded={isOpen}
      >
        <span className="text-sm">🐾</span>
        <span className="font-bold">{activePet.name}</span>
        <span className="text-[10px] text-[#3E5A4D] font-normal hidden sm:inline">
          ({activePet.species})
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#3E5A4D] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white border border-[#E5E1D6] shadow-lg p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[11px] font-bold text-[#606763] uppercase tracking-wider">
            Tus Mascotas
          </div>

          <div className="space-y-1 mb-1.5 max-h-48 overflow-y-auto">
            {pets.map((pet) => {
              const isSelected = pet.id === activePet.id;
              return (
                <button
                  key={pet.id}
                  type="button"
                  onClick={() => handleSelectPet(pet.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? 'bg-[#E9EFEA] text-[#274033] font-semibold'
                      : 'hover:bg-[#FAF8F5] text-[#222624]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E1D6] flex items-center justify-center text-xs">
                      🐾
                    </div>
                    <div>
                      <p className="leading-tight">{pet.name}</p>
                      <p className="text-[10px] text-[#606763] font-normal leading-tight">
                        {pet.species} {pet.breed ? `• ${pet.breed}` : ''}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#3E5A4D]" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-[#EFECE5]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAddModalOpen(true);
              }}
              className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-[#3E5A4D] hover:bg-[#FAF8F5] transition-colors"
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
