/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User Roles
export type UserRole = 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGER';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  sapNumber?: string; // For Technician
  code?: string; // For Supervisor/Manager
  factoryId?: 'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL'; // Factory assignment
}

export interface ManagedUser {
  sapNumber: string;
  name: string;
  role: UserRole;
  factoryId: 'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL';
}

// Refrigerator Models
export interface RefrigeratorModel {
  id: string;
  name: string;
  capacity?: string; // e.g. "450L", "340L", "520L"
  type: "No Frost" | "Defrost";
  factoryId: 'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL';
}

// Production Lines
export type ProductionLineId = 'LINE_A' | 'LINE_B' | 'LINE_C';

export interface ProductionLine {
  id: ProductionLineId;
  name: string;
  supervisorName: string;
}

// Quality Inspection Area (Final Product or Process)
export type InspectionCategory = 'FINAL_PRODUCT' | 'PROCESS_AUDIT';

// Checklist item definition for Final Product Inspection
export interface ChecklistItem {
  id: string;
  label: string; // Arabic label
  category: 'exterior' | 'cooling' | 'electrical' | 'safety' | 'accessories';
  description: string;
}

// Quality defect categories & options
export interface DefectOption {
  id: string;
  label: string; // Arabic name
  category: 'exterior' | 'cooling' | 'electrical' | 'safety' | 'accessories';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
}

// Inspection Log (Final Product)
export interface QualityInspectionLog {
  id: string;
  serialNumber: string; // Unique Fridge Serial Number
  modelId: string;
  lineId: ProductionLineId;
  inspectorSap: string;
  inspectorName: string;
  timestamp: string; // ISO String
  status: 'PASS' | 'FAIL';
  checkedItems: Record<string, boolean>; // checklistItemId -> isPassed
  defects: {
    defectOptionId: string;
    details?: string;
  }[];
  supervisorApproved?: boolean;
  approvalTimestamp?: string;
  recheckStatus?: 'PENDING' | 'APPROVED_AFTER_REPAIR' | 'SCRAPPED';
  factoryBData?: any;
  exportCountry?: string;
}

// Process Quality Audit Log (Audit of the workstations and parameters)
export interface ProcessAuditLog {
  id: string;
  lineId: ProductionLineId;
  auditorId: string; // Supervisor or Engineer
  auditorName: string;
  timestamp: string;
  weldingStationTemp: number; // e.g. 380°C
  weldingOK: boolean;
  foamingDensity: number; // e.g. 38 kg/m3
  foamingOK: boolean;
  gasChargingPressure: number; // e.g. 2.4 bar
  gasChargingOK: boolean;
  vacuumLevel: number; // e.g. 0.05 mbar
  vacuumOK: boolean;
  safetyGroundLeakageOK: boolean;
  notes?: string;
}
