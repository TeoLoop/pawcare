// src/components/dashboard/daily-doses.tsx
'use client';

import React, { useState } from 'react';
import { ScheduledDose, DoseStatus } from '@/types/medication';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Pill } from 'lucide-react';
import { DoseActionModal } from './dose-action-modal';
import { cn } from '@/lib/utils';

interface DailyDosesProps {
  doses: ScheduledDose[];
  onRefresh: () => void;
}

export function DailyDoses({ doses, onRefresh }: DailyDosesProps) {
  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);

  const getStatusBadge = (status: DoseStatus) => {
    switch (status) {
      case 'administered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E9EFEA] text-[#274033] border border-[#D3DFD7]">
            <CheckCircle2 className="w-3 h-3 text-[#357A57]" /> Administrada
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF5E6] text-[#8A5300] border border-[#FFE0B2]">
            <AlertTriangle className="w-3 h-3 text-[#C97A24]" /> Retrasada
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
            <Clock className="w-3 h-3 text-[#3B82F6]" /> Pendiente
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF2F0] text-[#C34A3E] border border-[#F8D7DA]">
            <XCircle className="w-3 h-3 text-[#C34A3E]" /> Omitida
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFECE5] text-[#606763]">
            Cancelada
          </span>
        );
      case 'scheduled':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#606763] border border-[#E5E1D6]">
            <Clock className="w-3 h-3 text-[#8E9490]" /> Programada
          </span>
        );
    }
  };

  if (doses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E1D6] p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#E9EFEA] text-[#3E5A4D] flex items-center justify-center mx-auto mb-3">
          <Pill className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-[#222624]">No hay tomas programadas para hoy</h3>
        <p className="text-xs text-[#606763] mt-1 max-w-sm mx-auto">
          Podés añadir un nuevo medicamento o verificar las pautas activas en la sección de Medicación.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-[#222624] tracking-tight">Tomas de Hoy</h3>
          <p className="text-xs text-[#606763]">Horarios según hora local de Montevideo</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#E5E1D6] text-[#606763]">
          {doses.length} {doses.length === 1 ? 'toma' : 'tomas'}
        </span>
      </div>

      <div className="divide-y divide-[#EFECE5]">
        {doses.map((dose) => {
          const isActionable = dose.status === 'scheduled' || dose.status === 'pending' || dose.status === 'delayed';

          return (
            <div
              key={dose.id}
              className={cn(
                'py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                dose.status === 'delayed' && 'bg-[#FFFDF9] -mx-2 px-2 rounded-xl'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#222624]">{dose.scheduled_time}</span>
                  <span className="text-[9px] text-[#606763] uppercase">hs</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#222624]">{dose.medication?.name}</h4>
                    {getStatusBadge(dose.status)}
                  </div>
                  <p className="text-xs text-[#606763] mt-0.5">
                    {dose.dose_amount} {dose.dose_unit} • {dose.medication?.presentation}
                  </p>
                  {dose.medication?.instructions && (
                    <p className="text-[11px] text-[#3E5A4D] font-medium mt-1">
                      {dose.medication.instructions}
                    </p>
                  )}
                  {dose.log?.reason_skipped && (
                    <p className="text-[11px] text-[#C34A3E] mt-0.5">
                      Motivo de omisión: {dose.log.reason_skipped}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {isActionable ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDose(dose)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    Registrar toma
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedDose(dose)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-[#606763] hover:bg-[#FAF8F5] transition-colors"
                  >
                    Ver detalle
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DoseActionModal
        dose={selectedDose}
        isOpen={Boolean(selectedDose)}
        onClose={() => setSelectedDose(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}
