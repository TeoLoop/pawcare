// src/types/inventory.ts

export type InventoryEventType =
  | 'restock'
  | 'dose_administered'
  | 'adjustment'
  | 'waste';

export interface InventoryEvent {
  id: string;
  medication_id: string;
  event_type: InventoryEventType;
  quantity_delta: number;
  resulting_stock: number;
  dose_log_id?: string;
  notes?: string;
  created_at: string;
}

export interface StockForecast {
  medicationId: string;
  medicationName: string;
  currentStock: number;
  unit: string;
  dailyConsumption: number;
  daysRemaining: number | null;
  estimatedDepletionDate: string | null;
  isLowStock: boolean;
  needsRestockWarning: boolean;
}
