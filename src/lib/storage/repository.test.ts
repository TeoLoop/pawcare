import { describe, it, expect, beforeEach } from 'vitest';
import { KiraRepository } from './repository';

describe('KiraRepository Core Business Rules', () => {
  beforeEach(() => {
    KiraRepository.clearAllData();
    KiraRepository.addPet({
      name: 'Kira',
      species: 'Canino',
      breed: 'Mestiza (tipo Pastor)',
      owner_id: 'user-default-001',
    });
    const pet = KiraRepository.getPet();
    expect(pet.name).toBe('Kira');
  });

  it('preserves inventory when dose is skipped and deducts when administered', () => {
    // 1. Create a test medication with inventory tracking
    const pet = KiraRepository.getPet();
    const med = KiraRepository.saveMedication({
      pet_id: pet.id,
      name: 'Test Antiinflamatorio',
      presentation: 'Comprimidos',
      dose_amount: 1,
      dose_unit: 'comprimido',
      track_inventory: true,
      current_stock: 10,
      low_stock_threshold: 3,
      is_active: true,
    });

    expect(med.current_stock).toBe(10);

    // 2. Record skipped dose -> stock must remain 10
    const skipResult = KiraRepository.recordDoseAction({
      medication_id: med.id,
      status: 'skipped',
      reason_skipped: 'El veterinario indicó pausar por vómito leve',
      registered_by: 'manual',
    });

    expect(skipResult.doseLog.status).toBe('skipped');
    expect(skipResult.doseLog.inventory_deducted).toBe(0);
    const medAfterSkip = KiraRepository.getMedicationById(med.id);
    expect(medAfterSkip?.current_stock).toBe(10); // NOT deducted

    // 3. Record administered dose -> stock must decrease by 1 to 9
    const adminResult = KiraRepository.recordDoseAction({
      medication_id: med.id,
      status: 'administered',
      registered_by: 'manual',
    });

    expect(adminResult.doseLog.status).toBe('administered');
    expect(adminResult.doseLog.inventory_deducted).toBe(1);
    const medAfterAdmin = KiraRepository.getMedicationById(med.id);
    expect(medAfterAdmin?.current_stock).toBe(9); // Correctly deducted
  });

  it('invalidates single-use confirmation token once recorded', () => {
    const pet = KiraRepository.getPet();
    const med = KiraRepository.saveMedication(
      {
        pet_id: pet.id,
        name: 'Test Token Med',
        presentation: 'Gotas',
        dose_amount: 5,
        dose_unit: 'gotas',
        track_inventory: false,
        current_stock: 0,
        low_stock_threshold: 0,
        is_active: true,
      },
      {
        frequency_type: 'daily',
        times_of_day: ['12:00'],
        start_date: '2026-01-01',
        is_active: true,
      }
    );

    const doses = KiraRepository.getScheduledDoses();
    expect(doses.length).toBeGreaterThan(0);
    const token = doses[0].confirmation_token;
    expect(token).toBeDefined();

    if (!token) throw new Error('Token is undefined');

    const fetchedDose = KiraRepository.getDoseByConfirmationToken(token);
    expect(fetchedDose?.id).toBe(doses[0].id);

    // Record action using token
    KiraRepository.recordDoseAction({
      scheduled_dose_id: doses[0].id,
      medication_id: med.id,
      status: 'administered',
      registered_by: 'whatsapp_link',
    });

    // Token must no longer be found
    const doseAfter = KiraRepository.getDoseByConfirmationToken(token);
    expect(doseAfter).toBeUndefined();
  });

  it('allows correcting a dose log and audits the change while adjusting inventory', () => {
    const pet = KiraRepository.getPet();
    const med = KiraRepository.saveMedication({
      pet_id: pet.id,
      name: 'Amoxicilina Test',
      presentation: 'Comprimidos',
      dose_amount: 2,
      dose_unit: 'comprimido',
      track_inventory: true,
      current_stock: 20,
      low_stock_threshold: 5,
      is_active: true,
    });

    // 1. Administer: stock 20 -> 18
    const { doseLog } = KiraRepository.recordDoseAction({
      medication_id: med.id,
      status: 'administered',
      registered_by: 'manual',
    });
    expect(KiraRepository.getMedicationById(med.id)?.current_stock).toBe(18);

    // 2. Correct log to 'skipped': stock must revert back from 18 -> 20
    const corrected = KiraRepository.correctDoseLog(
      doseLog.id,
      'skipped',
      'Corrección: El perro escupió la pastilla y no se la tomó'
    );

    expect(corrected.status).toBe('skipped');
    expect(corrected.notes).toContain('El perro escupió');
    expect(KiraRepository.getMedicationById(med.id)?.current_stock).toBe(20);
  });
});
