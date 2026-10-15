// src/types/veterinary.ts

export type MedicalDocumentType =
  | 'prescription'
  | 'lab_result'
  | 'xray'
  | 'discharge_summary'
  | 'other';

export interface VetVisit {
  id: string;
  pet_id: string;
  visit_date: string; // ISO string
  clinic_name?: string;
  veterinarian_name?: string;
  reason: string;
  diagnosis?: string;
  professional_recommendations?: string;
  next_appointment_at?: string;
  cost?: number;
  created_at: string;
  updated_at: string;
}

export interface MedicalDocument {
  id: string;
  pet_id: string;
  vet_visit_id?: string;
  document_type: MedicalDocumentType;
  title: string;
  file_url: string;
  file_name: string;
  notes?: string;
  document_date: string; // YYYY-MM-DD
  created_at: string;
}
