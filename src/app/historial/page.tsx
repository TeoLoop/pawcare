// src/app/historial/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { DoseLog, Medication } from '@/types/medication';
import { CorrectionModal } from '@/components/history/correction-modal';
import { formatInMontevideo } from '@/lib/date-utils';
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Edit2,
} from 'lucide-react';

export default function HistorialPage() {
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [selectedMed, setSelectedMed] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [correctionLog, setCorrectionLog] = useState<DoseLog | null>(null);

  const loadData = React.useCallback(() => {
    const meds = KiraRepository.getMedications();
    setMedications(meds);

    const history = KiraRepository.getDoseHistory({
      medicationId: selectedMed !== 'all' ? selectedMed : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    });
    setLogs(history);
  }, [selectedMed, selectedStatus]);

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
  }, [loadData]);

  const totalLogs = logs.length;
  const administeredCount = logs.filter((l) => l.status === 'administered').length;
  const skippedCount = logs.filter((l) => l.status === 'skipped').length;
  const adherenceRate = totalLogs > 0 ? Math.round((administeredCount / totalLogs) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
          Historial de Medicación
        </h1>
        <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
          Auditoría de tomas administradas, omisiones y métodos de confirmación
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3 sm:p-4 shadow-xs">
          <p className="text-[11px] sm:text-xs text-[#606763] dark:text-stone-400 font-medium truncate">Tomas registradas</p>
          <p className="text-lg sm:text-xl font-bold text-[#222624] dark:text-stone-100 tracking-tight mt-1">{totalLogs}</p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 truncate">Total en registro</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3 sm:p-4 shadow-xs">
          <p className="text-[11px] sm:text-xs text-[#606763] dark:text-stone-400 font-medium truncate">Administradas</p>
          <p className="text-lg sm:text-xl font-bold text-[#357A57] dark:text-emerald-400 tracking-tight mt-1">{administeredCount}</p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 truncate">{adherenceRate}% adherencia</p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3 sm:p-4 shadow-xs">
          <p className="text-[11px] sm:text-xs text-[#606763] dark:text-stone-400 font-medium truncate">Omitidas</p>
          <p className="text-lg sm:text-xl font-bold text-[#C34A3E] dark:text-rose-400 tracking-tight mt-1">{skippedCount}</p>
          <p className="text-[10px] sm:text-[11px] text-[#606763] dark:text-stone-400 truncate">Con causa</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-[#E5E1D6] dark:border-stone-800 p-3.5 sm:p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-3 flex items-center gap-2 text-xs font-semibold text-[#606763] dark:text-stone-300">
          <Filter className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400 shrink-0" />
          <span>Filtrar historial:</span>
        </div>

        <div className="sm:col-span-5">
          <select
            value={selectedMed}
            onChange={(e) => setSelectedMed(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#222624] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
          >
            <option value="all">Todos los medicamentos</option>
            {medications.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-800 text-[#222624] dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
          >
            <option value="all">Todos los estados</option>
            <option value="administered">Administradas</option>
            <option value="skipped">Omitidas</option>
          </select>
        </div>
      </div>

      {/* History Log List */}
      {logs.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#222624] dark:text-stone-100">Sin registros coincidentes</h3>
          <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
            A medida que confirmes o marques tomas en la pantalla de inicio o vía WhatsApp, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 shadow-xs overflow-hidden">
          <div className="divide-y divide-[#EFECE5] dark:divide-stone-800">
            {logs.map((log) => {
              const isAdministered = log.status === 'administered';

              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-[#FAF8F5]/50 dark:hover:bg-stone-800/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isAdministered
                            ? 'bg-[#E9EFEA] text-[#357A57] dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-[#FDF2F0] text-[#C34A3E] dark:bg-rose-950/50 dark:text-rose-300'
                        }`}
                      >
                        {isAdministered ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h4 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                            {log.medication?.name || 'Medicamento'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isAdministered
                                ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-[#FDF2F0] text-[#C34A3E] dark:bg-rose-950/50 dark:text-rose-300'
                            }`}
                          >
                            {isAdministered ? 'Administrada' : 'Omitida'}
                          </span>
                          <span className="text-[10px] text-[#606763] dark:text-stone-400 bg-[#FAF8F5] dark:bg-stone-800 px-2 py-0.5 rounded-md border border-[#EFECE5] dark:border-stone-700">
                            Vía {log.registered_by === 'whatsapp_link' ? 'WhatsApp Link' : log.registered_by === 'whatsapp_webhook' ? 'WhatsApp Chat' : 'Manual'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#606763] dark:text-stone-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#3E5A4D] dark:text-emerald-400" />
                            Hora programada: {formatInMontevideo(log.scheduled_time, 'HH:mm')} hs
                          </span>
                          <span>•</span>
                          <span>
                            Hora real: {formatInMontevideo(log.administered_at, 'dd/MM/yyyy HH:mm')} hs
                          </span>
                        </div>

                        {log.reason_skipped && (
                          <p className="text-xs text-[#C34A3E] dark:text-rose-400 mt-1.5 font-medium">
                            Motivo de omisión: {log.reason_skipped}
                          </p>
                        )}

                        {log.notes && (
                          <p className="text-xs text-[#222624] dark:text-stone-300 mt-1 bg-[#FAF8F5] dark:bg-stone-800/60 p-2 rounded-lg border border-[#EFECE5] dark:border-stone-700/80">
                            {log.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Correction Action */}
                    <button
                      type="button"
                      onClick={() => setCorrectionLog(log)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs text-[#606763] dark:text-stone-300 hover:text-[#222624] dark:hover:text-stone-100 px-3 py-2 sm:py-1.5 rounded-xl border border-[#E5E1D6] dark:border-stone-700 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Corregir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audited Correction Modal */}
      <CorrectionModal
        log={correctionLog}
        isOpen={Boolean(correctionLog)}
        onClose={() => setCorrectionLog(null)}
        onSuccess={loadData}
      />
    </div>
  );
}
