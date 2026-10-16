// src/app/salud/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KiraRepository } from '@/lib/storage/repository';
import { SymptomLog, WeightLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { Pet } from '@/types/medication';
import { SymptomFormModal } from '@/components/health/symptom-form-modal';
import { VetVisitModal } from '@/components/veterinary/vet-visit-modal';
import { DocumentModal } from '@/components/veterinary/document-modal';
import { WeightModal } from '@/components/health/weight-modal';
import { generateVeterinarySummaryPdf } from '@/lib/pdf/export-summary';
import { formatInMontevideo, getLocalDateString } from '@/lib/date-utils';
import {
  Activity,
  FileText,
  Download,
  Plus,
  AlertTriangle,
  Stethoscope,
  Trash2,
  Scale,
  Calendar,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Camera,
} from 'lucide-react';

export default function SaludPage() {
  const [symptoms, setSymptoms] = useState<SymptomLog[]>([]);
  const [vetVisits, setVetVisits] = useState<VetVisit[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);

  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isVetVisitModalOpen, setIsVetVisitModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'symptoms' | 'vet' | 'documents' | 'weight'>('symptoms');
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const loadData = () => {
    setSymptoms(KiraRepository.getSymptomLogs());
    setVetVisits(KiraRepository.getVetVisits());
    setDocuments(KiraRepository.getDocuments());
    setWeightLogs(KiraRepository.getWeightLogs());
    setActivePet(KiraRepository.getActivePet());
  };

  const handleDeleteDocument = (id: string, title: string) => {
    if (confirm(`¿Estás seguro de eliminar el documento "${title}"?`)) {
      KiraRepository.deleteDocument(id);
      loadData();
    }
  };

  const handleDeleteVetVisit = (id: string) => {
    if (confirm('¿Eliminar este registro de consulta veterinaria?')) {
      KiraRepository.deleteVetVisit(id);
      loadData();
    }
  };

  const handleDeleteWeightLog = (id: string) => {
    if (confirm('¿Eliminar este registro de peso?')) {
      KiraRepository.deleteWeightLog(id);
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

  // Group documents by date
  const groupedDocuments = useMemo(() => {
    const map = new Map<string, MedicalDocument[]>();
    for (const doc of documents) {
      const dateKey = doc.document_date || 'Sin fecha';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(doc);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [documents]);

  const formatGroupDate = (dateStr: string) => {
    if (dateStr === 'Sin fecha') return 'Sin fecha registrada';
    const todayStr = getLocalDateString();
    if (dateStr === todayStr) {
      return `Hoy, ${formatInMontevideo(dateStr, "d 'de' MMMM yyyy")}`;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    if (dateStr === yesterdayStr) {
      return `Ayer, ${formatInMontevideo(dateStr, "d 'de' MMMM yyyy")}`;
    }
    return formatInMontevideo(dateStr, "EEEE d 'de' MMMM yyyy");
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'prescription': return 'Receta médica';
      case 'lab_result': return 'Resultado de laboratorio';
      case 'xray': return 'Foto clínica / Estudios / Imágenes';
      case 'discharge_summary': return 'Alta médica / Epicrisis';
      default: return 'Otro documento / Foto';
    }
  };

  // Weight Trend calculation
  const weightDiff = useMemo(() => {
    if (weightLogs.length >= 2) {
      return Number((weightLogs[0].weight_kg - weightLogs[1].weight_kg).toFixed(2));
    }
    return 0;
  }, [weightLogs]);

  const weightDiffString = useMemo(() => {
    if (weightLogs.length < 2) return 'Primer registro';
    if (weightDiff > 0) return `+${weightDiff} kg`;
    if (weightDiff < 0) return `${weightDiff} kg`;
    return 'Estable (0.0 kg)';
  }, [weightLogs, weightDiff]);

  return (
    <div className="space-y-6">
      {/* Header and PDF export button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#222624] dark:text-stone-100">
            Salud & Veterinaria
          </h1>
          <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5">
            Diario de bienestar en el hogar, control de peso, consultas veterinarias y documentación clínica
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
            <span>Documentos y Fotos ({documents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weight')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'weight'
                ? 'bg-[#E9EFEA] text-[#274033] dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                : 'text-[#606763] dark:text-stone-400 hover:text-[#222624] dark:hover:text-stone-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Control de Peso ({weightLogs.length})</span>
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
            <span>Subir Documento o Foto</span>
          </button>
        )}

        {activeTab === 'weight' && (
          <button
            type="button"
            onClick={() => setIsWeightModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Peso</span>
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
                        ? 'Tranquilo'
                        : sym.behavior === 'playful'
                        ? 'Juguetón'
                        : sym.behavior === 'lethargic'
                        ? 'Letárgico'
                        : sym.behavior === 'anxious'
                        ? 'Ansioso'
                        : 'Inquieto'}
                    </div>
                  </div>

                  {sym.notes && (
                    <p className="text-xs text-[#222624] dark:text-stone-300 bg-[#FAF8F5] dark:bg-stone-800 p-2.5 rounded-xl border border-[#EFECE5] dark:border-stone-700 italic">
                      &quot;{sym.notes}&quot;
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
              <p className="text-sm font-semibold text-[#222624] dark:text-stone-100">
                Sin consultas veterinarias registradas
              </p>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Registrá visitas clínicas, diagnósticos, recomendaciones profesionales y próximas citas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vetVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#3E5A4D] dark:text-emerald-400 bg-[#E9EFEA] dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md">
                          {formatInMontevideo(visit.visit_date, 'dd/MM/yyyy')}
                        </span>
                        {visit.clinic_name && (
                          <span className="text-xs font-semibold text-[#606763] dark:text-stone-300">
                            {visit.clinic_name}
                          </span>
                        )}
                        {visit.veterinarian_name && (
                          <span className="text-xs text-[#8E9490] dark:text-stone-400">
                            • Dr/a. {visit.veterinarian_name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-[#222624] dark:text-stone-100 mt-1.5">
                        {visit.reason}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteVetVisit(visit.id)}
                      className="p-1.5 rounded-lg text-[#C34A3E] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 transition-colors shrink-0"
                      title="Eliminar consulta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {visit.diagnosis && (
                    <div className="text-xs bg-[#FAF8F5] dark:bg-stone-800 p-3 rounded-xl border border-[#EFECE5] dark:border-stone-700">
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Diagnóstico: </span>
                      <span className="text-[#606763] dark:text-stone-300">{visit.diagnosis}</span>
                    </div>
                  )}

                  {visit.professional_recommendations && (
                    <div className="text-xs bg-[#FAF8F5] dark:bg-stone-800 p-3 rounded-xl border border-[#EFECE5] dark:border-stone-700">
                      <span className="font-semibold text-[#222624] dark:text-stone-200">Indicaciones: </span>
                      <span className="text-[#606763] dark:text-stone-300">{visit.professional_recommendations}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-[#606763] dark:text-stone-400 pt-1">
                    {visit.next_appointment_at && (
                      <span className="flex items-center gap-1.5 text-[#3E5A4D] dark:text-emerald-400 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Próxima cita: {formatInMontevideo(visit.next_appointment_at, 'dd/MM/yyyy HH:mm')} hs
                      </span>
                    )}
                    {visit.cost && (
                      <span className="ml-auto font-semibold text-[#222624] dark:text-stone-200">
                        Costo: ${visit.cost} UYU
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Medical Documents & Photos (Grouped by Date) */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {documents.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 sm:p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-[#222624] dark:text-stone-100">
                Aún no hay documentos ni fotos guardadas
              </h3>
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Subí recetas médicas, fotos de heridas o radiografías, análisis clínicos e informes en <strong>PDF, Word o imagen</strong> agrupados por fecha.
              </p>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subir primera foto o documento</span>
              </button>
            </div>
          ) : (
            groupedDocuments.map(([dateKey, docsInDate]) => (
              <div key={dateKey} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="w-4 h-4 text-[#3E5A4D] dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-[#222624] dark:text-stone-200 capitalize tracking-wide">
                    {formatGroupDate(dateKey)}
                  </h3>
                  <span className="text-[10px] font-semibold text-[#606763] dark:text-stone-400 px-2 py-0.5 rounded-full bg-[#FAF8F5] dark:bg-stone-800 border border-[#E5E1D6] dark:border-stone-750">
                    {docsInDate.length} {docsInDate.length === 1 ? 'archivo' : 'archivos'}
                  </span>
                </div>

                {/* Grid of Documents / Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {docsInDate.map((doc) => {
                    const ext = doc.file_name ? doc.file_name.split('.').pop()?.toLowerCase() || '' : '';
                    const isPdf = ext === 'pdf';
                    const isWord = ext === 'doc' || ext === 'docx';
                    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic'].includes(ext) || doc.file_url.startsWith('data:image/');

                    return (
                      <div
                        key={doc.id}
                        className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-3 hover:border-[#3E5A4D]/40 transition-colors"
                      >
                        <div>
                          {/* Image preview thumbnail if document is an image */}
                          {isImage && (
                            <div
                              onClick={() => setPreviewImage({ url: doc.file_url, title: doc.title })}
                              className="relative w-full h-44 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-850 border border-[#EFECE5] dark:border-stone-750 mb-3 group cursor-pointer"
                            >
                              <img
                                src={doc.file_url}
                                alt={doc.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                                <ExternalLink className="w-4 h-4" />
                                <span>Ver foto en grande</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-3 mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {!isImage && (
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isPdf
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                      : isWord
                                      ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                      : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                                  }`}
                                >
                                  <span className="uppercase text-[10px] tracking-tight">{ext || 'DOC'}</span>
                                </div>
                              )}
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
                            title="Eliminar documento o foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Weight Control */}
      {activeTab === 'weight' && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Current Weight */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#606763] dark:text-stone-400">
                  Peso Actual ({activePet?.name || 'Mascota'})
                </p>
                <p className="text-2xl font-extrabold text-[#222624] dark:text-stone-100 tracking-tight mt-0.5">
                  {activePet?.weight_kg ? `${activePet.weight_kg} kg` : (weightLogs[0]?.weight_kg ? `${weightLogs[0].weight_kg} kg` : 'Sin datos')}
                </p>
              </div>
            </div>

            {/* Weight Trend / Delta */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                weightDiff > 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : weightDiff < 0
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
              }`}>
                {weightDiff > 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : weightDiff < 0 ? (
                  <TrendingDown className="w-6 h-6" />
                ) : (
                  <Minus className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#606763] dark:text-stone-400">
                  Evolución vs Anterior
                </p>
                <p className="text-lg font-bold text-[#222624] dark:text-stone-100 mt-0.5">
                  {weightDiffString}
                </p>
              </div>
            </div>

            {/* Last Weigh-in Date */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] dark:bg-stone-800 text-[#606763] dark:text-stone-300 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#606763] dark:text-stone-400">
                  Último Pesaje
                </p>
                <p className="text-sm font-bold text-[#222624] dark:text-stone-100 mt-0.5">
                  {weightLogs[0] ? formatInMontevideo(weightLogs[0].logged_date, 'dd/MM/yyyy') : 'Pendiente'}
                </p>
              </div>
            </div>
          </div>

          {/* Weight History List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#222624] dark:text-stone-100">
                Historial de Pesajes
              </h3>
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Peso</span>
              </button>
            </div>

            {weightLogs.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 p-8 text-center shadow-xs">
                <Scale className="w-8 h-8 text-[#8E9490] dark:text-stone-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#222624] dark:text-stone-100">
                  Aún no hay pesajes registrados
                </p>
                <p className="text-xs text-[#606763] dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Llevá el control del peso corporal para dosificación exacta de medicamentos y salud general.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-stone-900 rounded-2xl sm:rounded-3xl border border-[#E5E1D6] dark:border-stone-800 overflow-hidden shadow-xs divide-y divide-[#EFECE5] dark:divide-stone-800">
                {weightLogs.map((log, index) => {
                  const nextLog = weightLogs[index + 1];
                  const diff = nextLog ? Number((log.weight_kg - nextLog.weight_kg).toFixed(2)) : null;

                  return (
                    <div
                      key={log.id}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#FAF8F5]/60 dark:hover:bg-stone-850/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          <Scale className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-extrabold text-[#222624] dark:text-stone-100">
                              {log.weight_kg} kg
                            </span>
                            {diff !== null ? (
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  diff > 0
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : diff < 0
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                    : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
                                }`}
                              >
                                {diff > 0 ? `+${diff} kg` : diff < 0 ? `${diff} kg` : '= Estable'}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-[#606763] dark:text-stone-400 px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">
                                Inicial
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5 capitalize">
                            {formatInMontevideo(log.logged_date, "EEEE d 'de' MMMM, yyyy")}
                          </p>
                          {log.notes && (
                            <p className="text-xs text-[#606763] dark:text-stone-400 italic mt-1">
                              &quot;{log.notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteWeightLog(log.id)}
                        className="p-2 rounded-xl text-[#C34A3E] dark:text-rose-400 hover:bg-[#FDF2F0] dark:hover:bg-rose-950/40 transition-colors shrink-0"
                        title="Eliminar pesaje"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Preview for Photos */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
            <div className="mt-3 flex items-center justify-between w-full px-2 text-white">
              <p className="text-sm font-semibold truncate">{previewImage.title}</p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cerrar</span>
              </button>
            </div>
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

      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        onSuccess={loadData}
      />

      <WeightModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
