// src/components/medication/medication-modal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Medication, FrequencyType } from '@/types/medication';
import { KiraRepository } from '@/lib/storage/repository';
import { generateScheduleDoses, getLocalDateString } from '@/lib/date-utils';
import { Plus, Trash2, Eye } from 'lucide-react';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  medicationToEdit?: Medication | null;
}

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' },
];

export function MedicationModal({
  isOpen,
  onClose,
  onSuccess,
  medicationToEdit,
}: MedicationModalProps) {
  const [name, setName] = useState('');
  const [activeSubstance, setActiveSubstance] = useState('');
  const [presentation, setPresentation] = useState('Comprimidos masticables');
  const [doseAmount, setDoseAmount] = useState<number>(1);
  const [doseUnit, setDoseUnit] = useState('comprimido');
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [timesOfDay, setTimesOfDay] = useState<string[]>(['08:00']);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [trackInventory, setTrackInventory] = useState(true);
  const [currentStock, setCurrentStock] = useState<number>(30);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (medicationToEdit) {
      setName(medicationToEdit.name);
      setActiveSubstance(medicationToEdit.active_substance || '');
      setPresentation(medicationToEdit.presentation);
      setDoseAmount(medicationToEdit.dose_amount);
      setDoseUnit(medicationToEdit.dose_unit);
      setInstructions(medicationToEdit.instructions || '');
      setNotes(medicationToEdit.notes || '');
      setTrackInventory(medicationToEdit.track_inventory);
      setCurrentStock(medicationToEdit.current_stock);
      setLowStockThreshold(medicationToEdit.low_stock_threshold);

      if (medicationToEdit.schedule) {
        setFrequencyType(medicationToEdit.schedule.frequency_type);
        setTimesOfDay(medicationToEdit.schedule.times_of_day);
        setSelectedDays(medicationToEdit.schedule.days_of_week || [1, 2, 3, 4, 5, 6, 0]);
        setStartDate(medicationToEdit.schedule.start_date);
        setEndDate(medicationToEdit.schedule.end_date || '');
      }
    } else {
      setName('');
      setActiveSubstance('');
      setPresentation('Comprimidos masticables');
      setDoseAmount(1);
      setDoseUnit('comprimido');
      setInstructions('');
      setNotes('');
      setFrequencyType('daily');
      setTimesOfDay(['08:00']);
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
      setStartDate(getLocalDateString());
      setEndDate('');
      setTrackInventory(true);
      setCurrentStock(30);
      setLowStockThreshold(5);
    }
  }, [medicationToEdit, isOpen]);

  // Generate live schedule preview
  const previewDoses = generateScheduleDoses(
    {
      frequency_type: frequencyType,
      times_of_day: timesOfDay,
      days_of_week: selectedDays,
      start_date: startDate || getLocalDateString(),
      end_date: endDate || undefined,
    },
    { previewDays: 5 }
  );

  const addTimeSlot = () => {
    setTimesOfDay([...timesOfDay, '20:00']);
  };

  const removeTimeSlot = (idx: number) => {
    if (timesOfDay.length > 1) {
      setTimesOfDay(timesOfDay.filter((_, i) => i !== idx));
    }
  };

  const updateTimeSlot = (idx: number, val: string) => {
    const updated = [...timesOfDay];
    updated[idx] = val;
    setTimesOfDay(updated);
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const pet = KiraRepository.getPet();

      KiraRepository.saveMedication(
        {
          id: medicationToEdit ? medicationToEdit.id : undefined,
          pet_id: pet.id,
          name: name.trim(),
          active_substance: activeSubstance.trim() || undefined,
          presentation,
          dose_amount: Number(doseAmount),
          dose_unit: doseUnit.trim(),
          instructions: instructions.trim() || undefined,
          notes: notes.trim() || undefined,
          is_active: medicationToEdit ? medicationToEdit.is_active : true,
          track_inventory: trackInventory,
          current_stock: trackInventory ? Number(currentStock) : 0,
          low_stock_threshold: trackInventory ? Number(lowStockThreshold) : 0,
        },
        {
          frequency_type: frequencyType,
          times_of_day: timesOfDay,
          days_of_week: frequencyType === 'specific_days' ? selectedDays : undefined,
          start_date: startDate,
          end_date: endDate || undefined,
          is_active: true,
        }
      );

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
      title={medicationToEdit ? 'Editar Medicamento' : `Añadir Medicamento para ${KiraRepository.getActivePet().name}`}
      description="Prescripción veterinaria, horarios y control de existencias"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Nombre comercial <span className="text-[#C34A3E]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Meloxicam, Condroprotector..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Principio activo (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Carprofeno, Cefalexina..."
              value={activeSubstance}
              onChange={(e) => setActiveSubstance(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        {/* Presentation, Dose & Unit */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Presentación
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Comprimidos masticables, Gotas"
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Dosis por toma <span className="text-[#C34A3E]">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={doseAmount}
              onChange={(e) => setDoseAmount(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] mb-1">
              Unidad de dosis <span className="text-[#C34A3E]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: comprimido, ml, mg, gotas"
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] mb-1">
            Instrucciones veterinarias
          </label>
          <input
            type="text"
            placeholder="Ej: Dar en el desayuno con alimento. No administrar en ayunas."
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] bg-white focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Schedule Configuration */}
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E5E1D6] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#222624]">Pauta y Horarios</span>
            <span className="text-[10px] text-[#606763]">Zona: America/Montevideo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#606763] mb-1">Frecuencia</label>
              <select
                value={frequencyType}
                onChange={(e) => setFrequencyType(e.target.value as FrequencyType)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
              >
                <option value="daily">Todos los días</option>
                <option value="specific_days">Días específicos de la semana</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#606763] mb-1">
                Fecha de inicio
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
              >
              </input>
            </div>
          </div>

          {/* Specific days buttons */}
          {frequencyType === 'specific_days' && (
            <div>
              <label className="block text-[11px] font-medium text-[#606763] mb-1.5">
                Días de administración
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = selectedDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#3E5A4D] text-white shadow-xs'
                          : 'bg-white border border-[#E5E1D6] text-[#606763]'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Times of day */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-[#606763]">Horarios de las tomas</label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3E5A4D] hover:underline"
              >
                <Plus className="w-3 h-3" /> Añadir horario
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {timesOfDay.map((time, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-white border border-[#E5E1D6] rounded-lg p-1">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(idx, e.target.value)}
                    className="text-xs px-1.5 py-0.5 focus:outline-none font-medium"
                  />
                  {timesOfDay.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(idx)}
                      className="p-1 text-[#C34A3E] hover:bg-[#FDF2F0] rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#606763] mb-1">
              Fecha de finalización (opcional para tratamientos con duración fija)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
            />
          </div>

          {/* Live Schedule Preview */}
          <div className="mt-3 pt-3 border-t border-[#EFECE5]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3E5A4D] mb-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>Vista previa de las próximas tomas que se generarán:</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-[#606763]">
              {previewDoses.length === 0 ? (
                <p className="italic">No se generarán tomas con la configuración actual.</p>
              ) : (
                previewDoses.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1 rounded-md border border-[#EFECE5]">
                    <span>{p.day_name} {p.scheduled_date}</span>
                    <strong className="text-[#222624]">{p.scheduled_time} hs</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Inventory Management Toggle & Stock */}
        <div className="p-3.5 rounded-xl bg-white border border-[#E5E1D6] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#222624]">Control de existencias e inventario</p>
              <p className="text-[10px] text-[#606763]">Descontar automáticamente con cada toma administrada</p>
            </div>
            <input
              type="checkbox"
              checked={trackInventory}
              onChange={(e) => setTrackInventory(e.target.checked)}
              className="w-4 h-4 accent-[#3E5A4D] rounded cursor-pointer"
            />
          </div>

          {trackInventory && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EFECE5]">
              <div>
                <label className="block text-[11px] font-medium text-[#606763] mb-1">
                  Cantidad actual disponible
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#606763] mb-1">
                  Aviso de reposición (umbral)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E1D6] bg-white focus:outline-none focus:ring-1 focus:ring-[#3E5A4D]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
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
            {medicationToEdit ? 'Guardar Cambios' : 'Crear Pauta de Medicación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
