// src/lib/pdf/export-summary.ts
import { jsPDF } from 'jspdf';
import { KiraRepository } from '@/lib/storage/repository';
import { formatInMontevideo } from '@/lib/date-utils';

export function generateVeterinarySummaryPdf(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pet = KiraRepository.getPet();
  const medications = KiraRepository.getMedications().filter((m) => m.is_active);
  const vetVisits = KiraRepository.getVetVisits();
  const symptoms = KiraRepository.getSymptomLogs().slice(0, 5); // Last 5 logs

  const primaryColor = [62, 90, 77]; // #3E5A4D
  const darkColor = [34, 38, 36];
  const mutedColor = [96, 103, 99];

  let y = 18;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PAWCARE — RESUMEN CLÍNICO Y DE MEDICACIÓN', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`Documento generado el: ${formatInMontevideo(new Date())} (Hora de Montevideo)`, 14, y);
  y += 6;

  // Disclaimer Box
  doc.setFillColor(245, 242, 235);
  doc.roundedRect(14, y, 182, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.text(
    'AVISO IMPORTANTE: Este informe distingue de forma estricta entre DIAGNÓSTICOS PROFESIONALES VETERINARIOS',
    18,
    y + 4.5
  );
  doc.text(
    'y APRECIACIONES SUBJETIVAS DEL CUIDADOR (escala de dolor, movilidad y apetito en el hogar).',
    18,
    y + 9
  );
  y += 18;

  // Section 1: Pet Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. Datos de la Mascota', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  const birthText = pet.birth_date ? ` • Nacimiento: ${pet.birth_date}` : '';
  const weightText = pet.weight_kg ? ` • Peso: ${pet.weight_kg} kg` : '';
  doc.text(`Nombre: ${pet.name} • Especie: ${pet.species} • Raza: ${pet.breed || 'Mestiza'}${birthText}${weightText}`, 14, y);
  y += 5;
  if (pet.notes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Notas del tutor: ${pet.notes}`, 14, y);
    y += 5;
  }
  y += 4;

  // Section 2: Active Medications
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. Medicamentos y Pautas Activas (Prescripción)', 14, y);
  y += 5;

  if (medications.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('No hay medicamentos activos registrados en este momento.', 14, y);
    y += 6;
  } else {
    medications.forEach((med) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      const activeSub = med.active_substance ? ` (${med.active_substance})` : '';
      doc.text(`• ${med.name}${activeSub} — ${med.dose_amount} ${med.dose_unit}`, 16, y);
      y += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
      const schedText = med.schedule
        ? `Horarios: ${med.schedule.times_of_day.join(', ')} hs | Frecuencia: ${med.schedule.frequency_type} | Inicio: ${med.schedule.start_date}`
        : 'Sin horario fijo';
      doc.text(schedText, 20, y);
      y += 4.5;

      if (med.instructions) {
        doc.text(`Indicaciones: ${med.instructions}`, 20, y);
        y += 4.5;
      }
      y += 2;
    });
  }
  y += 4;

  // Section 3: Professional Vet Diagnoses
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. Diagnósticos y Controles Profesionales (Veterinario)', 14, y);
  y += 5;

  if (vetVisits.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('No se han registrado visitas veterinarias previas.', 14, y);
    y += 6;
  } else {
    vetVisits.forEach((visit) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      const dateStr = formatInMontevideo(visit.visit_date, 'dd/MM/yyyy');
      doc.text(`[${dateStr}] ${visit.reason} — ${visit.clinic_name || 'Clínica'} (${visit.veterinarian_name || 'Veterinario'})`, 16, y);
      y += 4.5;

      if (visit.diagnosis) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(`Diagnóstico: ${visit.diagnosis}`, 20, y);
        y += 4.5;
      }

      if (visit.professional_recommendations) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(`Indicaciones: ${visit.professional_recommendations}`, 20, y);
        y += 4.5;
      }
      y += 2;
    });
  }
  y += 4;

  // Section 4: Caregiver Daily Observations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Observaciones Diarias del Cuidador (En el hogar)', 14, y);
  y += 5;

  if (symptoms.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('Sin registros recientes de síntomas.', 14, y);
  } else {
    symptoms.forEach((sym) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      const dateStr = formatInMontevideo(sym.logged_at, 'dd/MM/yyyy HH:mm');
      doc.text(
        `• [${dateStr}] Dolor: ${sym.pain_level}/10 | Movilidad: ${sym.mobility} | Apetito: ${sym.appetite}`,
        16,
        y
      );
      y += 4;

      if (sym.paw_support || sym.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        const text = [sym.paw_support, sym.notes].filter(Boolean).join(' — ');
        doc.text(text.substring(0, 100), 20, y);
        y += 4;
      }
      y += 1.5;
    });
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Generado automáticamente por PawCare — Plataforma de Gestión de Salud de Mascotas', 14, 287);

  return doc;
}
