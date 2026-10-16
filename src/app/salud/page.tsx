// src/app/salud/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { SymptomFormModal } from '@/components/health/symptom-form-modal';
import { VetVisitModal } from '@/components/veterinary/vet-visit-modal';
import { DocumentModal } from '@/components/veterinary/document-modal';
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
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'vet' | 'documents'>('symptoms');

  const loadData = () => {
    setSymptoms(KiraRepository.getSymptomLogs());
    setVetVisits(KiraRepository.getVetVisits());
    setDocuments(KiraRepository.getDocuments());
  };

  const handleDeleteDocument = (id: string, title: string) => {
    if (confirm(`¿Estás seguro de eliminar el documento "${title}"?`)) {
      KiraRepository.deleteDocument(id);
      loadData();
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
            Salud & Veterinaria
          </h1>
          <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
            Diario de bienestar en el hogar, consultas veterinarias y documentación clínica
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-[#E5E1D6] dark:border-stone-800 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 text-xs font-semibold text-[#222624] dark:text-stone-200 shadow-xs transition-colors shrink-0"
        >
          <Download className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400" />
          <span>Descargar Resumen PDF</span>
        </button>
      </div>

      {/* Clinical Warning Banner */}
      <div className="p-4 rounded-2xl bg-[#FFF8EE] dark:bg-amber-950/30 border border-[#FFE7C4] dark:border-amber-900/50 text-xs text-[#8A5300] dark:text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#C97A24] dark:text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-[#222624] dark:text-stone-100">
            Seguridad Clínica y Rol del Cuidador
          </p>
          <p className="leading-relaxed dark:text-stone-300">
            Las escalas de dolor y registros de movilidad son apreciaciones del cuidador para acompañar la evolución diaria de tu mascota. No constituyen diagnósticos veterinarios. Ante dolor agudo, dificultad respiratoria, incapacidad para pararse o empeoramiento súbito, comunicate con la veterinaria sin demora.
          </p>
        </div>
      </div>

      {/* Section Tabs & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1D6] dark:border-stone-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 -mb-1">
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'symptoms'
                ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diario de Síntomas ({symptoms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'vet'
                ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Consultas ({vetVisits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'documents'
                ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documentos ({documents.length})</span>
          </button>
        </div>

        {activeTab === 'symptoms' && (
          <button
            type="button"
            onClick={() => setIsSymptomModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Registro</span>
          </button>
        )}

        {activeTab === 'vet' && (
          <button
            type="button"
            onClick={() => setIsVetVisitModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Consulta</span>
          </button>
        )}

        {activeTab === 'documents' && (
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Subir Documento (PDF / Word)</span>
          </button>
        )}
      </div>

      {/* Tab 1: Symptoms Logs */}
      {activeTab === 'symptoms' && (
        <div className="space-y-4">
          {symptoms.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
              <Activity className="w-8 h-8 text-[#8E9490] dark:text-stone-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#222624] dark:text-stone-100">Aún no hay registros de salud</p>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Registrá diariamente el estado de ánimo, dolor y movilidad para detectar patrones y compartir con tu veterinario.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {symptoms.map((sym) => (
                <div
                  key={sym.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#606763] dark:text-stone-400">
                      {formatInMontevideo(sym.logged_at, "EEEE d 'de' MMMM, HH:mm")} hs
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        sym.pain_level <= 3
                          ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:text-emerald-300'
                          : sym.pain_level <= 6
                          ? 'bg-[#FFF5E6] text-[#8A5300] dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-[#FDF2F0] text-[#C34A3E] dark:bg-rose-950/50 dark:text-rose-300'
                      }`}
                    >
                      Dolor: {sym.pain_level}/10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#606763] dark:text-stone-400 bg-[#FAF8F5] dark:bg-stone-800/60 p-3 rounded-xl border border-[#EFECE5] dark:border-stone-700/80">
                    <div>
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Movilidad:</span>{' '}
                      {sym.mobility === 'normal'
                        ? 'Normal'
                        : sym.mobility === 'somewhat_limited'
                        ? 'Algo limitada'
                        : 'Muy limitada'}
                    </div>
                    <div>
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Marcha:</span>{' '}
                      {sym.walking_ability === 'normal'
                        ? 'Normal'
                        : sym.walking_ability === 'limping'
                        ? 'Cojera'
                        : sym.walking_ability === 'needs_assistance'
                        ? 'Con ayuda'
                        : 'Imposibilitada'}
                    </div>
                    <div>
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Apetito:</span>{' '}
                      {sym.appetite === 'normal'
                        ? 'Normal'
                        : sym.appetite === 'increased'
                        ? 'Aumentado'
                        : sym.appetite === 'decreased'
                        ? 'Disminuido'
                        : 'Nulo'}
                    </div>
                    <div>
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Ánimo:</span>{' '}
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
                    <p className="text-xs text-[#222624] dark:text-stone-200">
                      <strong>Apoyo de patas:</strong> {sym.paw_support}
                    </p>
                  )}

                  {sym.notes && (
                    <p className="text-xs text-[#606763] dark:text-stone-400 italic bg-[#FAF8F5] dark:bg-stone-800/50 p-2.5 rounded-xl border border-[#EFECE5] dark:border-stone-700/70">
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
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
              <Stethoscope className="w-8 h-8 text-[#8E9490] dark:text-stone-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#222624] dark:text-stone-100">Sin consultas registradas</p>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Anotá las visitas a la clínica, diagnósticos profesionales y fechas de control.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vetVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#222624] dark:text-stone-100">{visit.reason}</h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/50 dark:text-emerald-300">
                          {formatInMontevideo(visit.visit_date, 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
                        {visit.clinic_name || 'Clínica Veterinaria'} • {visit.veterinarian_name || 'Veterinario'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVetVisit(visit.id)}
                      className="p-1.5 text-[#C34A3E] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {visit.diagnosis && (
                    <div className="p-3 rounded-xl bg-[#FAF8F5] dark:bg-stone-800/60 border border-[#EFECE5] dark:border-stone-700/80 text-xs">
                      <span className="font-bold text-[#3E5A4D] dark:text-emerald-400">Diagnóstico profesional:</span>{' '}
                      <span className="text-[#222624] dark:text-stone-200">{visit.diagnosis}</span>
                    </div>
                  )}

                  {visit.professional_recommendations && (
                    <div className="p-3 rounded-xl bg-white dark:bg-stone-850 border border-[#E5E1D6] dark:border-stone-700 text-xs text-[#606763] dark:text-stone-300">
                      <strong className="text-[#222624] dark:text-stone-100">Recomendaciones clínicas:</strong>{' '}
                      {visit.professional_recommendations}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#606763] dark:text-stone-400 pt-2 border-t border-[#EFECE5] dark:border-stone-800">
                    {visit.next_appointment_at ? (
                      <span className="text-[#3E5A4D] dark:text-emerald-400 font-medium">
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
          {documents.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#222624] dark:text-stone-100">
                Aún no hay documentos médicos guardados
              </h3>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Subí recetas médicas, análisis clínicos, radiografías o informes en <strong>PDF o Word (DOCX)</strong> para tener todo el historial clínico en un solo lugar.
              </p>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir primer documento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => {
                const ext = doc.file_name ? doc.file_name.split('.').pop()?.toLowerCase() || '' : '';
                const isPdf = ext === 'pdf';
                const isWord = ext === 'doc' || ext === 'docx';
                const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext);

                const getDocTypeLabel = (type: string) => {
                  switch (type) {
                    case 'prescription': return 'Receta médica';
                    case 'lab_result': return 'Resultado de laboratorio';
                    case 'xray': return 'Estudios / Imágenes';
                    case 'discharge_summary': return 'Alta médica / Epicrisis';
                    default: return 'Otro documento';
                  }
                };

                return (
                  <div
                    key={doc.id}
                    className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 hover:border-[#3E5A4D]/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isPdf
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : isWord
                                ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : isImage
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                            }`}
                          >
                            <span className="uppercase text-[10px] tracking-tight">{ext || 'DOC'}</span>
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#222624] dark:text-stone-100 truncate">
                              {doc.title}
                            </h4>
                            <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
                              {getDocTypeLabel(doc.document_type)}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-[#606763] dark:text-stone-400 px-2 py-0.5 rounded-md bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-700 shrink-0">
                          {doc.document_date ? formatInMontevideo(doc.document_date, 'dd/MM/yyyy') : 'Sin fecha'}
                        </span>
                      </div>

                      {doc.notes && (
                        <p className="text-xs text-[#606763] dark:text-stone-400 bg-[#FAF8F5] dark:bg-stone-850 p-2.5 rounded-xl border border-[#EFECE5] dark:border-stone-750 mb-3">
                          {doc.notes}
                        </p>
                      )}

                      <p className="text-[11px] text-[#8E9490] dark:text-stone-400 truncate mb-1">
                        Archivo: <span className="font-medium text-[#222624] dark:text-stone-300">{doc.file_name}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[#EFECE5] dark:border-stone-800">
                      <a
                        href={doc.file_url}
                        download={doc.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E9EFEA] hover:bg-[#D8E6DB] text-[#274033] dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 text-xs font-semibold transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar / Abrir</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        className="p-1.5 rounded-lg text-[#C34A3E] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 transition-colors"
                        title="Eliminar documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
