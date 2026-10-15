// src/types/health.ts

export type MobilityLevel = 'normal' | 'somewhat_limited' | 'severely_limited';
export type WalkingAbility = 'normal' | 'limping' | 'needs_assistance' | 'unable';
export type AppetiteLevel = 'normal' | 'increased' | 'decreased' | 'none';
export type BehaviorState = 'calm' | 'playful' | 'lethargic' | 'anxious' | 'restless';

export interface SymptomLog {
  id: string;
  pet_id: string;
  logged_at: string; // ISO string
  pain_level: number; // 0 to 10 subjective caregiver rating
  mobility: MobilityLevel;
  walking_ability: WalkingAbility;
  paw_support: string; // e.g. "Todas las patas apoyadas", "Evita pata trasera derecha"
  appetite: AppetiteLevel;
  behavior: BehaviorState;
  notes?: string;
  media_urls?: string[];
  created_at: string;
  updated_at: string;
}
