// src/components/veterinary/document-modal.tsx
'use client';

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/modal';
import { MedicalDocumentType } from '@/types/veterinary';
import { KiraRepository } from '@/lib/storage/repository';
import { getLocalDateString } from '@/lib/date-utils';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { SupabaseCloudRepository } from '@/lib/supabase/cloud-repository';
import { UploadCloud, FileText, AlertCircle, Camera, Image as ImageIcon } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DOCUMENT_TYPES: { id: MedicalDocumentType; label: string }[] = [
  { id: 'prescription', label: 'Receta médica' },
  { id: 'lab_result', label: 'Resultado de análisis / laboratorio' },
  { id: 'xray', label: 'Radiografía / Ecografía / Foto clínica' },
  { id: 'discharge_summary', label: 'Alta médica / Epicrisis' },
  { id: 'other', label: 'Otro documento / Foto' },
];

export function DocumentModal({ isOpen, onClose, onSuccess }: DocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (ext: string, url: string) => {
    return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic'].includes(ext.toLowerCase()) || url.startsWith('data:image/');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
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

    // If it's an image and current type is prescription, suggest 'xray' (photos/studies) or keep default
    if (isImageFile(ext, '') && documentType === 'prescription') {
      setDocumentType('xray');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileName) {
      setErrorMessage('Por favor, seleccioná un archivo PDF, DOCX o una foto.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalUrl = fileUrl;

      // Upload file directly to Supabase Cloud Storage
      if (selectedFile && isLiveSupabaseConfigured()) {
        const uploadRes = await SupabaseCloudRepository.uploadMediaFile(selectedFile, 'documents');
        if (uploadRes?.publicUrl) {
          finalUrl = uploadRes.publicUrl;
        }
      }

      const activePet = KiraRepository.getActivePet();
      KiraRepository.addDocument({
        pet_id: activePet.id,
        title: title.trim() || fileName,
        document_type: documentType,
        document_date: documentDate,
        file_name: fileName,
        file_url: finalUrl,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setSelectedFile(null);
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

  const isImage = isImageFile(fileExtension, fileUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subir Documento o Foto"
      description="Adjuntá recetas, fotos clínicas, análisis o informes en PDF, Word o imagen"
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

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* File picker buttons / preview */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1.5">
            Archivo o Foto <span className="text-[#C34A3E]">*</span>
          </label>

          {!fileUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E1D6] dark:border-stone-700 hover:border-[#3E5A4D] dark:hover:border-emerald-600 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#FAF8F5]/60 dark:bg-stone-850/60 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#222624] dark:text-stone-100">
                    Elegir Archivo / Foto
                  </p>
                  <p className="text-[10px] text-[#606763] dark:text-stone-400">
                    PDF, DOCX, DOC o Galería
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="border-2 border-dashed border-[#E5E1D6] dark:border-stone-700 hover:border-[#3E5A4D] dark:hover:border-emerald-600 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#FAF8F5]/60 dark:bg-stone-850/60 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#E9EFEA] dark:bg-emerald-950/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#222624] dark:text-stone-100">
                    Tomar Foto con Cámara
                  </p>
                  <p className="text-[10px] text-[#606763] dark:text-stone-400">
                    Recetas físicas, heridas, etc.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#F4F8F5] dark:bg-emerald-950/20 border border-[#D3DFD7] dark:border-emerald-900/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {isImage ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 border border-[#D3DFD7] dark:border-stone-700 shrink-0">
                    <img src={fileUrl} alt="Vista previa" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-stone-900 border border-[#D3DFD7] dark:border-emerald-900/40 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#222624] dark:text-stone-100 truncate">
                    {fileName}
                  </p>
                  <p className="text-[11px] text-[#606763] dark:text-stone-400">
                    <span className="uppercase font-semibold text-[#3E5A4D] dark:text-emerald-400">
                      {fileExtension || (isImage ? 'FOTO' : 'DOC')}
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
                  if (cameraInputRef.current) cameraInputRef.current.value = '';
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
            Título del documento o foto <span className="text-[#C34A3E]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Análisis de sangre Octubre, Foto radiografía cadera"
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
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-[#222624] dark:text-stone-200 mb-1">
            Notas u observaciones adicionales (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Indicaciones del veterinario, hallazgos, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 bg-white dark:bg-stone-850 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#3E5A4D]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E1D6] dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#E5E1D6] dark:border-stone-700 text-xs font-semibold text-[#606763] dark:text-stone-300 hover:bg-[#FAF8F5] dark:hover:bg-stone-850"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !fileUrl}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#3E5A4D] hover:bg-[#32493E] text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Archivo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
