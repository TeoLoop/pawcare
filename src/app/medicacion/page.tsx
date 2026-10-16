// src/app/medicacion/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDoseAmount } from '@/lib/utils';
import { KiraRepository } from '@/lib/storage/repository';
import { Medication, ScheduledDose } from '@/types/medication';
import { StockForecast } from '@/types/inventory';
import { MedicationModal } from '@/components/medication/medication-modal';
import { RestockModal } from '@/components/medication/restock-modal';
import { DoseActionModal } from '@/components/dashboard/dose-action-modal';
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
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function MedicacionPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [forecasts, setForecasts] = useState<StockForecast[]>([]);
  const [todayDoses, setTodayDoses] = useState<ScheduledDose[]>([]);
  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [medToEdit, setMedToEdit] = useState<Medication | null>(null);
  const [restockMed, setRestockMed] = useState<Medication | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all');

  const loadData = () => {
    const meds = KiraRepository.getMedications();
    setMedications([...meds]);
    setForecasts(KiraRepository.getStockForecasts());
    setTodayDoses(KiraRepository.getScheduledDoses());
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadData();
    });

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
            Pautas de Medicación
          </h1>
          <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
            Tratamientos activos, recetas veterinarias y control de existencias
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMedToEdit(null);
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Medicamento</span>
        </button>
      </div>

      {/* Stock Forecast & Depletion Warnings */}
      {forecasts.some((f) => f.isLowStock || f.needsRestockWarning) && (
        <div className="p-4 rounded-2xl bg-[#FFF8EE] dark:bg-amber-950/30 border border-[#FFE7C4] dark:border-amber-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#8A5300] dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-[#C97A24] dark:text-amber-400 shrink-0" />
            <span>Avisos de reposición de existencias</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {forecasts
              .filter((f) => f.isLowStock || f.needsRestockWarning)
              .map((f) => (
                <div
                  key={f.medicationId}
                  className="bg-white dark:bg-stone-900 p-3 rounded-xl border border-[#FFE7C4] dark:border-amber-900/40 text-xs shadow-2xs"
                >
                  <p className="font-semibold text-[#222624] dark:text-stone-100">{f.medicationName}</p>
                  <p className="text-[#8A5300] dark:text-amber-300 mt-0.5">
                    Quedan: <strong>{f.currentStock} {f.unit}</strong>
                    {f.daysRemaining !== null && ` (~${f.daysRemaining} días)`}
                  </p>
                  {f.estimatedDepletionDate && (
                    <p className="text-[10px] text-[#606763] dark:text-stone-400 mt-0.5">
                      Agotamiento estimado: {f.estimatedDepletionDate}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick link to Tomas de Hoy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F4F8F5] dark:bg-emerald-950/25 border border-[#D3DFD7] dark:border-emerald-900/40">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/50 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <CheckCircle2 className="w-5 h-5 text-[#357A57] dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#222624] dark:text-stone-100">
              ¿Dónde se marca el check de las tomas?
            </h4>
            <p className="text-[11px] sm:text-xs text-[#606763] dark:text-stone-400">
              Podés registrar tomas de hoy directamente en cada tarjeta abajo o desde la pantalla de Inicio en <strong>Tomas de Hoy</strong>.
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shrink-0 transition-colors shadow-2xs"
        >
          <span>Ir a Tomas de Hoy</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Filter Segmented Control */}
      <div className="w-full sm:w-fit grid grid-cols-3 sm:flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-800 shadow-2xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-xl text-xs text-center font-medium transition-all ${
            filter === 'all'
              ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-2xs'
              : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
          }`}
        >
          Todos ({medications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-3 py-2 rounded-xl text-xs text-center font-medium transition-all ${
            filter === 'active'
              ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-2xs'
              : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
          }`}
        >
          Activos ({medications.filter((m) => m.is_active).length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('paused')}
          className={`px-3 py-2 rounded-xl text-xs text-center font-medium transition-all ${
            filter === 'paused'
              ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold shadow-2xs'
              : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
          }`}
        >
          Pausados ({medications.filter((m) => !m.is_active).length})
        </button>
      </div>

      {/* Medication Cards List */}
      {filteredMeds.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Pill className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#222624] dark:text-stone-100">
            No hay medicamentos para este filtro
          </h3>
          <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Registrá la prescripción médica con sus horarios y dosis exactas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => {
            const isLow = med.track_inventory && med.current_stock <= med.low_stock_threshold;

            return (
              <div
                key={med.id}
                className={`bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
                  med.is_active
                    ? 'border-[#E5E1D6] dark:border-stone-800'
                    : 'border-[#EFECE5] dark:border-stone-850 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#222624] dark:text-stone-100">{med.name}</h3>
                        {!med.is_active && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFECE5] dark:bg-stone-800 text-[#606763] dark:text-stone-400">
                            Pausado
                          </span>
                        )}
                      </div>
                      {med.active_substance && (
                        <p className="text-xs text-[#606763] dark:text-stone-400 font-medium">{med.active_substance}</p>
                      )}
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:border dark:border-emerald-800 dark:text-emerald-300 shrink-0">
                      {formatDoseAmount(med.dose_amount)} {med.dose_unit}
                    </span>
                  </div>

                  <p className="text-xs text-[#606763] dark:text-stone-400 mb-3">
                    Presentación: <span className="text-[#222624] dark:text-stone-200 font-medium">{med.presentation}</span>
                  </p>

                  {/* Schedule Details */}
                  {med.schedule && (
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#EFECE5] dark:border-stone-700/80 text-xs space-y-1.5 mb-3">
                      <div className="flex items-center gap-1.5 text-[#222624] dark:text-stone-200">
                        <Clock className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />
                        <span>
                          Horarios: <strong>{med.schedule.times_of_day.join(', ')} hs</strong>
                        </span>
                      </div>
                      <div className="text-[#606763] dark:text-stone-400">
                        Frecuencia: {med.schedule.frequency_type === 'daily' ? 'Diaria' : 'Días específicos'}
                        {med.schedule.end_date && ` • Hasta: ${med.schedule.end_date}`}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {med.instructions && (
                    <p className="text-xs text-[#3E5A4D] dark:text-emerald-300 bg-[#F4F8F5] dark:bg-emerald-950/30 p-2.5 rounded-xl border border-[#D3DFD7] dark:border-emerald-900/40 mb-3 font-medium">
                      📋 {med.instructions}
                    </p>
                  )}

                  {/* Inventory Info */}
                  {med.track_inventory && (
                    <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#EFECE5] dark:border-stone-700/80 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />
                        <span className="dark:text-stone-300">
                          Stock:{' '}
                          <strong className={isLow ? 'text-[#C34A3E] dark:text-rose-400' : 'text-[#222624] dark:text-stone-100'}>
                            {med.current_stock} {med.dose_unit}
                          </strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRestockMed(med)}
                        className="text-xs font-semibold text-[#3E5A4D] dark:text-emerald-400 hover:underline"
                      >
                        + Reponer stock
                      </button>
                    </div>
                  )}

                  {/* Today's Scheduled Dose Quick Action */}
                  {(() => {
                    const medDosesToday = todayDoses.filter((d) => d.medication_id === med.id);
                    if (medDosesToday.length === 0) return null;
                    return (
                      <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#EFECE5] dark:border-stone-700/80 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#222624] dark:text-stone-200">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
                            Tomas de hoy
                          </span>
                          <span className="text-[11px] text-[#606763] dark:text-stone-400 font-normal">
                            {medDosesToday.length === 1 ? '1 horario' : `${medDosesToday.length} horarios`}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {medDosesToday.map((dose) => {
                            const isActionable = dose.status === 'scheduled' || dose.status === 'pending' || dose.status === 'delayed';
                            return (
                              <div key={dose.id} className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[#222624] dark:text-stone-100">{dose.scheduled_time} hs</span>
                                  {dose.status === 'delayed' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF5E6] text-[#8A5300] border border-[#FFE0B2]">
                                      Retrasada
                                    </span>
                                  )}
                                </div>
                                {dose.status === 'administered' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Administrada
                                  </span>
                                ) : isActionable ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDose(dose)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-[11px] font-semibold transition-all shadow-2xs"
                                  >
                                    Registrar toma
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-[#606763] dark:text-stone-400 capitalize">
                                    {dose.status}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#EFECE5] dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(med)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:text-[#222624] dark:hover:text-stone-100 px-2.5 py-1.5 rounded-lg hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors"
                  >
                    {med.is_active ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> <span>Reanudar</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMedToEdit(med);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors"
                      title="Editar pauta"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(med)}
                      className="p-2 rounded-xl text-[#C34A3E] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 transition-colors"
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

      {/* Dose Action Modal */}
      <DoseActionModal
        dose={selectedDose}
        isOpen={Boolean(selectedDose)}
        onClose={() => setSelectedDose(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
