// src/lib/supabase/cloud-repository.ts
import { createClient, isLiveSupabaseConfigured } from './client';
import { Pet, Medication, ScheduledDose, DoseLog, DoseStatus } from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { UserSettings } from '@/types/settings';

export const isUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

/**
 * Cloud database service that queries and mutates live Supabase PostgreSQL tables.
 * Sanitizes mock IDs into valid Postgres UUIDs.
 */
export class SupabaseCloudRepository {
  private static get supabase() {
    return createClient();
  }

  // --- PETS ---
  static async getPets(): Promise<Pet[]> {
    if (!isLiveSupabaseConfigured()) return [];
    const { data, error } = await this.supabase
      .from('pets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[SupabaseCloud] Error fetching pets:', error.message);
      return [];
    }
    return data as Pet[];
  }

  static async addPet(
    pet: Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'owner_id'> & { id?: string; owner_id?: string }
  ): Promise<Pet | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) {
      return null;
    }

    const payload: Record<string, unknown> = {
      name: pet.name,
      species: pet.species || 'Canino',
      breed: pet.breed || null,
      birth_date: pet.birth_date || null,
      weight_kg: pet.weight_kg !== undefined ? Number(pet.weight_kg) : null,
      photo_url: pet.photo_url || null,
      notes: pet.notes || null,
      owner_id: userData.user.id,
    };

    if (pet.id && isUuid(pet.id)) {
      payload.id = pet.id;
    }

    const { data, error } = await this.supabase
      .from('pets')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error inserting pet:', error.message);
      return null;
    }
    return data as Pet;
  }

  static async updatePet(id: string, updates: Partial<Pet>): Promise<Pet | null> {
    if (!isLiveSupabaseConfigured() || !isUuid(id)) return null;

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.species !== undefined) payload.species = updates.species;
    if (updates.breed !== undefined) payload.breed = updates.breed || null;
    if (updates.birth_date !== undefined) payload.birth_date = updates.birth_date || null;
    if (updates.weight_kg !== undefined) payload.weight_kg = updates.weight_kg !== null ? Number(updates.weight_kg) : null;
    if (updates.photo_url !== undefined) payload.photo_url = updates.photo_url || null;
    if (updates.notes !== undefined) payload.notes = updates.notes || null;

    const { data, error } = await this.supabase
      .from('pets')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error updating pet:', error.message);
      return null;
    }
    return data as Pet;
  }

  static async deletePet(id: string): Promise<boolean> {
    if (!isLiveSupabaseConfigured() || !isUuid(id)) return false;
    const { error } = await this.supabase.from('pets').delete().eq('id', id);
    if (error) {
      console.error('[SupabaseCloud] Error deleting pet:', error.message);
      return false;
    }
    return true;
  }

  // --- MEDICATIONS ---
  static async getMedications(petId?: string): Promise<Medication[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('medications').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) {
      console.error('[SupabaseCloud] Error fetching medications:', error.message);
      return [];
    }
    return data as Medication[];
  }

  static async addMedication(
    med: Omit<Medication, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<Medication | null> {
    if (!isLiveSupabaseConfigured()) return null;

    let targetPetId = med.pet_id;
    if (!isUuid(targetPetId)) {
      // Find active pet UUID from Supabase
      const { data: pets } = await this.supabase.from('pets').select('id').limit(1);
      if (pets && pets[0]) {
        targetPetId = pets[0].id;
      } else {
        return null;
      }
    }

    const payload: Record<string, unknown> = {
      pet_id: targetPetId,
      name: med.name,
      active_substance: med.active_substance || null,
      presentation: med.presentation,
      dose_amount: Number(med.dose_amount),
      dose_unit: med.dose_unit,
      instructions: med.instructions || null,
      notes: med.notes || null,
      is_active: med.is_active ?? true,
      track_inventory: med.track_inventory ?? false,
      current_stock: Number(med.current_stock || 0),
      low_stock_threshold: Number(med.low_stock_threshold || 5),
    };

    if (med.id && isUuid(med.id)) {
      payload.id = med.id;
    }

    const { data, error } = await this.supabase
      .from('medications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error inserting medication:', error.message);
      return null;
    }
    return data as Medication;
  }

  static async updateMedication(id: string, updates: Partial<Medication>): Promise<Medication | null> {
    if (!isLiveSupabaseConfigured() || !isUuid(id)) return null;

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.active_substance !== undefined) payload.active_substance = updates.active_substance || null;
    if (updates.presentation !== undefined) payload.presentation = updates.presentation;
    if (updates.dose_amount !== undefined) payload.dose_amount = Number(updates.dose_amount);
    if (updates.dose_unit !== undefined) payload.dose_unit = updates.dose_unit;
    if (updates.instructions !== undefined) payload.instructions = updates.instructions || null;
    if (updates.notes !== undefined) payload.notes = updates.notes || null;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.track_inventory !== undefined) payload.track_inventory = updates.track_inventory;
    if (updates.current_stock !== undefined) payload.current_stock = Number(updates.current_stock);
    if (updates.low_stock_threshold !== undefined) payload.low_stock_threshold = Number(updates.low_stock_threshold);

    const { data, error } = await this.supabase
      .from('medications')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error updating medication:', error.message);
      return null;
    }
    return data as Medication;
  }

  // --- SCHEDULED DOSES ---
  static async getScheduledDoses(petId?: string): Promise<ScheduledDose[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('scheduled_doses').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('scheduled_for', { ascending: true });
    if (error) {
      console.error('[SupabaseCloud] Error fetching doses:', error.message);
      return [];
    }
    return data as ScheduledDose[];
  }

  static async updateDoseStatus(id: string, status: DoseStatus): Promise<boolean> {
    if (!isLiveSupabaseConfigured() || !isUuid(id)) return false;
    const { error } = await this.supabase
      .from('scheduled_doses')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('[SupabaseCloud] Error updating dose status:', error.message);
      return false;
    }
    return true;
  }

  // --- DOSE LOGS ---
  static async getDoseLogs(petId?: string): Promise<DoseLog[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('dose_logs').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('administered_at', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching dose logs:', error.message);
      return [];
    }
    return data as DoseLog[];
  }

  static async recordDoseLog(
    log: Omit<DoseLog, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<DoseLog | null> {
    if (!isLiveSupabaseConfigured()) return null;
    if (!isUuid(log.pet_id) || !isUuid(log.medication_id)) {
      return null;
    }

    const payload: Record<string, unknown> = {
      pet_id: log.pet_id,
      medication_id: log.medication_id,
      status: log.status,
      scheduled_time: log.scheduled_time,
      administered_at: log.administered_at,
      registered_by: log.registered_by || 'manual',
      reason_skipped: log.reason_skipped || null,
      notes: log.notes || null,
      inventory_deducted: Number(log.inventory_deducted || 0),
    };

    if (log.scheduled_dose_id && isUuid(log.scheduled_dose_id)) {
      payload.scheduled_dose_id = log.scheduled_dose_id;
    }
    if (log.id && isUuid(log.id)) {
      payload.id = log.id;
    }

    const { data, error } = await this.supabase
      .from('dose_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error recording dose log:', error.message);
      return null;
    }
    return data as DoseLog;
  }

  // --- SYMPTOMS ---
  static async getSymptomLogs(petId?: string): Promise<SymptomLog[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('symptom_logs').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('logged_at', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching symptoms:', error.message);
      return [];
    }
    return data as SymptomLog[];
  }

  static async addSymptomLog(
    symptom: Omit<SymptomLog, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<SymptomLog | null> {
    if (!isLiveSupabaseConfigured()) return null;
    let targetPetId = symptom.pet_id;
    if (!isUuid(targetPetId)) {
      const { data: pets } = await this.supabase.from('pets').select('id').limit(1);
      if (pets && pets[0]) {
        targetPetId = pets[0].id;
      } else {
        return null;
      }
    }

    const payload: Record<string, unknown> = {
      pet_id: targetPetId,
      logged_at: symptom.logged_at,
      pain_level: Number(symptom.pain_level),
      mobility: symptom.mobility,
      walking_ability: symptom.walking_ability,
      paw_support: symptom.paw_support,
      appetite: symptom.appetite,
      behavior: symptom.behavior,
      notes: symptom.notes || null,
      media_urls: symptom.media_urls || [],
    };

    if (symptom.id && isUuid(symptom.id)) {
      payload.id = symptom.id;
    }

    const { data, error } = await this.supabase
      .from('symptom_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error adding symptom log:', error.message);
      return null;
    }
    return data as SymptomLog;
  }

  // --- VET VISITS ---
  static async getVetVisits(petId?: string): Promise<VetVisit[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('vet_visits').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('visit_date', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching vet visits:', error.message);
      return [];
    }
    return data as VetVisit[];
  }

  static async addVetVisit(
    visit: Omit<VetVisit, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ): Promise<VetVisit | null> {
    if (!isLiveSupabaseConfigured()) return null;
    let targetPetId = visit.pet_id;
    if (!isUuid(targetPetId)) {
      const { data: pets } = await this.supabase.from('pets').select('id').limit(1);
      if (pets && pets[0]) {
        targetPetId = pets[0].id;
      } else {
        return null;
      }
    }

    const payload: Record<string, unknown> = {
      pet_id: targetPetId,
      visit_date: visit.visit_date,
      clinic_name: visit.clinic_name || null,
      veterinarian_name: visit.veterinarian_name || null,
      reason: visit.reason,
      diagnosis: visit.diagnosis || null,
      professional_recommendations: visit.professional_recommendations || null,
      next_appointment_at: visit.next_appointment_at || null,
      cost: visit.cost !== undefined ? Number(visit.cost) : null,
    };

    if (visit.id && isUuid(visit.id)) {
      payload.id = visit.id;
    }

    const { data, error } = await this.supabase
      .from('vet_visits')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error adding vet visit:', error.message);
      return null;
    }
    return data as VetVisit;
  }

  // --- MEDICAL DOCUMENTS ---
  static async getMedicalDocuments(petId?: string): Promise<MedicalDocument[]> {
    if (!isLiveSupabaseConfigured()) return [];
    let query = this.supabase.from('medical_documents').select('*');
    if (petId && isUuid(petId)) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('document_date', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching medical documents:', error.message);
      return [];
    }
    return data as MedicalDocument[];
  }

  static async addMedicalDocument(
    doc: Omit<MedicalDocument, 'id' | 'created_at'> & { id?: string }
  ): Promise<MedicalDocument | null> {
    if (!isLiveSupabaseConfigured()) return null;
    let targetPetId = doc.pet_id;
    if (!isUuid(targetPetId)) {
      const { data: pets } = await this.supabase.from('pets').select('id').limit(1);
      if (pets && pets[0]) {
        targetPetId = pets[0].id;
      } else {
        return null;
      }
    }

    const payload: Record<string, unknown> = {
      pet_id: targetPetId,
      document_type: doc.document_type,
      title: doc.title,
      file_url: doc.file_url,
      file_name: doc.file_name,
      notes: doc.notes || null,
      document_date: doc.document_date || new Date().toISOString().split('T')[0],
    };

    if (doc.vet_visit_id && isUuid(doc.vet_visit_id)) {
      payload.vet_visit_id = doc.vet_visit_id;
    }
    if (doc.id && isUuid(doc.id)) {
      payload.id = doc.id;
    }

    const { data, error } = await this.supabase
      .from('medical_documents')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error adding medical document:', error.message);
      return null;
    }
    return data as MedicalDocument;
  }

  // --- SETTINGS ---
  static async getUserSettings(): Promise<UserSettings | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseCloud] Error fetching user settings:', error.message);
      return null;
    }
    return data as UserSettings;
  }

  static async updateUserSettings(updates: Partial<UserSettings>): Promise<UserSettings | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) return null;

    // Sanitize payload: strip mock IDs like "settings-001" and "pet-kira-001"
    const payload: Record<string, unknown> = {
      user_id: userData.user.id,
      updated_at: new Date().toISOString(),
    };

    if (updates.timezone !== undefined) payload.timezone = updates.timezone;
    if (updates.whatsapp_phone !== undefined) payload.whatsapp_phone = updates.whatsapp_phone;
    if (updates.reminders_enabled !== undefined) payload.reminders_enabled = updates.reminders_enabled;
    if (updates.advance_notice_minutes !== undefined) payload.advance_notice_minutes = Number(updates.advance_notice_minutes);
    if (updates.pending_dose_alert !== undefined) payload.pending_dose_alert = updates.pending_dose_alert;
    if (updates.quiet_hours_enabled !== undefined) payload.quiet_hours_enabled = updates.quiet_hours_enabled;
    if (updates.quiet_hours_start !== undefined) payload.quiet_hours_start = updates.quiet_hours_start || null;
    if (updates.quiet_hours_end !== undefined) payload.quiet_hours_end = updates.quiet_hours_end || null;
    if (updates.inventory_alerts_enabled !== undefined) payload.inventory_alerts_enabled = updates.inventory_alerts_enabled;

    // Only set pet_id if it's a real PostgreSQL UUID
    if (updates.pet_id && isUuid(updates.pet_id)) {
      payload.pet_id = updates.pet_id;
    }

    // Upsert on user_id so it inserts or updates without failing on missing record or invalid UUID
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[SupabaseCloud] Error updating user settings:', error.message);
      return null;
    }
    return data as UserSettings;
  }

  // --- FILE STORAGE ---
  static async uploadMediaFile(file: File, folder = 'documents'): Promise<{ publicUrl: string; fileName: string } | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const ext = file.name.split('.').pop() || 'dat';
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const filePath = `${folder}/${cleanFileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('pawcare_media')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[SupabaseCloud] Error uploading file:', uploadError.message);
      return null;
    }

    const { data } = this.supabase.storage.from('pawcare_media').getPublicUrl(filePath);
    return {
      publicUrl: data.publicUrl,
      fileName: file.name,
    };
  }
}
