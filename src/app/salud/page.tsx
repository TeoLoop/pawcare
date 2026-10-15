// src/app/salud/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { SymptomFormModal } from '@/components/health/symptom-form-modal';
import { VetVisitModal } from '@/components/veterinary/vet-visit-modal';
import { generateVeterinarySummaryPdf } from '@/lib/pdf/export-summary';
import { formatInMontevideo } from '@/lib/date-utils';
import {
  Activity,
  FileText,
  Download,
  Plus,
  AlertTriangle,
  Stethoscope,
  Trash2,
} from 'lucide-react';

export default function SaludPage() {
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isVetVisitModalOpen, setIsVetVisitModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'vet' | 'documents'>('symptoms');

  const loadData = () => {
    setSymptoms(KiraRepository.getSymptomLogs());
    setVetVisits(KiraRepository.getVetVisits());
    setDocuments(KiraRepository.getDocuments());
  };

  useEffect(() => {
    loadData();

    const handlePetChange = () => {
      loadData();
    };
    window.addEventListener('pawcare_pet_changed', handlePetChange);
    return () => window.removeEventListener('pawcare_pet_changed', handlePetChange);
  }, []);

  const handleDownloadPdf = () => {
    const doc = generateVeterinarySummaryPdf();
    doc.save(`PawCare-Resumen-Salud-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleDeleteVetVisit = (id: string) => {
    if (confirm('¿Eliminar este registro de consulta veterinaria?')) {
      KiraRepository.deleteVetVisit(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and PDF export button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#222624]">Salud & Veterinaria</h1>
          <p className="text-xs text-[#606763] mt-0.5">
            Diario de bienestar en el hogar, consultas veterinarias y documentación clínica
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E5E1D6] hover:bg-[#FAF8F5] text-xs font-semibold text-[#222624] shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-[#3E5A4D]" />
          Descargar Resumen PDF para Veterinario
        </button>
      </div>

      {/* Clinical Warning Banner */}
      <div className="p-4 rounded-2xl bg-[#FFF8EE] border border-[#FFE7C4] text-xs text-[#8A5300] flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#C97A24] mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#222624]">
            Seguridad Clínica y Rol del Cuidador
          </p>
          <p className="leading-relaxed">
            Las escalas de dolor y registros de movilidad son apreciaciones del cuidador para acompañar la evolución diaria de Kira. No constituyen diagnósticos veterinarios. Ante dolor agudo, dificultad respiratoria, incapacidad para pararse o empeoramiento súbito, comunicate con la veterinaria sin demora.
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E5E1D6] pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition-all -mb-[5px] ${
              activeTab === 'symptoms'
                ? 'border-[#3E5A4D] text-[#3E5A4D]'
                : 'border-transparent text-[#606763] hover:text-[#222624]'
            }`}
          >
            <Activity className="w-4 h-4" />
            Diario de Síntomas ({symptoms.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vet')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition-all -mb-[5px] ${
              activeTab === 'vet'
                ? 'border-[#3E5A4D] text-[#3E5A4D]'
                : 'border-transparent text-[#606763] hover:text-[#222624]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            Consultas Veterinarias ({vetVisits.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-semibold transition-all -mb-[5px] ${
              activeTab === 'documents'
                ? 'border-[#3E5A4D] text-[#3E5A4D]'
                : 'border-transparent text-[#606763] hover:text-[#222624]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos y Recetas ({documents.length})
          </button>
        </div>

        {activeTab === 'symptoms' && (
          <button
            type="button"
            onClick={() => setIsSymptomModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Nuevo Registro
          </button>
        )}

        {activeTab === 'vet' && (
          <button
            type="button"
            onClick={() => setIsVetVisitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Consulta
          </button>
        )}
      </div>

      {/* Tab 1: Symptoms Logs */}
      {activeTab === 'symptoms' && (
        <div className="space-y-4">
          {symptoms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E1D6] p-10 text-center shadow-xs">
              <Activity className="w-8 h-8 text-[#8E9490] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#222624]">Aún no hay registros de salud</p>
              <p className="text-xs text-[#606763] mt-1">
                Registrá diariamente el estado de ánimo, dolor y movilidad para detectar patrones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {symptoms.map((sym) => (
                <div key={sym.id} className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#606763]">
                      {formatInMontevideo(sym.logged_at, "EEEE d 'de' MMMM, HH:mm")} hs
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        sym.pain_level <= 3
                          ? 'bg-[#E9EFEA] text-[#274033]'
                          : sym.pain_level <= 6
                          ? 'bg-[#FFF5E6] text-[#8A5300]'
                          : 'bg-[#FDF2F0] text-[#C34A3E]'
                      }`}
                    >
                      Dolor: {sym.pain_level}/10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#606763] bg-[#FAF8F5] p-3 rounded-xl border border-[#EFECE5]">
                    <div>
                      <span className="font-medium text-[#222624]">Movilidad:</span>{' '}
                      {sym.mobility === 'normal'
                        ? 'Normal'
                        : sym.mobility === 'somewhat_limited'
                        ? 'Algo limitada'
                        : 'Muy limitada'}
                    </div>
                    <div>
                      <span className="font-medium text-[#222624]">Marcha:</span>{' '}
                      {sym.walking_ability === 'normal'
                        ? 'Normal'
                        : sym.walking_ability === 'limping'
                        ? 'Cojera / Claudicación'
                        : sym.walking_ability === 'needs_assistance'
                        ? 'Con ayuda'
                        : 'Imposibilitada'}
                    </div>
                    <div>
                      <span className="font-medium text-[#222624]">Apetito:</span>{' '}
                      {sym.appetite === 'normal'
                        ? 'Normal'
                        : sym.appetite === 'increased'
                        ? 'Aumentado'
                        : sym.appetite === 'decreased'
                        ? 'Disminuido'
                        : 'Nulo'}
                    </div>
                    <div>
                      <span className="font-medium text-[#222624]">Ánimo:</span>{' '}
                      {sym.behavior === 'calm'
                        ? 'Tranquila'
                        : sym.behavior === 'playful'
                        ? 'Juguetona'
                        : sym.behavior === 'lethargic'
                        ? 'Letárgica'
                        : sym.behavior === 'anxious'
                        ? 'Ansiosa'
                        : 'Inquieta'}
                    </div>
                  </div>

                  {sym.paw_support && (
                    <p className="text-xs text-[#222624]">
                      <strong>Apoyo de patas:</strong> {sym.paw_support}
                    </p>
                  )}

                  {sym.notes && (
                    <p className="text-xs text-[#606763] italic bg-white p-2.5 rounded-lg border border-[#EFECE5]">
                      &ldquo;{sym.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Vet Visits */}
      {activeTab === 'vet' && (
        <div className="space-y-4">
          {vetVisits.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E5E1D6] p-10 text-center shadow-xs">
              <Stethoscope className="w-8 h-8 text-[#8E9490] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#222624]">Sin consultas veterinarias registradas</p>
              <p className="text-xs text-[#606763] mt-1">
                Anotá las visitas a la clínica, diagnósticos profesionales y fechas de control.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vetVisits.map((visit) => (
                <div key={visit.id} className="bg-white rounded-2xl border border-[#E5E1D6] p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#222624]">{visit.reason}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E9EFEA] text-[#274033]">
                          {formatInMontevideo(visit.visit_date, 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-[#606763] mt-0.5">
                        {visit.clinic_name || 'Clínica Veterinaria'} • {visit.veterinarian_name || 'Veterinario'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVetVisit(visit.id)}
                      className="p-1.5 text-[#C34A3E] hover:bg-[#FDF2F0] rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {visit.diagnosis && (
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFECE5] text-xs">
                      <span className="font-bold text-[#3E5A4D]">Diagnóstico profesional:</span>{' '}
                      <span className="text-[#222624]">{visit.diagnosis}</span>
                    </div>
                  )}

                  {visit.professional_recommendations && (
                    <div className="p-3 rounded-xl bg-white border border-[#E5E1D6] text-xs text-[#606763]">
                      <strong className="text-[#222624]">Recomendaciones clínicas:</strong>{' '}
                      {visit.professional_recommendations}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#606763] pt-2 border-t border-[#EFECE5]">
                    {visit.next_appointment_at ? (
                      <span className="text-[#3E5A4D] font-medium">
                        Próximo control: {formatInMontevideo(visit.next_appointment_at, 'dd/MM/yyyy HH:mm')} hs
                      </span>
                    ) : (
                      <span>Sin próxima fecha agendada</span>
                    )}

                    {visit.cost && <span>Costo: ${visit.cost} UYU</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Medical Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-[#E5E1D6] p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] text-[#3E5A4D] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#222624]">{doc.title}</h4>
                    <p className="text-[11px] text-[#606763]">{doc.document_date} • {doc.document_type}</p>
                    {doc.notes && <p className="text-[10px] text-[#606763] italic mt-0.5">{doc.notes}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <SymptomFormModal
        isOpen={isSymptomModalOpen}
        onClose={() => setIsSymptomModalOpen(false)}
        onSuccess={loadData}
      />

      <VetVisitModal
        isOpen={isVetVisitModalOpen}
        onClose={() => setIsVetVisitModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
