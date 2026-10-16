// src/components/veterinary/document-modal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { MedicalDocumentType } from '@/types/veterinary';
import { KiraRepository } from '@/lib/storage/repository';
import { getLocalDateString } from '@/lib/date-utils';
import { UploadCloud, FileText, AlertCircle } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPES: { id: MedicalDocumentType; label: string }[] = [
  { id: 'prescription', label: 'Receta médica' },
  { id: 'lab_result', label: 'Resultado de análisis / laboratorio' },
  { id: 'xray', label: 'Radiografía / Ecografía / Estudios' },
  { id: 'discharge_summary', label: 'Alta médica / Epicrisis' },
  { id: 'other', label: 'Otro documento' },
];

export function DocumentModal({ isOpen, onClose, onSuccess }: DocumentModalProps) {
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<MedicalDocumentType>('prescription');
  const [documentDate, setDocumentDate] = useState(getLocalDateString());
  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileExtension, setFileExtension] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Max 15MB limit for client base64 storage
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('El archivo supera el tamaño máximo permitido de 15 MB.');
      return;
    }

    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase() || '';
    setFileName(name);
    setFileExtension(ext);

    // Format size
    const sizeKb = file.size / 1024;
    if (sizeKb > 1024) {
      setFileSize(`${(sizeKb / 1024).toFixed(1)} MB`);
    } else {
      setFileSize(`${Math.round(sizeKb)} KB`);
    }

    // Auto-fill title if empty
    if (!title) {
      const baseName = name.replace(/\.[^/.]+$/, '');
      setTitle(baseName);
    }

    // Read as Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFileUrl(result);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileName) {
      setErrorMessage('Por favor, seleccioná un archivo PDF o DOCX.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const activePet = KiraRepository.getActivePet();
      KiraRepository.addDocument({
        pet_id: activePet.id,
        title: title.trim() || fileName,
        document_type: documentType,
        document_date: documentDate,
        file_name: fileName,
        file_url: fileUrl,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setFileName('');
      setFileUrl('');
      setFileSize('');
      setNotes('');
      setDocumentDate(getLocalDateString());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el documento.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subir Documento Médico"
      description="Adjuntá recetas veterinarias, análisis o informes en PDF y Word"
      maxWidth="max-w-lg"
      headerAction={
        <button
          form="document-upload-form"
          type="submit"
          disabled={isSubmitting || !fileUrl}
          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] transition-all shadow-xs disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </button>
      }
    >
      <form id="document-upload-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FDF2F0] dark:bg-rose-950/30 border border-[#F8D7DA] dark:border-rose-900/50 text-xs text-[#C34A3E] dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* File drop/picker box */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1.5">
            Archivo adjunto (PDF, DOCX, DOC o imagen) <span className="text-[#C34A3E]">*</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!fileUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E5E1D6] dark:border-stone-700 hover:border-[#3E5A4D] dark:hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#FAF8F5]/60 dark:bg-stone-850/60"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#222624] dark:text-stone-100">
                Tocá aquí para seleccionar un archivo
              </p>
              <p className="text-[11px] text-[#606763] dark:text-stone-400 mt-1">
                Formatos compatibles: <strong>PDF, DOCX, DOC</strong> e imágenes (hasta 15 MB)
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F4F8F5] dark:bg-emerald-950/20 border border-[#D3DFD7] dark:border-emerald-900/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-stone-900 border border-[#D3DFD7] dark:border-emerald-900/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#222624] dark:text-stone-100 truncate">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-[#606763] dark:text-stone-400">
                    <span className="uppercase font-semibold text-[#3E5A4D] dark:text-emerald-400">
                      {fileExtension || 'DOC'}
                    </span>{' '}
                    • {fileSize}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFileUrl('');
                  setFileName('');
                  setFileSize('');
                  setFileExtension('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs text-[#C34A3E] dark:text-rose-400 hover:underline shrink-0 font-medium"
              >
                Cambiar
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
            Título del documento <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Análisis de sangre Octubre 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Document Type and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
              Tipo de documento
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as MedicalDocumentType)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
              Fecha del documento
            </label>
            <input
              type="date"
              required
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
            Notas u observaciones veterinarias (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ej: Control de valores hepáticos y renales, pauta indicada por Dr. Gómez"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end pt-3 border-t border-[#EFECE5] dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5] dark:hover:bg-stone-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !fileUrl}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#3E5A4D] hover:bg-[#32493E] transition-all shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Documento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
