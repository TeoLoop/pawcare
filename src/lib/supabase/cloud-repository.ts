// src/lib/supabase/cloud-repository.ts
import { createClient, isLiveSupabaseConfigured } from './client';
import { Pet, Medication, ScheduledDose, DoseLog, DoseStatus } from '@/types/medication';
import { SymptomLog } from '@/types/health';
import { VetVisit, MedicalDocument } from '@/types/veterinary';
import { UserSettings } from '@/types/settings';

/**
 * Cloud database service that queries and mutates live Supabase PostgreSQL tables.
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

  static async addPet(pet: Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'owner_id'> & { id?: string; owner_id?: string }): Promise<Pet | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data: userData } = await this.supabase.auth.getUser();
    if (!userData.user) {
      console.warn('[SupabaseCloud] Cannot add pet without authenticated user');
      return null;
    }

    const payload = {
      ...pet,
      owner_id: userData.user.id,
    };

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
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('pets')
      .update(updates)
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
    if (!isLiveSupabaseConfigured()) return false;
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
    if (petId) {
      query = query.eq('pet_id', petId);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) {
      console.error('[SupabaseCloud] Error fetching medications:', error.message);
      return [];
    }
    return data as Medication[];
  }

  static async addMedication(med: Omit<Medication, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Medication | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('medications')
      .insert(med)
      .select()
      .single();

    if (error) {
      console.error('[SupabaseCloud] Error inserting medication:', error.message);
      return null;
    }
    return data as Medication;
  }

  static async updateMedication(id: string, updates: Partial<Medication>): Promise<Medication | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('medications')
      .update(updates)
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
    if (petId) {
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
    if (!isLiveSupabaseConfigured()) return false;
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
    if (petId) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('administered_at', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching dose logs:', error.message);
      return [];
    }
    return data as DoseLog[];
  }

  static async recordDoseLog(log: Omit<DoseLog, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<DoseLog | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('dose_logs')
      .insert(log)
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
    if (petId) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('logged_at', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching symptoms:', error.message);
      return [];
    }
    return data as SymptomLog[];
  }

  static async addSymptomLog(symptom: Omit<SymptomLog, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<SymptomLog | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('symptom_logs')
      .insert(symptom)
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
    if (petId) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('visit_date', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching vet visits:', error.message);
      return [];
    }
    return data as VetVisit[];
  }

  static async addVetVisit(visit: Omit<VetVisit, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<VetVisit | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('vet_visits')
      .insert(visit)
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
    if (petId) {
      query = query.eq('pet_id', petId);
    }
    const { data, error } = await query.order('document_date', { ascending: false });
    if (error) {
      console.error('[SupabaseCloud] Error fetching medical documents:', error.message);
      return [];
    }
    return data as MedicalDocument[];
  }

  static async addMedicalDocument(doc: Omit<MedicalDocument, 'id' | 'created_at'> & { id?: string }): Promise<MedicalDocument | null> {
    if (!isLiveSupabaseConfigured()) return null;
    const { data, error } = await this.supabase
      .from('medical_documents')
      .insert(doc)
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

    const { data, error } = await this.supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userData.user.id)
      .select()
      .single();

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
