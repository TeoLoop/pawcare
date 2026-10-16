// src/app/medicacion/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { Medication } from '@/types/medication';
import { StockForecast } from '@/types/inventory';
import { MedicationModal } from '@/components/medication/medication-modal';
import { RestockModal } from '@/components/medication/restock-modal';
import {
  Pill,
  Plus,
  Clock,
  Package,
  AlertTriangle,
  Play,
  Pause,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function MedicacionPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [forecasts, setForecasts] = useState<StockForecast[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medToEdit, setMedToEdit] = useState<Medication | null>(null);
  const [restockMed, setRestockMed] = useState<Medication | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const loadData = () => {
    const meds = KiraRepository.getMedications();
    setMedications([...meds]);
    setForecasts(KiraRepository.getStockForecasts());
  };

  useEffect(() => {
    loadData();

    const handlePetChange = () => {
      loadData();
    };
    const handleSynced = () => {
      loadData();
    };
    window.addEventListener('pawcare_pet_changed', handlePetChange);
    window.addEventListener('pawcare_synced', handleSynced);
    return () => {
      window.removeEventListener('pawcare_pet_changed', handlePetChange);
      window.removeEventListener('pawcare_synced', handleSynced);
    };
  }, []);

  const handleToggleActive = (med: Medication) => {
    KiraRepository.toggleMedicationStatus(med.id, !med.is_active);
    loadData();
  };

  const handleDelete = (med: Medication) => {
    if (confirm(`¿Estás seguro de eliminar "${med.name}"? Se conservará el historial de tomas pasadas pero se cancelarán las futuras.`)) {
      KiraRepository.deleteMedication(med.id);
      loadData();
    }
  };

  const filteredMeds = medications.filter((m) => {
    if (filter === 'active') return m.is_active;
    if (filter === 'paused') return !m.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#222624]">Pautas de Medicación</h1>
          <p className="text-xs text-[#606763] mt-0.5">
            Tratamientos activos, recetas veterinarias y control de inventario de Kira
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMedToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Añadir Medicamento
        </button>
      </div>

      {/* Stock Forecast & Depletion Warnings */}
      {forecasts.some((f) => f.isLowStock || f.needsRestockWarning) && (
        <div className="p-4 rounded-2xl bg-[#FFF8EE] border border-[#FFE7C4] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8A5300]">
            <AlertTriangle className="w-4 h-4 text-[#C97A24]" />
            <span>Avisos de reposición de existencias</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {forecasts
              .filter((f) => f.isLowStock || f.needsRestockWarning)
              .map((f) => (
                <div key={f.medicationId} className="bg-white p-3 rounded-xl border border-[#FFE7C4] text-xs">
                  <p className="font-semibold text-[#222624]">{f.medicationName}</p>
                  <p className="text-[#8A5300] mt-0.5">
                    Quedan: <strong>{f.currentStock} {f.unit}</strong>
                    {f.daysRemaining !== null && ` (~${f.daysRemaining} días)`}
                  </p>
                  {f.estimatedDepletionDate && (
                    <p className="text-[10px] text-[#606763] mt-0.5">
                      Agotamiento estimado: {f.estimatedDepletionDate}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E5E1D6] max-w-fit">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'all' ? 'bg-[#E9EFEA] text-[#274033] font-semibold' : 'text-[#606763] hover:text-[#222624]'
          }`}
        >
          Todos ({medications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'active' ? 'bg-[#E9EFEA] text-[#274033] font-semibold' : 'text-[#606763] hover:text-[#222624]'
          }`}
        >
          Activos ({medications.filter((m) => m.is_active).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('paused')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === 'paused' ? 'bg-[#E9EFEA] text-[#274033] font-semibold' : 'text-[#606763] hover:text-[#222624]'
          }`}
        >
          Pausados ({medications.filter((m) => !m.is_active).length})
        </button>
      </div>

      {/* Medication Cards List */}
      {filteredMeds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E1D6] p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#E9EFEA] text-[#3E5A4D] flex items-center justify-center mx-auto mb-3">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#222624]">No hay medicamentos para este filtro</h3>
          <p className="text-xs text-[#606763] mt-1 max-w-sm mx-auto">
            Registrá la prescripción médica de Kira con sus horarios y dosis exactas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => {
            const isLow = med.track_inventory && med.current_stock <= med.low_stock_threshold;

            return (
              <div
                key={med.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  med.is_active ? 'border-[#E5E1D6]' : 'border-[#EFECE5] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#222624]">{med.name}</h3>
                        {!med.is_active && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFECE5] text-[#606763]">
                            Pausado
                          </span>
                        )}
                      </div>
                      {med.active_substance && (
                        <p className="text-xs text-[#606763] font-medium">{med.active_substance}</p>
                      )}
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E9EFEA] text-[#274033] shrink-0">
                      {med.dose_amount} {med.dose_unit}
                    </span>
                  </div>

                  <p className="text-xs text-[#606763] mb-3">
                    Presentación: <span className="text-[#222624] font-medium">{med.presentation}</span>
                  </p>

                  {/* Schedule Details */}
                  {med.schedule && (
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] text-xs space-y-1.5 mb-3">
                      <div className="flex items-center gap-1.5 text-[#222624]">
                        <Clock className="w-3.5 h-3.5 text-[#3E5A4D]" />
                        <span>
                          Horarios: <strong>{med.schedule.times_of_day.join(', ')} hs</strong>
                        </span>
                      </div>
                      <div className="text-[#606763]">
                        Frecuencia: {med.schedule.frequency_type === 'daily' ? 'Diaria' : 'Días específicos'}
                        {med.schedule.end_date && ` • Hasta: ${med.schedule.end_date}`}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {med.instructions && (
                    <p className="text-xs text-[#3E5A4D] bg-[#F4F8F5] p-2.5 rounded-xl border border-[#D3DFD7] mb-3 font-medium">
                      📋 {med.instructions}
                    </p>
                  )}

                  {/* Inventory Info */}
                  {med.track_inventory && (
                    <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] mb-3">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#3E5A4D]" />
                        <span>
                          Stock: <strong className={isLow ? 'text-[#C34A3E]' : 'text-[#222624]'}>{med.current_stock} {med.dose_unit}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestockMed(med)}
                        className="text-xs font-semibold text-[#3E5A4D] hover:underline"
                      >
                        + Reponer stock
                      </button>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#EFECE5]">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(med)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#606763] hover:text-[#222624]"
                  >
                    {med.is_active ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pausar pauta
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Reanudar pauta
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMedToEdit(med);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[#606763] hover:text-[#222624] hover:bg-[#FAF8F5]"
                      title="Editar pauta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(med)}
                      className="p-1.5 rounded-lg text-[#C34A3E] hover:bg-[#FDF2F0]"
                      title="Eliminar medicamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Medication Create / Edit Modal */}
      <MedicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMedToEdit(null);
        }}
        onSuccess={loadData}
        medicationToEdit={medToEdit}
      />

      {/* Restock Modal */}
      <RestockModal
        medication={restockMed}
        isOpen={Boolean(restockMed)}
        onClose={() => setRestockMed(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
