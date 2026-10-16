// src/components/pet/share-pet-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Pet } from '@/types/medication';
import { Users, X, UserPlus, CheckCircle2, AlertCircle, Trash2, ShieldCheck, Heart } from 'lucide-react';

interface Guardian {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string;
  name: string;
}

interface SharePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

export function SharePetModal({ isOpen, onClose, pet }: SharePetModalProps) {
  const petId = pet?.id;
  const [identifier, setIdentifier] = useState('');
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [owner, setOwner] = useState<{ id: string; email: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGuardians = React.useCallback(async () => {
    if (!petId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pets/share?petId=${encodeURIComponent(petId)}`);
      if (res.ok) {
        const data = await res.json();
        setOwner(data.owner);
        setGuardians(data.guardians || []);
      }
    } catch {
      console.warn('Error fetching guardians');
    } finally {
      setIsLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    if (isOpen && petId) {
      queueMicrotask(() => {
        setSuccessMsg(null);
        setErrorMsg(null);
        setIdentifier('');
        fetchGuardians();
      });
    }
  }, [isOpen, petId, fetchGuardians]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet?.id || !identifier.trim()) return;

    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/pets/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: pet.id, identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'No se pudo compartir la mascota.');
      } else {
        setSuccessMsg(data.message || '¡Mascota compartida con éxito!');
        setIdentifier('');
        fetchGuardians();
      }
    } catch {
      setErrorMsg('Error de conexión al compartir mascota.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (guardianId: string, guardianName: string) => {
    if (!pet?.id) return;
    if (!confirm(`¿Revocar el acceso de ${guardianName} a ${pet.name}?`)) return;

    try {
      const res = await fetch(`/api/pets/share?petId=${encodeURIComponent(pet.id)}&guardianId=${encodeURIComponent(guardianId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setGuardians((prev) => prev.filter((g) => g.id !== guardianId));
      }
    } catch (err) {
      console.warn('Error removing guardian:', err);
    }
  };

  if (!isOpen || !pet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-800 rounded-3xl p-6 w-full max-w-md shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE5] dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Compartir a {pet.name}
              </h3>
              <p className="text-[11px] text-[#606763] dark:text-stone-400">
                Co-tutores, parejas y familiares con acceso conjunto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Add co-tutor form */}
        <form onSubmit={handleShare} className="space-y-2.5">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            Vincular nuevo tutor (novia, familiar, cuidador)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ej. sofia o novia@correo.com"
              className="flex-1 px-3.5 py-2 bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
            <button
              type="submit"
              disabled={isSubmitting || !identifier.trim()}
              className="px-4 py-2 bg-[#3E5A4D] hover:bg-[#32493E] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Vinculando...' : 'Compartir'}
            </button>
          </div>
          <p className="text-[10px] text-stone-500">
            Ingresá el usuario o correo con el que tu novia o familiar se registró en PawCare.
          </p>
        </form>

        {/* Existing Guardians List */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Personas con acceso a {pet.name}:
          </span>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {/* Primary Owner */}
            {owner && (
              <div className="flex items-center justify-between p-2.5 bg-[#FAF8F5] dark:bg-stone-800 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400" />
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {owner.name}
                    </span>
                    <span className="text-[10px] text-stone-500 block">{owner.email}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Creador
                </span>
              </div>
            )}

            {/* Guardians */}
            {guardians.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60 rounded-xl text-xs"
              >
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {g.name}
                    </span>
                    <span className="text-[10px] text-stone-500 block">{g.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Co-tutor
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(g.id, g.name)}
                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                    title="Revocar acceso"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {!isLoading && guardians.length === 0 && (
              <p className="text-[11px] text-stone-400 italic py-2 text-center">
                Aún no compartiste esta mascota con nadie más.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
