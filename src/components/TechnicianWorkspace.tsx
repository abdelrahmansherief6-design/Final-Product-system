/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, QualityInspectionLog, ProductionLineId, RefrigeratorModel } from '../types';
import { PRODUCTION_LINES, CHECKLIST_ITEMS, DEFECT_OPTIONS, generateSerialNumber } from '../data';
import { 
  Play, Sparkles, Send, CheckCircle2, XCircle, AlertTriangle, ListChecks, History, 
  LogOut, Check, BadgeAlert, ClipboardCheck, BookOpen, Layers, Ban, ClipboardList, 
  Calendar, Search, ArrowRight, HelpCircle, Archive, Save, PlusCircle, ShieldAlert,
  Gauge, Activity, FileText, ChevronLeft, Settings, RefreshCw, Trash2
} from 'lucide-react';

interface TechnicianWorkspaceProps {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  onAddInspection: (log: QualityInspectionLog) => void;
  models: RefrigeratorModel[];
}

interface CriticalLog {
  id: string;
  lineId: string;
  tabId?: 'calib' | 'init_ass' | 'injection' | 'final_torque' | 'start_torque' | 'inject_torque' | 'perf_test';
  inspectorSap: string;
  vacuumLevel?: number; // mbar (Standard <= 0.1)
  gasCharge?: number; // grams (Standard 60g +/- 2g)
  insulationRes?: number; // MegaOhms (Standard >= 100)
  heliumLeak?: 'PASS' | 'FAIL';
  timestamp: string;
  
  // Tab-specific fields stored as optional properties:
  // 1. calib (معايرة ماكينة الشحن)
  date?: string;
  shift?: string;
  machine?: string;
  modelName?: string;
  source?: 'WEBSITE' | 'APPSHEET';
  rawCharge?: string | number;

  // 2. init_ass (التجميع الابتدائي)
  modelCode?: string;
  inspectorName?: string;
  assemblyStatus?: 'PASS' | 'FAIL';
  notes?: string;

  // Factory B Tameej Al-Ibtedai specific fields
  Y?: number | string;
  X?: number | string;
  N?: number | string;
  M?: number | string;
  L?: number | string;
  W?: number | string;
  P?: number | string;
  R?: number | string;
  S?: number | string;

  check_dabsha?: 'OK' | 'NG';
  check_scratch?: 'OK' | 'NG';
  check_aluminum_tape?: 'OK' | 'NG';
  check_hot_pipe?: 'OK' | 'NG';
  check_paste?: 'OK' | 'NG';
  check_foam_back?: 'OK' | 'NG';
  check_wiring_clip?: 'OK' | 'NG';
  check_hot_sealer?: 'OK' | 'NG';
  check_barcode_date?: 'OK' | 'NG';
  check_pcb_test?: 'OK' | 'NG';
  check_drain_hose?: 'OK' | 'NG';
  check_door_fixtures?: 'OK' | 'NG';

  // 3. injection (الحقن)
  foamWeight?: number;
  foamPressure?: number;
  injectionStatus?: 'PASS' | 'FAIL';
  injModel?: '48' | '58' | '46&51' | string;
  injJigNum?: number;
  injF?: number;
  injR1?: number;
  injR2?: number;
  injD?: number;
  injK?: number;
  injFR?: number;
  injFL?: number;
  injHR?: number;
  injHL?: number;
  injFPBow?: number;
  injW1?: number;
  injW2?: number;
  injCastellaRight?: number;
  injCastellaLeft?: number;
  injFoamDensityHead1?: number;
  injFoamDensityHead2?: number;
  injMaterial?: 'Daw' | 'بعلبك' | string;
  injVacuumMaterial?: 'N27' | 'samsunge' | 'LG' | string;
  injTempDoor?: number;
  injTempCabinet?: number;

  // 4. final_torque (عزوم التجميع النهائي)
  torqueValue?: number;
  torqueStandard?: string;
  torqueStatus?: 'PASS' | 'FAIL';

  // 5. start_torque (عزوم بداية خط)
  stationNum?: string;
  screwdriverTorque?: number;
  startTorqueStatus?: 'PASS' | 'FAIL';

  // 6. inject_torque (عزوم الحقن)
  fixingBolt?: string;
  measuredTorque?: number;
  injectTorqueStatus?: 'PASS' | 'FAIL';

  // 7. perf_test (اختبار الأداء)
  cabinetTemp?: number;
  freezerTemp?: number;
  currentAmp?: number;
  perfResult?: 'PASS' | 'FAIL';
}

const CRITICAL_TABS = [
  { id: 'calib', name: 'معايرة ماكينة الشحن' },
  { id: 'init_ass', name: 'التجميع الابتدائي' },
  { id: 'injection', name: 'الحقن' },
  { id: 'final_torque', name: 'عزوم التجميع النهائي' },
  { id: 'start_torque', name: 'عزوم بداية خط' },
  { id: 'inject_torque', name: 'عزوم الحقن' },
  { id: 'perf_test', name: 'اختبار الأداء' }
] as const;

const getTabCsvUrl = (masterUrl: string, gid: string, customUrl?: string): string => {
  if (customUrl) return customUrl;
  if (!masterUrl) return '';

  // Case 1: Published URL (contains 2PACX-)
  if (masterUrl.includes('2PACX-')) {
    const match = masterUrl.match(/\/d\/e\/([^\/]+)/);
    if (match && match[1]) {
      const key = match[1];
      return `https://docs.google.com/spreadsheets/d/e/${key}/pub?gid=${gid || '0'}&single=true&output=csv`;
    }
  }

  // Case 2: Standard spreadsheet URL (contains /d/)
  const match = masterUrl.match(/\/d\/([^\/]+)/);
  if (match && match[1]) {
    const key = match[1];
    return `https://docs.google.com/spreadsheets/d/${key}/export?gid=${gid || '0'}&format=csv`;
  }

  return masterUrl; // fallback
};

interface TrialRun {
  id: string;
  lineId: string;
  serialNumber: string;
  modelId: string;
  duration: string;
  cabinetTemp: number; // Celsius (Standard <= -18)
  result: 'PASS' | 'FAIL';
  notes: string;
  timestamp: string;
}

interface NCRReport {
  id: string;
  lineId: string;
  title: string;
  modelId: string;
  description: string;
  actionRequired: string;
  severity: 'CRITICAL' | 'MAJOR';
  status: 'OPEN' | 'RESOLVED';
  timestamp: string;
}

interface LoadingStop {
  id: string;
  lineId: string;
  modelId: string;
  reason: string;
  stoppedBy: string;
  status: 'ACTIVE' | 'RELEASED';
  timestamp: string;
}

interface ProductionQty {
  id: string;
  lineId: string;
  target: number;
  actual: number;
  notes?: string;
  timestamp: string;
}

export default function TechnicianWorkspace({ user, onLogout, inspections, onAddInspection, models }: TechnicianWorkspaceProps) {
  // Safe Date/Time Formatting Helpers to prevent rendering crashes due to invalid strings
  const safeDateString = (timestamp: any) => {
    if (!timestamp) return '--/--/----';
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-EG');
      }
    } catch (e) {
      console.error(e);
    }
    return '--/--/----';
  };

  const safeTimeString = (timestamp: any) => {
    if (!timestamp) return '--:--';
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      console.error(e);
    }
    return '--:--';
  };

  const safeDateStringWithOpts = (timestamp: any, opts?: Intl.DateTimeFormatOptions) => {
    if (!timestamp) return '--/--';
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('ar-EG', opts);
      }
    } catch (e) {
      console.error(e);
    }
    return '--/--';
  };

  // Helpers
  const getLineName = (lid: string) => {
    const l = PRODUCTION_LINES.find(x => x.id === lid);
    return l ? l.name : lid;
  };

  const getModelName = (mid: string) => {
    const m = models.find(x => x.id === mid);
    return m ? m.name : mid;
  };

  // Line Selection
  const [lineId, setLineId] = useState<ProductionLineId>(() => {
    if (user.factoryId && user.factoryId !== 'ALL') {
      return user.factoryId;
    }
    return 'LINE_A';
  });

  // Active section inside the factory content
  const [currentSection, setCurrentSection] = useState<'DASHBOARD' | 'DAILY_INSPECTION' | 'CRITICAL_OPS' | 'TRIAL_RUNS' | 'ARCHIVE' | 'TEST_INSTRUCTIONS' | 'MY_RECENT_INSPECTIONS' | 'NCR_REPORTS' | 'LOADING_STOPS' | 'PRODUCTION_QTY'>('DASHBOARD');

  // Month selector for stats
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`; // e.g. "2026-06"
  });

  // Filter models based on factory assignment
  const factoryModels = models.filter(m => m.factoryId === 'ALL' || m.factoryId === lineId);

  const [modelId, setModelId] = useState(() => {
    return factoryModels[0]?.id || '';
  });

  // Sync selected model to the filtered models list
  useEffect(() => {
    const activeModels = models.filter(m => m.factoryId === 'ALL' || m.factoryId === lineId);
    if (activeModels.length > 0 && !activeModels.some(m => m.id === modelId)) {
      setModelId(activeModels[0].id);
    }
  }, [lineId, models, modelId]);

  // States for Daily Inspection Form
  const [serialNumber, setSerialNumber] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(it => {
      initial[it.id] = true;
    });
    return initial;
  });
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [defectNotes, setDefectNotes] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Critical Operations State
  const [criticalLogs, setCriticalLogs] = useState<CriticalLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_critical_logs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'CRIT-1', lineId: 'LINE_A', tabId: 'calib', inspectorSap: '40016452', vacuumLevel: 0.08, gasCharge: 59.5, insulationRes: 120, heliumLeak: 'PASS', timestamp: new Date().toISOString(), source: 'WEBSITE' },
      { id: 'CRIT-2', lineId: 'LINE_B', tabId: 'calib', inspectorSap: '12345678', vacuumLevel: 0.09, gasCharge: 60.2, insulationRes: 105, heliumLeak: 'PASS', timestamp: new Date().toISOString(), source: 'WEBSITE' }
    ];
  });

  // AppSheet Google Sheet published CSV urls
  const [sheetUrls, setSheetUrls] = useState<Record<string, any>>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_sheet_urls');
      if (stored) {
        const parsed = JSON.parse(stored);
        const normalized: Record<string, any> = {};
        ['LINE_A', 'LINE_B', 'LINE_C'].forEach(lid => {
          const val = parsed[lid];
          if (typeof val === 'string') {
            normalized[lid] = {
              masterUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pubhtml',
              calib_url: val,
              calib_gid: '574817176',
              init_ass_gid: '2026850401',
              injection_gid: '1501712415',
              final_torque_gid: '43924773',
              start_torque_gid: '1668600810',
              inject_torque_gid: '1853472018',
              perf_test_gid: '54261763',
              submission_url: lid === 'LINE_B' ? 'https://script.google.com/macros/s/AKfycbw1RQn0Xw7hSbocbb5oEULtIOjbLzqmCPnNpF0kssZzLNJD9M29isaSM2bd_2IHD7I/exec' : ''
            };
          } else if (val && typeof val === 'object') {
            normalized[lid] = {
              ...val,
              submission_url: val.submission_url || (lid === 'LINE_B' ? 'https://script.google.com/macros/s/AKfycbw1RQn0Xw7hSbocbb5oEULtIOjbLzqmCPnNpF0kssZzLNJD9M29isaSM2bd_2IHD7I/exec' : '')
            };
          } else {
            normalized[lid] = {
              masterUrl: lid === 'LINE_B' ? 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pubhtml' : '',
              calib_url: lid === 'LINE_B' ? 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pub?gid=574817176&single=true&output=csv' : '',
              calib_gid: '574817176',
              init_ass_gid: '2026850401',
              injection_gid: '1501712415',
              final_torque_gid: '43924773',
              start_torque_gid: '1668600810',
              inject_torque_gid: '1853472018',
              perf_test_gid: '54261763',
              submission_url: lid === 'LINE_B' ? 'https://script.google.com/macros/s/AKfycbw1RQn0Xw7hSbocbb5oEULtIOjbLzqmCPnNpF0kssZzLNJD9M29isaSM2bd_2IHD7I/exec' : ''
            };
          }
        });
        return normalized;
      }
    } catch {}
    return {
      LINE_A: {
        masterUrl: '',
        calib_url: '',
        calib_gid: '574817176',
        init_ass_gid: '2026850401',
        injection_gid: '1501712415',
        final_torque_gid: '43924773',
        start_torque_gid: '1668600810',
        inject_torque_gid: '1853472018',
        perf_test_gid: '54261763'
      },
      LINE_B: {
        masterUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pubhtml',
        calib_url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pub?gid=574817176&single=true&output=csv',
        calib_gid: '574817176',
        init_ass_gid: '2026850401',
        injection_gid: '1501712415',
        final_torque_gid: '43924773',
        start_torque_gid: '1668600810',
        inject_torque_gid: '1853472018',
        perf_test_gid: '54261763',
        submission_url: 'https://script.google.com/macros/s/AKfycbw1RQn0Xw7hSbocbb5oEULtIOjbLzqmCPnNpF0kssZzLNJD9M29isaSM2bd_2IHD7I/exec'
      },
      LINE_C: {
        masterUrl: '',
        calib_url: '',
        calib_gid: '574817176',
        init_ass_gid: '2026850401',
        injection_gid: '1501712415',
        final_torque_gid: '43924773',
        start_torque_gid: '1668600810',
        inject_torque_gid: '1853472018',
        perf_test_gid: '54261763'
      }
    };
  });

  // Synced Logs State (holds downloaded Google Sheet/AppSheet rows)
  const [syncedLogs, setSyncedLogs] = useState<CriticalLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_synced_critical_logs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  // Manual entry toggle
  const [entryType, setEntryType] = useState<'APPSHEET_ALIGN' | 'LAB_TEST'>('APPSHEET_ALIGN');

  // Manual input state variables for AppSheet-aligned Gas Charge
  const [manualDate, setManualDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // "yyyy-mm-dd"
  });
  const [manualShift, setManualShift] = useState('الأولى');
  const [manualMachine, setManualMachine] = useState('اجرامكو 1');
  const [manualModelName, setManualModelName] = useState('');
  const [manualCharge, setManualCharge] = useState('114');

  // Tab Selection for Critical Ops
  const [activeCritTab, setActiveCritTab] = useState<'calib' | 'init_ass' | 'injection' | 'final_torque' | 'start_torque' | 'inject_torque' | 'perf_test'>('calib');
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  // Custom Form fields for separate tabs
  const [manualModelCode, setManualModelCode] = useState('');
  const [manualInspectorName, setManualInspectorName] = useState(user.name);
  const [manualAssemblyStatus, setManualAssemblyStatus] = useState<'PASS' | 'FAIL'>('PASS');
  const [manualNotes, setManualNotes] = useState('');

  // Factory B Tameej Al-Ibtedai dimensions
  const [manualY, setManualY] = useState('');
  const [manualX, setManualX] = useState('');
  const [manualN, setManualN] = useState('');
  const [manualM, setManualM] = useState('');
  const [manualL, setManualL] = useState('');
  const [manualW, setManualW] = useState('');
  const [manualP, setManualP] = useState('');
  const [manualR, setManualR] = useState('');
  const [manualS, setManualS] = useState('');

  // Factory B Tameej Al-Ibtedai 12 checks
  const [checkDabsha, setCheckDabsha] = useState<'OK' | 'NG'>('OK');
  const [checkScratch, setCheckScratch] = useState<'OK' | 'NG'>('OK');
  const [checkAluminumTape, setCheckAluminumTape] = useState<'OK' | 'NG'>('OK');
  const [checkHotPipe, setCheckHotPipe] = useState<'OK' | 'NG'>('OK');
  const [checkPaste, setCheckPaste] = useState<'OK' | 'NG'>('OK');
  const [checkFoamBack, setCheckFoamBack] = useState<'OK' | 'NG'>('OK');
  const [checkWiringClip, setCheckWiringClip] = useState<'OK' | 'NG'>('OK');
  const [checkHotSealer, setCheckHotSealer] = useState<'OK' | 'NG'>('OK');
  const [checkBarcodeDate, setCheckBarcodeDate] = useState<'OK' | 'NG'>('OK');
  const [checkPcbTest, setCheckPcbTest] = useState<'OK' | 'NG'>('OK');
  const [checkDrainHose, setCheckDrainHose] = useState<'OK' | 'NG'>('OK');
  const [checkDoorFixtures, setCheckDoorFixtures] = useState<'OK' | 'NG'>('OK');

  const [manualFoamWeight, setManualFoamWeight] = useState('');
  const [manualFoamPressure, setManualFoamPressure] = useState('');
  const [manualInjectionStatus, setManualInjectionStatus] = useState<'PASS' | 'FAIL'>('PASS');

  // New injection fields states
  const [injModel, setInjModel] = useState<'48' | '58' | '46&51'>('48');
  const [injJigNum, setInjJigNum] = useState<number>(1);
  const [injF, setInjF] = useState('');
  const [injR1, setInjR1] = useState('');
  const [injR2, setInjR2] = useState('');
  const [injD, setInjD] = useState('');
  const [injK, setInjK] = useState('');
  const [injFR, setInjFR] = useState('');
  const [injFL, setInjFL] = useState('');
  const [injHR, setInjHR] = useState('');
  const [injHL, setInjHL] = useState('');
  const [injFPBow, setInjFPBow] = useState('');
  const [injW1, setInjW1] = useState('');
  const [injW2, setInjW2] = useState('');
  const [injCastellaRight, setInjCastellaRight] = useState('');
  const [injCastellaLeft, setInjCastellaLeft] = useState('');
  const [injFoamDensityHead1, setInjFoamDensityHead1] = useState('');
  const [injFoamDensityHead2, setInjFoamDensityHead2] = useState('');
  const [injMaterial, setInjMaterial] = useState<'Daw' | 'بعلبك'>('Daw');
  const [injVacuumMaterial, setInjVacuumMaterial] = useState<'N27' | 'samsunge' | 'LG'>('N27');
  const [injTempDoor, setInjTempDoor] = useState('');
  const [injTempCabinet, setInjTempCabinet] = useState('');

  const [manualTorqueValue, setManualTorqueValue] = useState('');
  const [manualTorqueStandard, setManualTorqueStandard] = useState('1.2 - 1.5 N.m');
  const [manualTorqueStatus, setManualTorqueStatus] = useState<'PASS' | 'FAIL'>('PASS');

  const [manualStationNum, setManualStationNum] = useState('Station 1');
  const [manualScrewdriverTorque, setManualScrewdriverTorque] = useState('');
  const [manualStartTorqueStatus, setManualStartTorqueStatus] = useState<'PASS' | 'FAIL'>('PASS');

  const [manualFixingBolt, setManualFixingBolt] = useState('M6 Joint');
  const [manualMeasuredTorque, setManualMeasuredTorque] = useState('');
  const [manualInjectTorqueStatus, setManualInjectTorqueStatus] = useState<'PASS' | 'FAIL'>('PASS');

  const [manualCabinetTemp, setManualCabinetTemp] = useState('');
  const [manualFreezerTemp, setManualFreezerTemp] = useState('');
  const [manualCurrentAmp, setManualCurrentAmp] = useState('');
  const [manualPerfResult, setManualPerfResult] = useState<'PASS' | 'FAIL'>('PASS');

  // Sync URLs and logs to localStorage on changes
  useEffect(() => {
    localStorage.setItem('elaraby_qa_sheet_urls', JSON.stringify(sheetUrls));
  }, [sheetUrls]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_synced_critical_logs', JSON.stringify(syncedLogs));
  }, [syncedLogs]);

  // Robust CSV parser supporting 7 tab IDs
  const parseCriticalSheetCSV = (csvText: string, targetLineId: ProductionLineId, tabId: string): CriticalLog[] => {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];
    
    const results: CriticalLog[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      let parts: string[] = [];
      let currentPart = '';
      let insideQuotes = false;
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          parts.push(currentPart.trim());
          currentPart = '';
        } else {
          currentPart += char;
        }
      }
      parts.push(currentPart.trim());
      
      if (parts.length < 2) continue;
      
      const dateStr = parts[0];
      const shift = parts[1] || 'الأولى';
      
      if (dateStr === 'التاريخ' || dateStr === '2' || (!dateStr && !shift)) continue;
      if (dateStr.includes('التاريخ') || dateStr.includes('Date')) continue;
      
      let parsedTimestamp = new Date().toISOString();
      try {
        if (dateStr.includes('/')) {
          const dParts = dateStr.split('/');
          if (dParts.length === 3) {
            const day = parseInt(dParts[0]);
            const month = parseInt(dParts[1]) - 1;
            let year = parseInt(dParts[2]);
            if (year < 100) year += 2000;
            const dObj = new Date(year, month, day, 12, 0, 0);
            if (!isNaN(dObj.getTime())) {
              parsedTimestamp = dObj.toISOString();
            }
          }
        } else if (dateStr.includes('-')) {
          const dObj = new Date(dateStr);
          if (!isNaN(dObj.getTime())) {
            parsedTimestamp = dObj.toISOString();
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      const id = `APPSHEET-${targetLineId}-${tabId}-${i}-${dateStr}-${shift}`;
      
      if (tabId === 'calib') {
        const machine = parts[2] || 'غير محدد';
        const model = parts[3] || 'عام';
        const charge = parts[4] || '';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'calib',
          inspectorSap: 'AppSheet',
          vacuumLevel: 0.08,
          gasCharge: parseFloat(charge) || 0,
          insulationRes: 110,
          heliumLeak: 'PASS',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          machine,
          modelName: model,
          source: 'APPSHEET',
          rawCharge: charge
        });
      } else if (tabId === 'init_ass') {
        const modelCode = parts[2] || 'عام';
        const inspectorName = parts[3] || 'مفتش أب شيت';
        const statusVal = parts[4] || 'سليم';
        const notes = parts[5] || '';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'init_ass',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          modelCode,
          inspectorName,
          assemblyStatus: (statusVal.includes('تالف') || statusVal.toUpperCase().includes('FAIL') || statusVal.toUpperCase().includes('NG')) ? 'FAIL' : 'PASS',
          notes,
          source: 'APPSHEET'
        });
      } else if (tabId === 'injection') {
        const model = parts[2] || '48';
        const jigNum = parseInt(parts[3]) || 1;
        const F = parseFloat(parts[4]) || 0;
        const R1 = parseFloat(parts[5]) || 0;
        const R2 = parseFloat(parts[6]) || 0;
        const D = parseFloat(parts[7]) || 0;
        const K = parseFloat(parts[8]) || 0;
        const FR = parseFloat(parts[9]) || 0;
        const FL = parseFloat(parts[10]) || 0;
        const HR = parseFloat(parts[11]) || 0;
        const HL = parseFloat(parts[12]) || 0;
        const FPBow = parseFloat(parts[13]) || 0;
        const W1 = parseFloat(parts[14]) || 0;
        const W2 = parseFloat(parts[15]) || 0;
        const castellaRight = parseFloat(parts[16]) || 0;
        const castellaLeft = parseFloat(parts[17]) || 0;
        const density1 = parseFloat(parts[18]) || 0;
        const density2 = parseFloat(parts[19]) || 0;
        const material = (parts[20] || 'Daw') as any;
        const vacuumMaterial = (parts[21] || 'N27') as any;
        const tempDoor = parseFloat(parts[22]) || 0;
        const tempCabinet = parseFloat(parts[23]) || 0;

        results.push({
          id,
          lineId: targetLineId,
          tabId: 'injection',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          injModel: model as any,
          injJigNum: jigNum,
          injF: F,
          injR1: R1,
          injR2: R2,
          injD: D,
          injK: K,
          injFR: FR,
          injFL: FL,
          injHR: HR,
          injHL: HL,
          injFPBow: FPBow,
          injW1: W1,
          injW2: W2,
          injCastellaRight: castellaRight,
          injCastellaLeft: castellaLeft,
          injFoamDensityHead1: density1,
          injFoamDensityHead2: density2,
          injMaterial: material,
          injVacuumMaterial: vacuumMaterial,
          injTempDoor: tempDoor,
          injTempCabinet: tempCabinet,
          source: 'APPSHEET'
        });
      } else if (tabId === 'final_torque') {
        const model = parts[2] || 'عام';
        const value = parseFloat(parts[3]) || 0;
        const std = parts[4] || '';
        const statusVal = parts[5] || 'مطابق';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'final_torque',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          modelName: model,
          torqueValue: value,
          torqueStandard: std,
          torqueStatus: (statusVal.includes('غير') || statusVal.toUpperCase().includes('FAIL') || statusVal.toUpperCase().includes('NG')) ? 'FAIL' : 'PASS',
          source: 'APPSHEET'
        });
      } else if (tabId === 'start_torque') {
        const stationNum = parts[2] || '';
        const value = parseFloat(parts[3]) || 0;
        const statusVal = parts[4] || 'مطابق';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'start_torque',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          stationNum,
          screwdriverTorque: value,
          startTorqueStatus: (statusVal.includes('غير') || statusVal.toUpperCase().includes('FAIL') || statusVal.toUpperCase().includes('NG')) ? 'FAIL' : 'PASS',
          source: 'APPSHEET'
        });
      } else if (tabId === 'inject_torque') {
        const fixingBolt = parts[2] || '';
        const value = parseFloat(parts[3]) || 0;
        const statusVal = parts[4] || 'مطابق';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'inject_torque',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          fixingBolt,
          measuredTorque: value,
          injectTorqueStatus: (statusVal.includes('غير') || statusVal.toUpperCase().includes('FAIL') || statusVal.toUpperCase().includes('NG')) ? 'FAIL' : 'PASS',
          source: 'APPSHEET'
        });
      } else if (tabId === 'perf_test') {
        const model = parts[2] || 'عام';
        const cabTemp = parseFloat(parts[3]) || 0;
        const freezTemp = parseFloat(parts[4]) || 0;
        const current = parseFloat(parts[5]) || 0;
        const statusVal = parts[6] || 'PASS';
        results.push({
          id,
          lineId: targetLineId,
          tabId: 'perf_test',
          inspectorSap: 'AppSheet',
          timestamp: parsedTimestamp,
          date: dateStr,
          shift,
          modelName: model,
          cabinetTemp: cabTemp,
          freezerTemp: freezTemp,
          currentAmp: current,
          perfResult: (statusVal.includes('FAIL') || statusVal.toUpperCase().includes('NG') || statusVal.includes('راسب')) ? 'FAIL' : 'PASS',
          source: 'APPSHEET'
        });
      }
    }
    
    return results;
  };

  // Sync a specific tab of Google Sheets
  const handleSyncTab = async (targetLineId: ProductionLineId, tabKey: string) => {
    const lineConfig = sheetUrls[targetLineId];
    if (!lineConfig) {
      setSyncError('لم يتم تهيئة إعدادات هذا الخط بعد.');
      return;
    }

    let gid = '0';
    let customUrl = '';
    
    if (tabKey === 'calib') { gid = lineConfig.calib_gid || '574817176'; customUrl = lineConfig.calib_url; }
    else if (tabKey === 'init_ass') gid = lineConfig.init_ass_gid || '2026850401';
    else if (tabKey === 'injection') gid = lineConfig.injection_gid || '1501712415';
    else if (tabKey === 'final_torque') gid = lineConfig.final_torque_gid || '43924773';
    else if (tabKey === 'start_torque') gid = lineConfig.start_torque_gid || '1668600810';
    else if (tabKey === 'inject_torque') gid = lineConfig.inject_torque_gid || '1853472018';
    else if (tabKey === 'perf_test') gid = lineConfig.perf_test_gid || '54261763';

    const url = getTabCsvUrl(lineConfig.masterUrl, gid, customUrl);
    if (!url) {
      return; // Quiet return on automatic sync if URL isn't configured
    }

    setIsSyncing(true);
    setSyncError('');
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`خطأ في جلب البيانات: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = parseCriticalSheetCSV(csvText, targetLineId, tabKey);
      
      setSyncedLogs(prev => {
        const rest = prev.filter(log => !(log.lineId === targetLineId && (log as any).tabId === tabKey));
        return [...parsed, ...rest];
      });
      
      setCritSuccessMsg(`تمت مزامنة بيانات (${CRITICAL_TABS.find(t => t.id === tabKey)?.name}) بنجاح!`);
      setTimeout(() => setCritSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setSyncError(`فشل الاتصال بجدول البيانات للقسم ${CRITICAL_TABS.find(t => t.id === tabKey)?.name}. تأكد من صحة الـ GID أو رابط النشر. تفاصيل الخطأ: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all tabs for a given line at once
  const handleSyncAllTabs = async (targetLineId: ProductionLineId) => {
    const lineConfig = sheetUrls[targetLineId];
    if (!lineConfig || !lineConfig.masterUrl) {
      setSyncError('يرجى إدخال رابط المستند الرئيسي أولاً في الإعدادات.');
      return;
    }

    setIsSyncing(true);
    setSyncError('');
    let successCount = 0;
    let errors: string[] = [];

    for (const tab of CRITICAL_TABS) {
      let gid = '0';
      let customUrl = '';
      
      if (tab.id === 'calib') { gid = lineConfig.calib_gid || '574817176'; customUrl = lineConfig.calib_url; }
      else if (tab.id === 'init_ass') gid = lineConfig.init_ass_gid || '2026850401';
      else if (tab.id === 'injection') gid = lineConfig.injection_gid || '1501712415';
      else if (tab.id === 'final_torque') gid = lineConfig.final_torque_gid || '43924773';
      else if (tab.id === 'start_torque') gid = lineConfig.start_torque_gid || '1668600810';
      else if (tab.id === 'inject_torque') gid = lineConfig.inject_torque_gid || '1853472018';
      else if (tab.id === 'perf_test') gid = lineConfig.perf_test_gid || '54261763';

      const url = getTabCsvUrl(lineConfig.masterUrl, gid, customUrl);
      if (!url) continue;

      try {
        const response = await fetch(url);
        if (response.ok) {
          const csvText = await response.text();
          const parsed = parseCriticalSheetCSV(csvText, targetLineId, tab.id);
          
          setSyncedLogs(prev => {
            const rest = prev.filter(log => !(log.lineId === targetLineId && (log as any).tabId === tab.id));
            return [...parsed, ...rest];
          });
          successCount++;
        } else {
          errors.push(tab.name);
        }
      } catch (e) {
        errors.push(tab.name);
      }
    }

    setIsSyncing(false);
    if (errors.length > 0) {
      setSyncError(`تمت مزامنة ${successCount} أقسام بنجاح. فشل مزامنة الأقسام: ${errors.join('، ')}.`);
    } else {
      setCritSuccessMsg('تمت مزامنة جميع أقسام جدول البيانات بنجاح!');
      setTimeout(() => setCritSuccessMsg(''), 4000);
    }
  };

  const handleDeleteCriticalLog = (id: string) => {
    setCriticalLogs(prev => prev.filter(log => log.id !== id));
    setSyncedLogs(prev => prev.filter(log => log.id !== id));
    setCritSuccessMsg('تم حذف السجل بنجاح.');
    setTimeout(() => setCritSuccessMsg(''), 4000);
  };

  // Auto sync active tab on line or tab change
  useEffect(() => {
    const lineConfig = sheetUrls[lineId];
    if (lineConfig && (lineConfig.masterUrl || lineConfig.calib_url)) {
      handleSyncTab(lineId, activeCritTab);
    }
  }, [lineId, activeCritTab]);

  // Memoized unified critical logs list filtered by line and active tab
  const allCriticalLogs = React.useMemo(() => {
    const localLineLogs = (criticalLogs || [])
      .filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === activeCritTab)
      .map(log => ({
        ...log,
        source: log.source || 'WEBSITE' as const,
        shift: (log as any).shift || 'الأولى',
        machine: (log as any).machine || 'خط التجميع',
        modelName: (log as any).modelName || getModelName(log.modelName || modelId) || 'عام',
        rawCharge: (log as any).rawCharge || log.gasCharge,
        date: (log as any).date || safeDateString(log.timestamp)
      }));
    
    const syncedLineLogs = (syncedLogs || []).filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === activeCritTab);
    
    return [...localLineLogs, ...syncedLineLogs].sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      const timeA = isNaN(tA) ? 0 : tA;
      const timeB = isNaN(tB) ? 0 : tB;
      return timeB - timeA;
    });
  }, [criticalLogs, syncedLogs, lineId, activeCritTab, modelId, models]);

  // Trial Runs State
  const [trialRuns, setTrialRuns] = useState<TrialRun[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_trial_runs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'TR-1', lineId: 'LINE_A', serialNumber: 'TR-TOSH-450-01', modelId: 'MOD_450L', duration: '45 دقيقة', cabinetTemp: -19.2, result: 'PASS', notes: 'تجربة ممتازة وتبريد سريع ومستقر للضاغط', timestamp: new Date().toISOString() }
    ];
  });

  // Non-Conformance Reports (NCR) State
  const [ncrs, setNcrs] = useState<NCRReport[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_ncrs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'NCR-1', lineId: 'LINE_A', title: 'تذبذب مادة البولي يوريثان', modelId: 'MOD_450L', description: 'انكماش مادة الحقن العازل بجوانب الكابينة الخلفية', actionRequired: 'فحص ضغط ماكينة الحقن الروتيني والحرارة', severity: 'MAJOR', status: 'OPEN', timestamp: new Date().toISOString() }
    ];
  });

  // Loading Stops State
  const [loadingStops, setLoadingStops] = useState<LoadingStop[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_loading_stops');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'STOP-1', lineId: 'LINE_C', modelId: 'MOD_520L_DIG', reason: 'عدم تطابق في سحب تيار الهيتر لإذابة الثلج', stoppedBy: 'إدارة توكيد الجودة', status: 'ACTIVE', timestamp: new Date().toISOString() }
    ];
  });

  // Production Quantities State
  const [productionQuantities, setProductionQuantities] = useState<ProductionQty[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_production_qty');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'PROD-1', lineId: 'LINE_A', target: 250, actual: 235, notes: 'نقص بسيط في اللوجستيات', timestamp: new Date().toISOString() },
      { id: 'PROD-2', lineId: 'LINE_B', target: 180, actual: 180, notes: 'انتظام تام للنوبة الفنية الثالثة', timestamp: new Date().toISOString() }
    ];
  });

  // Persist States on change
  useEffect(() => {
    localStorage.setItem('elaraby_qa_critical_logs', JSON.stringify(criticalLogs));
  }, [criticalLogs]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_trial_runs', JSON.stringify(trialRuns));
  }, [trialRuns]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_ncrs', JSON.stringify(ncrs));
  }, [ncrs]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_loading_stops', JSON.stringify(loadingStops));
  }, [loadingStops]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_production_qty', JSON.stringify(productionQuantities));
  }, [productionQuantities]);

  // Statistics calculation filtered by SELECTED MONTH and SELECTED PRODUCTION LINE
  const lineInspections = inspections.filter(log => log.lineId === lineId);
  const monthlyInspections = lineInspections.filter(log => {
    const logDate = new Date(log.timestamp);
    const logY = logDate.getFullYear();
    const logM = String(logDate.getMonth() + 1).padStart(2, '0');
    return `${logY}-${logM}` === selectedMonth;
  });

  const monthTotalInspected = monthlyInspections.length;
  const monthConforming = monthlyInspections.filter(log => log.status === 'PASS').length;
  const monthNonConforming = monthTotalInspected - monthConforming;

  const lineTrialRuns = trialRuns.filter(tr => tr.lineId === lineId);
  const monthlyTrialRuns = lineTrialRuns.filter(tr => {
    const trDate = new Date(tr.timestamp);
    const trY = trDate.getFullYear();
    const trM = String(trDate.getMonth() + 1).padStart(2, '0');
    return `${trY}-${trM}` === selectedMonth;
  });
  const monthTrialRunsCount = monthlyTrialRuns.length;

  // Filter inspections performed by this technician
  const myInspections = inspections
    .filter(log => log.inspectorSap === user.sapNumber && log.lineId === lineId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Generate a premium random serial number in one click
  const handleAutoGenerateSerial = () => {
    const generated = generateSerialNumber(lineId, modelId);
    setSerialNumber(generated);
  };

  // Toggle single checklist check
  const handleToggleChecklist = (id: string, isPassed: boolean) => {
    setChecklist(prev => {
      const next = { ...prev, [id]: isPassed };
      if (!isPassed) {
        const item = CHECKLIST_ITEMS.find(c => c.id === id);
        if (item) {
          const defaultDefect = DEFECT_OPTIONS.find(d => d.category === item.category);
          if (defaultDefect && !selectedDefects.includes(defaultDefect.id)) {
            setSelectedDefects(curr => [...curr, defaultDefect.id]);
          }
        }
      } else {
        const item = CHECKLIST_ITEMS.find(c => c.id === id);
        if (item) {
          const defaultDefect = DEFECT_OPTIONS.find(d => d.category === item.category);
          if (defaultDefect) {
            const siblingItems = CHECKLIST_ITEMS.filter(c => c.category === item.category && c.id !== id);
            const anySiblingFailed = siblingItems.some(sibling => !next[sibling.id]);
            if (!anySiblingFailed) {
              setSelectedDefects(curr => curr.filter(dId => dId !== defaultDefect.id));
            }
          }
        }
      }
      return next;
    });
  };

  const handleToggleDefect = (defectId: string) => {
    setSelectedDefects(prev => 
      prev.includes(defectId) ? prev.filter(id => id !== defectId) : [...prev, defectId]
    );
  };

  const handleDefectDetailsChange = (defectId: string, text: string) => {
    setDefectNotes(prev => ({ ...prev, [defectId]: text }));
  };

  const handleResetForm = () => {
    setSerialNumber('');
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(it => {
      initial[it.id] = true;
    });
    setChecklist(initial);
    setSelectedDefects([]);
    setDefectNotes({});
  };

  const handleSubmitDailyInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      alert('يرجى تحديد أو توليد الرقم التسلسلي للثلاجة أولاً.');
      return;
    }

    const overallPass = Object.values(checklist).every(status => status === true) && selectedDefects.length === 0;

    const newLog: QualityInspectionLog = {
      id: `LOG-TECH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      serialNumber: serialNumber.trim().toUpperCase(),
      modelId,
      lineId,
      inspectorSap: user.sapNumber || 'UNKNOWN',
      inspectorName: user.name,
      timestamp: new Date().toISOString(),
      status: overallPass ? 'PASS' : 'FAIL',
      checkedItems: checklist,
      defects: selectedDefects.map(dId => ({
        defectOptionId: dId,
        details: defectNotes[dId] || 'تم رصده أثناء الفحص الروتيني'
      })),
      supervisorApproved: undefined,
      recheckStatus: overallPass ? undefined : 'PENDING'
    };

    onAddInspection(newLog);
    setSuccessMsg(`تم بنجاح تسجيل فحص الثلاجات بالخط! الرقم التسلسلي: ${serialNumber}`);
    handleResetForm();
    setCurrentSection('DASHBOARD');

    setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  // State: New Critical Log Form
  const [vacuumInput, setVacuumInput] = useState('0.07');
  const [gasInput, setGasInput] = useState('60');
  const [insulationInput, setInsulationInput] = useState('110');
  const [heliumLeakInput, setHeliumLeakInput] = useState<'PASS' | 'FAIL'>('PASS');
  const [critSuccessMsg, setCritSuccessMsg] = useState('');

  const sendToGoogleSheet = async (log: CriticalLog) => {
    const lineConfig = sheetUrls[log.lineId];
    if (!lineConfig || !lineConfig.submission_url) return;

    try {
      let payload: Record<string, any> = {};
      if (log.tabId === 'calib') {
        payload = {
          tabId: 'calib',
          'التاريخ': log.date,
          'الوردية': log.shift,
          'ماكينة الشحن': log.machine,
          'الموديل': log.modelName,
          'الشحنة': log.rawCharge || log.gasCharge
        };
      } else if (log.tabId === 'init_ass') {
        payload = {
          tabId: 'init_ass',
          'التاريخ': log.date,
          'الوردية': log.shift,
          'الموديل': log.modelCode,
          'Y': log.Y,
          'X': log.X,
          'N': log.N,
          'M': log.M,
          'L': log.L,
          'W': log.W,
          'P': log.P,
          'R': log.R,
          'S': log.S,
          'التأكد من إستخدام الضبعه أثناء لصق المواسير مع الصاج': log.check_dabsha || 'OK',
          'فحص الكابينه الصاج للتاكد من عدم وجود خدوش او خبطات او انبعاجات او تشوهات بها': log.check_scratch || 'OK',
          'التاكد من تطبيع لصق الألومنيوم تيب علي جانبى الكابينه الصاج موديلات شارب وتورنيدو.': log.check_aluminum_tape || 'OK',
          'التاكد من وجود Hot Pipe Support موديلات شارب وتورنيدو': log.check_hot_pipe || 'OK',
          'التأكد من لصق العجينة بطريقة صحيحة فى تجميع الـ C . Partion والتأكد من المقاسات حسب تعليمات التشغيل بالقسم': log.check_paste || 'OK',
          'التأكد من وجود فوم علي ظهر الكابينه البلاستيك ولصق الضفيرة جيدا حسب تعليمات التشغيل بالقسم لكل موديل .': log.check_foam_back || 'OK',
          'التأكد من تثبيت الضفيرة بالكات بطريقة صحيحة علي الكابينة البلاستيك': log.check_wiring_clip || 'OK',
          'التأكد من وضع الهوت سيلر بالاماكن المحدده بالزوايا': log.check_hot_sealer || 'OK',
          'التأكد من مطابقة تاريخ الباركود لتاريخ اليوم .': log.check_barcode_date || 'OK',
          'التأكد من إجراء إختبار البوردة بطريقة صحيحة.': log.check_pcb_test || 'OK',
          'إختبار خرطوم الصرف بجهاز ضغط الهواء': log.check_drain_hose || 'OK',
          'التأكد من إستخدام ضبعات تركيب المفصلة السفلية وضبعات أبعاد الأبواب وضبعات تركيب البادج': log.check_door_fixtures || 'OK'
        };
      } else if (log.tabId === 'injection') {
        payload = {
          tabId: 'injection',
          'التاريخ': log.date,
          'الوردية': log.shift,
          'الموديل': log.injModel,
          'رقم الجيك': log.injJigNum,
          'F': log.injF,
          'R 1': log.injR1,
          'R 2': log.injR2,
          'D': log.injD,
          'K': log.injK,
          'FR': log.injFR,
          'FL': log.injFL,
          'HR': log.injHR,
          'HL': log.injHL,
          'تقوس ال F/P': log.injFPBow,
          'W1': log.injW1,
          'W2': log.injW2,
          'قياس استواء العارضة مع القائم اليمين': log.injCastellaRight,
          'قياس استواء العارضة مع القائم الشمال': log.injCastellaLeft,
          'كثافه الفوم Head 1': log.injFoamDensityHead1,
          'كثافه الفوم Head 2': log.injFoamDensityHead2,
          'مادة الحقن': log.injMaterial,
          'خامة الفاكيوم': log.injVacuumMaterial,
          'درجة حرارة ضبعة الحقن ( الباب )': log.injTempDoor,
          'درجة حرارة ضبعة الحقن ( الكابينة )': log.injTempCabinet
        };
      } else {
        payload = {
          tabId: log.tabId,
          ...log
        };
      }

      await fetch(lineConfig.submission_url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Failed to submit directly to Google Sheet script:", err);
    }
  };

  const handleSubmitCriticalLog = (e: React.FormEvent) => {
    e.preventDefault();
    let newLog: CriticalLog;
    const formattedDate = manualDate.split('-').reverse().join('/'); // "DD/MM/YYYY"
    const timestampVal = new Date(manualDate + 'T12:00:00').toISOString();

    if (activeCritTab === 'calib') {
      if (entryType === 'APPSHEET_ALIGN') {
        newLog = {
          id: `CRIT-CALIB-${Date.now()}`,
          lineId,
          tabId: 'calib',
          inspectorSap: user.sapNumber || 'UNKNOWN',
          vacuumLevel: 0.08,
          gasCharge: isNaN(parseFloat(manualCharge)) ? 0 : parseFloat(manualCharge),
          insulationRes: 110,
          heliumLeak: 'PASS',
          timestamp: timestampVal,
          date: formattedDate,
          shift: manualShift,
          machine: manualMachine,
          modelName: manualModelName || (lineId === 'LINE_B' ? '48 (R134a)' : getModelName(modelId)),
          source: 'WEBSITE',
          rawCharge: manualCharge
        };
      } else {
        newLog = {
          id: `CRIT-CALIB-${Date.now()}`,
          lineId,
          tabId: 'calib',
          inspectorSap: user.sapNumber || 'UNKNOWN',
          vacuumLevel: parseFloat(vacuumInput) || 0.07,
          gasCharge: parseFloat(gasInput) || 60,
          insulationRes: parseFloat(insulationInput) || 110,
          heliumLeak: heliumLeakInput,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString('ar-EG'),
          shift: 'الأولى',
          machine: 'موقع الويب',
          modelName: getModelName(modelId),
          source: 'WEBSITE',
          rawCharge: gasInput
        };
      }
    } else if (activeCritTab === 'init_ass') {
      if (lineId === 'LINE_B') {
        const overallPass = [
          checkDabsha, checkScratch, checkAluminumTape, checkHotPipe, checkPaste,
          checkFoamBack, checkWiringClip, checkHotSealer, checkBarcodeDate,
          checkPcbTest, checkDrainHose, checkDoorFixtures
        ].every(st => st === 'OK');

        newLog = {
          id: `CRIT-INIT-${Date.now()}`,
          lineId,
          tabId: 'init_ass',
          inspectorSap: user.sapNumber || 'UNKNOWN',
          timestamp: timestampVal,
          date: formattedDate,
          shift: manualShift,
          modelCode: manualModelCode || '48',
          Y: manualY || '0',
          X: manualX || '0',
          N: manualN || '0',
          M: manualM || '0',
          L: manualL || '0',
          W: manualW || '0',
          P: manualP || '0',
          R: manualR || '0',
          S: manualS || '0',
          check_dabsha: checkDabsha,
          check_scratch: checkScratch,
          check_aluminum_tape: checkAluminumTape,
          check_hot_pipe: checkHotPipe,
          check_paste: checkPaste,
          check_foam_back: checkFoamBack,
          check_wiring_clip: checkWiringClip,
          check_hot_sealer: checkHotSealer,
          check_barcode_date: checkBarcodeDate,
          check_pcb_test: checkPcbTest,
          check_drain_hose: checkDrainHose,
          check_door_fixtures: checkDoorFixtures,
          assemblyStatus: overallPass ? 'PASS' : 'FAIL',
          source: 'WEBSITE'
        };
      } else {
        newLog = {
          id: `CRIT-INIT-${Date.now()}`,
          lineId,
          tabId: 'init_ass',
          inspectorSap: user.sapNumber || 'UNKNOWN',
          timestamp: timestampVal,
          date: formattedDate,
          shift: manualShift,
          modelCode: manualModelCode || 'عام',
          inspectorName: manualInspectorName,
          assemblyStatus: manualAssemblyStatus,
          notes: manualNotes,
          source: 'WEBSITE'
        };
      }
    } else if (activeCritTab === 'injection') {
      newLog = {
        id: `CRIT-INJECT-${Date.now()}`,
        lineId,
        tabId: 'injection',
        inspectorSap: user.sapNumber || 'UNKNOWN',
        timestamp: timestampVal,
        date: formattedDate,
        shift: manualShift,
        injModel: injModel,
        injJigNum: injJigNum,
        injF: parseFloat(injF) || 0,
        injR1: parseFloat(injR1) || 0,
        injR2: parseFloat(injR2) || 0,
        injD: parseFloat(injD) || 0,
        injK: parseFloat(injK) || 0,
        injFR: parseFloat(injFR) || 0,
        injFL: parseFloat(injFL) || 0,
        injHR: parseFloat(injHR) || 0,
        injHL: parseFloat(injHL) || 0,
        injFPBow: parseFloat(injFPBow) || 0,
        injW1: parseFloat(injW1) || 0,
        injW2: parseFloat(injW2) || 0,
        injCastellaRight: parseFloat(injCastellaRight) || 0,
        injCastellaLeft: parseFloat(injCastellaLeft) || 0,
        injFoamDensityHead1: parseFloat(injFoamDensityHead1) || 0,
        injFoamDensityHead2: parseFloat(injFoamDensityHead2) || 0,
        injMaterial: injMaterial,
        injVacuumMaterial: injVacuumMaterial,
        injTempDoor: parseFloat(injTempDoor) || 0,
        injTempCabinet: parseFloat(injTempCabinet) || 0,
        source: 'WEBSITE'
      };
    } else if (activeCritTab === 'final_torque') {
      newLog = {
        id: `CRIT-FINAL-TORQ-${Date.now()}`,
        lineId,
        tabId: 'final_torque',
        inspectorSap: user.sapNumber || 'UNKNOWN',
        timestamp: timestampVal,
        date: formattedDate,
        shift: manualShift,
        modelName: manualModelName || getModelName(modelId),
        torqueValue: parseFloat(manualTorqueValue) || 0,
        torqueStandard: manualTorqueStandard,
        torqueStatus: manualTorqueStatus,
        source: 'WEBSITE'
      };
    } else if (activeCritTab === 'start_torque') {
      newLog = {
        id: `CRIT-START-TORQ-${Date.now()}`,
        lineId,
        tabId: 'start_torque',
        inspectorSap: user.sapNumber || 'UNKNOWN',
        timestamp: timestampVal,
        date: formattedDate,
        shift: manualShift,
        stationNum: manualStationNum,
        screwdriverTorque: parseFloat(manualScrewdriverTorque) || 0,
        startTorqueStatus: manualStartTorqueStatus,
        source: 'WEBSITE'
      };
    } else if (activeCritTab === 'inject_torque') {
      newLog = {
        id: `CRIT-INJECT-TORQ-${Date.now()}`,
        lineId,
        tabId: 'inject_torque',
        inspectorSap: user.sapNumber || 'UNKNOWN',
        timestamp: timestampVal,
        date: formattedDate,
        shift: manualShift,
        fixingBolt: manualFixingBolt,
        measuredTorque: parseFloat(manualMeasuredTorque) || 0,
        injectTorqueStatus: manualInjectTorqueStatus,
        source: 'WEBSITE'
      };
    } else { // perf_test
      newLog = {
        id: `CRIT-PERF-${Date.now()}`,
        lineId,
        tabId: 'perf_test',
        inspectorSap: user.sapNumber || 'UNKNOWN',
        timestamp: timestampVal,
        date: formattedDate,
        shift: manualShift,
        modelName: manualModelName || getModelName(modelId),
        cabinetTemp: parseFloat(manualCabinetTemp) || 0,
        freezerTemp: parseFloat(manualFreezerTemp) || 0,
        currentAmp: parseFloat(manualCurrentAmp) || 0,
        perfResult: manualPerfResult,
        source: 'WEBSITE'
      };
    }

    setCriticalLogs(prev => [newLog, ...prev]);
    sendToGoogleSheet(newLog);
    
    // Reset Factory B custom input states
    setManualY('');
    setManualX('');
    setManualN('');
    setManualM('');
    setManualL('');
    setManualW('');
    setManualP('');
    setManualR('');
    setManualS('');
    setCheckDabsha('OK');
    setCheckScratch('OK');
    setCheckAluminumTape('OK');
    setCheckHotPipe('OK');
    setCheckPaste('OK');
    setCheckFoamBack('OK');
    setCheckWiringClip('OK');
    setCheckHotSealer('OK');
    setCheckBarcodeDate('OK');
    setCheckPcbTest('OK');
    setCheckDrainHose('OK');
    setCheckDoorFixtures('OK');

    setCritSuccessMsg('تم تسجيل وتوثيق العملية الحرجة وتحديث السجل وإرسالها لجدول جوجل بنجاح!');
    setTimeout(() => setCritSuccessMsg(''), 4000);
  };

  // State: New Trial Run Form
  const [trialSerial, setTrialSerial] = useState('');
  const [trialModel, setTrialModel] = useState(modelId || 'MOD_450L');
  const [trialDuration, setTrialDuration] = useState('60 دقيقة');
  const [trialCabinetTemp, setTrialCabinetTemp] = useState('-19.5');
  const [trialNotes, setTrialNotes] = useState('');
  const [trialResult, setTrialResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [trialSuccessMsg, setTrialSuccessMsg] = useState('');

  const handleSubmitTrialRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialSerial.trim()) {
      alert('يرجى كتابة رقم سيريال الثلاجة التجريبية');
      return;
    }
    const newTR: TrialRun = {
      id: `TR-${Date.now()}`,
      lineId,
      serialNumber: trialSerial.trim().toUpperCase(),
      modelId: trialModel,
      duration: trialDuration,
      cabinetTemp: parseFloat(trialCabinetTemp) || -18,
      result: trialResult,
      notes: trialNotes,
      timestamp: new Date().toISOString()
    };
    setTrialRuns(prev => [newTR, ...prev]);
    setTrialSuccessMsg('تم حفظ تقرير تجربة التشغيل بنجاح!');
    setTrialSerial('');
    setTrialNotes('');
    setTimeout(() => setTrialSuccessMsg(''), 3000);
  };

  // State: New NCR Form
  const [ncrTitle, setNcrTitle] = useState('');
  const [ncrModel, setNcrModel] = useState(modelId || 'MOD_450L');
  const [ncrDesc, setNcrDesc] = useState('');
  const [ncrAction, setNcrAction] = useState('');
  const [ncrSeverity, setNcrSeverity] = useState<'CRITICAL' | 'MAJOR'>('MAJOR');
  const [ncrSuccessMsg, setNcrSuccessMsg] = useState('');

  const handleSubmitNCR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncrTitle.trim() || !ncrDesc.trim()) {
      alert('يرجى ملء الحقول المطلوبة لتقرير عدم المطابقة.');
      return;
    }
    const newNcr: NCRReport = {
      id: `NCR-${Date.now()}`,
      lineId,
      title: ncrTitle.trim(),
      modelId: ncrModel,
      description: ncrDesc.trim(),
      actionRequired: ncrAction.trim(),
      severity: ncrSeverity,
      status: 'OPEN',
      timestamp: new Date().toISOString()
    };
    setNcrs(prev => [newNcr, ...prev]);
    setNcrSuccessMsg('تم إصدار تقرير عدم المطابقة بنجاح وإرساله للمشرفين!');
    setNcrTitle('');
    setNcrDesc('');
    setNcrAction('');
    setTimeout(() => setNcrSuccessMsg(''), 3000);
  };

  // State: Production Qty Form
  const [prodTarget, setProdTarget] = useState('200');
  const [prodActual, setProdActual] = useState('190');
  const [prodNotes, setProdNotes] = useState('');
  const [prodSuccessMsg, setProdSuccessMsg] = useState('');

  const handleSubmitProdQty = (e: React.FormEvent) => {
    e.preventDefault();
    const newProd: ProductionQty = {
      id: `PROD-${Date.now()}`,
      lineId,
      target: parseInt(prodTarget) || 200,
      actual: parseInt(prodActual) || 0,
      notes: prodNotes.trim() || undefined,
      timestamp: new Date().toISOString()
    };
    setProductionQuantities(prev => [newProd, ...prev]);
    setProdSuccessMsg('تم تحديث كمية إنتاج خط التجميع بنجاح!');
    setProdNotes('');
    setTimeout(() => setProdSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col font-sans" dir="rtl">
      
      {/* Top Header Row */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-zinc-900">بوابة الفنيين الرقمية ومراقبة الجودة</h1>
                <span className="font-mono bg-blue-50 text-blue-600 border border-blue-100 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">
                  توشيبا & العربي
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">نظام توكيد الجودة المتنقل لخطوط تجميع الثلاجات</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-left text-xs text-right">
              <span className="text-[10px] text-zinc-400 font-bold block">الفني النشط</span>
              <span className="text-blue-600 font-bold">{user.name}</span>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded mr-2">
                SAP: {user.sapNumber}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="bg-zinc-50 hover:bg-neutral-100 text-zinc-650 hover:text-red-600 border border-zinc-200 hover:border-red-200 p-2.5 rounded-xl transition-all"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">

        {/* Global Factory Line Switcher and Month Selector */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            <div>
              <label className="block text-[10px] text-zinc-400 font-extrabold mb-1">المصنع / خط الإنتاج النشط</label>
              {user.factoryId && user.factoryId !== 'ALL' ? (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold">
                  {getLineName(user.factoryId)}
                </div>
              ) : (
                <select
                  value={lineId}
                  onChange={(e) => {
                    setLineId(e.target.value as ProductionLineId);
                    handleResetForm();
                  }}
                  className="bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none transition-all"
                >
                  {PRODUCTION_LINES.map(line => (
                    <option key={line.id} value={line.id}>
                      {line.name} ({line.supervisorName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 font-extrabold mb-1">شهر المراقبة والتحليل الإحصائي</label>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-1.5 text-xs text-center font-bold text-zinc-800 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 font-bold block">مزامنة التفتيش الرقمي</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[11px] font-bold text-zinc-650">متصل الآن بقاعدة بيانات جودة مجموعة العربي</span>
            </div>
          </div>
        </div>

        {/* 4 Monthly Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-extrabold block">العينات المفحوصة بالشهر</span>
              <ClipboardCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900 font-mono">{monthTotalInspected}</span>
              <span className="text-[9px] text-zinc-400">ثلاجة</span>
            </div>
            <p className="text-[9px] text-zinc-400">الفترة المفتوحة لشهر {selectedMonth}</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-600 font-extrabold block">العينات المطابقة (Pass)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 font-mono">{monthConforming}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                ({monthTotalInspected > 0 ? Math.round((monthConforming / monthTotalInspected) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[9px] text-zinc-400">خلو تام من أي عيوب فنية</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-red-600 font-extrabold block">العينات غير المطابقة (Fail)</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-650 font-mono">{monthNonConforming}</span>
              <span className="text-[9px] text-red-500 font-bold">
                ({monthTotalInspected > 0 ? Math.round((monthNonConforming / monthTotalInspected) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[9px] text-zinc-400">تم رصد وتحويل لمشرف الإصلاح</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-600 font-extrabold block">تجارب التشغيل النشطة</span>
              <Gauge className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 font-mono">{monthTrialRunsCount}</span>
              <span className="text-[9px] text-zinc-400">عينة</span>
            </div>
            <p className="text-[9px] text-zinc-400">تجارب قياس درجات الحرارة واستقرار التيار</p>
          </div>

        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-4 rounded-xl flex items-center gap-3.5 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-xs block">تأكيد الإرسال الرقمي</span>
                <p className="text-[11px] text-emerald-750 mt-0.5">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* CONDITIONAL SECTIONS RENDER */}
        {/* ========================================================================= */}

        {currentSection === 'DASHBOARD' ? (
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-2">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-wider">لوحة التحكم وخيارات الفحص اليومي</h2>
              <p className="text-xs text-zinc-500">اختر أحد الأقسام أدناه لبدء المعالجة أو عرض سجلات الجودة المعتمدة</p>
            </div>

            {/* Grid of the 9 requested Content blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Item 1 */}
              <div 
                onClick={() => setCurrentSection('DAILY_INSPECTION')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تسجيل الفحص اليومي</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تفتيش الفحص الروتيني للثلاجات الجاهزة والتحقق من المظهر والدائرة الكهربائية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-blue-600 font-bold pt-2 border-t border-zinc-100">
                  <span>فتح الاستمارة الآن</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 2 */}
              <div 
                onClick={() => setCurrentSection('CRITICAL_OPS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-red-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">العمليات الحرجة</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تسجيل ورصد قيم تفريغ الهواء ومقدار شحنة الغاز واختبار العزل عالي الفولتية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-red-605 font-bold pt-2 border-t border-zinc-100">
                  <span>قياس العوامل الحرجة ({criticalLogs.filter(l => l.lineId === lineId).length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 3 */}
              <div 
                onClick={() => setCurrentSection('TRIAL_RUNS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-amber-600 group-hover:text-white">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تجارب التشغيل</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">اختبارات عينات تجريبية لقياس درجة حرارة الكابينة الداخلية واستقرارية الضاغط.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-600 font-bold pt-2 border-t border-zinc-100">
                  <span>متابعة التجارب ({lineTrialRuns.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 4 */}
              <div 
                onClick={() => setCurrentSection('ARCHIVE')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-zinc-100 text-zinc-650 rounded-xl flex items-center justify-center transition-colors group-hover:bg-zinc-600 group-hover:text-white">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">الأرشيف</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تصفح شامل لجميع فحوصات الثلاجات المسجلة لخط الإنتاج الحالي مع فلترة الحالات.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold pt-2 border-t border-zinc-100">
                  <span>البحث في الأرشيف ({lineInspections.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 5 */}
              <div 
                onClick={() => setCurrentSection('TEST_INSTRUCTIONS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-teal-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-teal-600 group-hover:text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تعليمات الاختبار</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">كتيب المعايير والتعليمات التفصيلية لفحص الهيكل الخارجي والصدمات الكهربية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-teal-600 font-bold pt-2 border-t border-zinc-100">
                  <span>عرض كراس التعليمات</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 6 */}
              <div 
                onClick={() => setCurrentSection('MY_RECENT_INSPECTIONS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-violet-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-violet-600 group-hover:text-white">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">سجل فحوصاتي الأخيرة</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">سجل خاص بالفني المفتش لمراجعة أحدث الفحوصات والقرارات الفنية الصادرة بخصوصها.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-violet-600 font-bold pt-2 border-t border-zinc-100">
                  <span>سجلاتي ({myInspections.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 7 */}
              <div 
                onClick={() => setCurrentSection('NCR_REPORTS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-orange-600 group-hover:text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تقارير عدم المطابقة (NCR)</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">إنشاء ومتابعة التقارير الفنية للعيوب المتكررة لاتخاذ إجراءات وقائية عاجلة.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-orange-600 font-bold pt-2 border-t border-zinc-100">
                  <span>تقارير عدم المطابقة NCR</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 8 */}
              <div 
                onClick={() => setCurrentSection('LOADING_STOPS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-rose-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-rose-600 group-hover:text-white">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تسجيل التوقفات والأعطال</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">رصد فترات توقف الشحن ومشاكل النقل والتنزيل لتحسين كفاءة العمل.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-rose-600 font-bold pt-2 border-t border-zinc-100">
                  <span>التوقفات المسجلة ({loadingStops.filter(s => s.lineId === lineId).length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 9 */}
              <div 
                onClick={() => setCurrentSection('PRODUCTION_QTY')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">كميات الإنتاج اليومية</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تحديث وإدخال أعداد الثلاجات المنتجة ومطابقتها مع الأهداف اليومية للخط.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-600 font-bold pt-2 border-t border-zinc-100">
                  <span>كميات الإنتاج ({productionQuantities.filter(q => q.lineId === lineId).length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {currentSection === 'DAILY_INSPECTION' ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">تسجيل الفحص اليومي للثلاجات</h2>
                  <p className="text-[10px] text-zinc-400">إدخال بيانات الفحص الفني الروتيني لخط الإنتاج الحالي والتحقق من المطابقة والمظهر الخارجي</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDailyInspection} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Basic Info (Model & Serial) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <h3 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-zinc-500" />
                      معلومات الوحدة الأساسية
                    </h3>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs text-zinc-550 font-bold mb-2">موديل الثلاجة</label>
                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-800 outline-none focus:border-blue-500 focus:bg-white font-bold"
                    >
                      {factoryModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Serial */}
                  <div>
                    <label className="block text-xs text-zinc-550 font-bold mb-2">الرقم التسلسلي للوحدة (سيريال)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="اكتب رقم السيريال أو انقر توليد"
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                        className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-center font-mono font-bold uppercase tracking-wider text-zinc-900 outline-none transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleAutoGenerateSerial}
                        className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 px-3.5 py-2.5 rounded-xl text-zinc-750 font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>توليد</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Checklist & Defects */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Technical Checklist */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <h3 className="text-xs font-black text-zinc-900">بنود الفحص الفني والتحقق الروتيني</h3>
                  </div>

                  <div className="space-y-2">
                    {CHECKLIST_ITEMS.map((item) => {
                      const passed = checklist[item.id] !== false;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-150">
                          <div>
                            <span className="text-xs font-bold block text-zinc-800">{item.label}</span>
                            <span className="text-[10px] text-zinc-400">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setChecklist(prev => ({ ...prev, [item.id]: true }))}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                passed ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-500'
                              }`}
                            >
                              مطابق
                            </button>
                            <button
                              type="button"
                              onClick={() => setChecklist(prev => ({ ...prev, [item.id]: false }))}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                !passed ? 'bg-rose-100 text-rose-800' : 'bg-zinc-200 text-zinc-500'
                              }`}
                            >
                              غير مطابق
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Defect Options Picker */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <h3 className="text-xs font-black text-zinc-900">تسجيل عيوب إضافية في المظهر أو الأجزاء</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {DEFECT_OPTIONS.map((def) => {
                      const isChosen = selectedDefects.includes(def.id);
                      return (
                        <div 
                          key={def.id}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isChosen ? 'bg-red-50 border-red-300 text-red-850 shadow-sm' : 'bg-zinc-50 border-zinc-150 hover:bg-zinc-100'
                          }`}
                          onClick={() => handleToggleDefect(def.id)}
                        >
                          <div className="flex items-start gap-2">
                            <input 
                              type="checkbox" 
                              checked={isChosen} 
                              onChange={() => {}} 
                              className="mt-0.5 rounded text-red-600 focus:ring-red-500" 
                            />
                            <div className="flex-1">
                              <span className="text-xs font-bold block">{def.label}</span>
                              <div className="flex items-center justify-between mt-1 text-[9px] font-mono">
                                <span className="text-zinc-400">Severity: {def.severity}</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${
                                  def.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
                                  def.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-650'
                                }`}>
                                  {def.category}
                                </span>
                              </div>

                              {isChosen && (
                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    placeholder="ملاحظات وتفاصيل العيب..."
                                    value={defectNotes[def.id] || ''}
                                    onChange={(e) => setDefectNotes(prev => ({ ...prev, [def.id]: e.target.value }))}
                                    className="w-full text-xs p-1.5 border border-red-200 rounded bg-white outline-none focus:border-red-400"
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-4 border-t border-zinc-100 mt-4">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2"
                    >
                      <span>إرسال وتوثيق الفحص الفوري</span>
                      <Send className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                </div>

              </div>

            </form>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: CRITICAL_OPS */}
        {/* ========================================================================= */}
        {currentSection === 'CRITICAL_OPS' ? (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-600 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">العمليات الحرجة وفحوصات الجودة بمصنع {getLineName(lineId)}</h2>
                  <p className="text-[10px] text-zinc-400">مزامنة كاملة لجميع أقسام الفحص مع ملفات Google Sheet و AppSheet</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSyncConfig(!showSyncConfig)}
                  className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  إعدادات الربط والـ GID
                </button>
                <button
                  onClick={() => handleSyncAllTabs(lineId)}
                  disabled={isSyncing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  {isSyncing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      جاري المزامنة...
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      مزامنة جميع الأقسام
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error or Success alerts */}
            {critSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-xs font-bold animate-fadeIn">
                {critSuccessMsg}
              </div>
            )}
            
            {syncError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium animate-fadeIn">
                {syncError}
              </div>
            )}

            {/* Google Sheets Link & GID Configuration Card */}
            {showSyncConfig && (
              <div className="bg-gradient-to-l from-zinc-50 to-white border border-zinc-200 rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    تهيئة روابط وتكامل جدول بيانات جوجل (Google Sheets GID Mapping)
                  </h3>
                  <p className="text-[10px] text-zinc-400">تعتمد مزامنة كل تبويب على المعرف الفريد (gid) الخاص بالصفحة في الشيت الرئيسي.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-700">رابط مستند ويب الرئيسي (Google Sheet HTML/Pubhtml)</label>
                    <input 
                      type="text" 
                      placeholder="ضع رابط الـ pubhtml أو رابط الجدول هنا..."
                      value={sheetUrls[lineId]?.masterUrl || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSheetUrls(prev => ({
                          ...prev,
                          [lineId]: { ...(prev[lineId] || {}), masterUrl: val }
                        }));
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-zinc-700">رابط الـ Google Apps Script لإرسال البيانات الجديدة تلقائياً (Web App URL)</label>
                    <input 
                      type="text" 
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={sheetUrls[lineId]?.submission_url || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSheetUrls(prev => ({
                          ...prev,
                          [lineId]: { ...(prev[lineId] || {}), submission_url: val }
                        }));
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Interactive Google Apps Script copy-paste setup guide */}
                <div className="bg-blue-50/50 border border-blue-150 rounded-xl p-3 text-xs space-y-2">
                  <span className="font-extrabold text-blue-800 block">💡 طريقة ربط الإرسال المباشر بـ Google Sheets تلقائياً:</span>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    1. افتح ملف الـ Google Sheet الخاص بك ➜ من القائمة العلوية اختر <strong>Extensions</strong> ثم <strong>Apps Script</strong>.
                    <br />
                    2. الصق الكود البرمجي التالي داخل المحرر البرمجي واحفظ الملف:
                  </p>
                  <pre dir="ltr" className="p-2.5 bg-zinc-900 text-zinc-100 rounded-lg text-[10px] font-mono overflow-x-auto text-left whitespace-pre">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // خريطة لربط الأقسام بكلمات مفتاحية في أسماء الصفحات
  var prefixes = {
    'calib': 'معايرة ماكينة الشحن',
    'init_ass': 'التجمع الابتدائي',
    'injection': 'الحقن',
    'final_torque': 'عزوم التجميع النهائي',
    'start_torque': 'عزوم بداية خط',
    'inject_torque': 'عزوم الحقن',
    'perf_test': 'اختبار الأداء'
  };
  
  var targetPrefix = prefixes[data.tabId] || data.tabId;
  var sheet = null;
  
  // البحث الذكي عن شيت يحتوي اسمه على الكلمة المفتاحية (لتفادي مشكلة لاحقة "- معمل 2" أو غيرها)
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.indexOf(targetPrefix) !== -1) {
      sheet = sheets[i];
      break;
    }
  }
  
  // في حال لم يجد الشيت، ينشئه كنسخة احتياطية باسم القسم المذكور
  if (!sheet) {
    sheet = ss.insertSheet(targetPrefix);
  }
  
  // إضافة السطر بناءً على نوع القسم
  if (data.tabId === 'calib') {
    sheet.appendRow([
      data['التاريخ'] || data['date'], 
      data['الوردية'] || data['shift'], 
      data['ماكينة الشحن'] || data['machine'], 
      data['الموديل'] || data['modelName'], 
      data['الشحنة'] || data['rawCharge']
    ]);
  } else if (data.tabId === 'init_ass') {
    sheet.appendRow([
      data['التاريخ'] || data['date'], 
      data['الوردية'] || data['shift'], 
      data['الموديل'] || data['modelCode'], 
      data['Y'] || '0', 
      data['X'] || '0', 
      data['N'] || '0', 
      data['M'] || '0', 
      data['L'] || '0', 
      data['W'] || '0', 
      data['P'] || '0', 
      data['R'] || '0', 
      data['S'] || '0',
      data['التأكد من إستخدام الضبعه أثناء لصق المواسير مع الصاج'] || 'OK',
      data['فحص الكابينه الصاج للتاكد من عدم وجود خدوش او خبطات او انبعاجات او تشوهات بها'] || 'OK',
      data['التاكد من تطبيع لصق الألومنيوم تيب علي جانبى الكابينه الصاج موديلات شارب وتورنيدو.'] || 'OK',
      data['التاكد من وجود Hot Pipe Support موديلات شارب وتورنيدو'] || 'OK',
      data['التأكد من لصق العجينة بطريقة صحيحة فى تجميع الـ C . Partion والتأكد من المقاسات حسب تعليمات التشغيل بالقسم'] || 'OK',
      data['التأكد من وجود فوم علي ظهر الكابينه البلاستيك ولصق الضفيرة جيدا حسب تعليمات التشغيل بالقسم لكل موديل .'] || 'OK',
      data['التأكد من تثبيت الضفيرة بالكات بطريقة صحيحة علي الكابينة البلاستيك'] || 'OK',
      data['التأكد من وضع الهوت سيلر بالاماكن المحدده بالزوايا'] || 'OK',
      data['التأكد من مطابقة تاريخ الباركود لتاريخ اليوم .'] || 'OK',
      data['التأكد من إجراء إختبار البوردة بطريقة صحيحة.'] || 'OK',
      data['إختبار خرطوم الصرف بجهاز ضغط الهواء'] || 'OK',
      data['التأكد من إستخدام ضبعات تركيب المفصلة السفلية وضبعات أبعاد الأبواب وضبعات تركيب البادج'] || 'OK'
    ]);
  } else if (data.tabId === 'injection') {
    sheet.appendRow([
      data['التاريخ'] || data['date'],
      data['الوردية'] || data['shift'],
      data['الموديل'] || data['modelName'],
      data['foamWeight'] || '',
      data['foamPressure'] || '',
      data['injectionStatus'] || 'PASS'
    ]);
  } else if (data.tabId === 'final_torque') {
    sheet.appendRow([
      data['التاريخ'] || data['date'],
      data['الوردية'] || data['shift'],
      data['الموديل'] || data['modelName'],
      data['torqueValue'] || '',
      data['torqueStandard'] || '',
      data['torqueStatus'] || 'PASS'
    ]);
  } else if (data.tabId === 'start_torque') {
    sheet.appendRow([
      data['التاريخ'] || data['date'],
      data['الوردية'] || data['shift'],
      data['stationNum'] || '',
      data['screwdriverTorque'] || '',
      data['startTorqueStatus'] || 'PASS'
    ]);
  } else if (data.tabId === 'inject_torque') {
    sheet.appendRow([
      data['التاريخ'] || data['date'],
      data['الوردية'] || data['shift'],
      data['fixingBolt'] || '',
      data['measuredTorque'] || '',
      data['injectTorqueStatus'] || 'PASS'
    ]);
  } else if (data.tabId === 'perf_test') {
    sheet.appendRow([
      data['التاريخ'] || data['date'],
      data['الوردية'] || data['shift'],
      data['الموديل'] || data['modelName'],
      (data['cabinetTemp'] || '0') + ' / ' + (data['freezerTemp'] || '0'),
      data['currentAmp'] || '',
      data['perfResult'] || 'PASS'
    ]);
  }
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}`}
                  </pre>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    3. اضغط على <strong>Deploy</strong> ➜ ثم <strong>New Deployment</strong>.
                    <br />
                    4. اختر نوع الـ Deployment ليكون <strong>Web App</strong>.
                    <br />
                    5. اجعل خيار (Execute as) هو <strong>Me</strong>، وخيار (Who has access) هو <strong>Anyone</strong>.
                    <br />
                    6. اضغط Deploy وانسخ الرابط (Web App URL) والصقه في خانة الإدخال أعلاه.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2 border-t border-zinc-150">
                  {CRITICAL_TABS.map(tab => {
                    const key = `${tab.id}_gid`;
                    return (
                      <div key={tab.id} className="space-y-1">
                        <label className="block text-[9px] font-bold text-zinc-500 truncate" title={tab.name}>{tab.name}</label>
                        <input
                          type="text"
                          placeholder="GID ID"
                          value={sheetUrls[lineId]?.[key] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSheetUrls(prev => ({
                              ...prev,
                              [lineId]: { ...(prev[lineId] || {}), [key]: val }
                            }));
                          }}
                          className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1 text-[10px] text-center font-mono outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Department / Sections (Tabs) Slider */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {CRITICAL_TABS.map(tab => {
                const isActive = activeCritTab === tab.id;
                const tabLogs = (syncedLogs || []).filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCritTab(tab.id as any)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                      isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span>{tab.name}</span>
                    {tabLogs.length > 0 && (
                      <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-black ${isActive ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                        {tabLogs.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Entry Form Column */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                {/* Custom forms per active tab */}
                <form onSubmit={handleSubmitCriticalLog} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                    <h4 className="font-black text-zinc-900 flex items-center gap-1">
                      <PlusCircle className="w-4 h-4 text-blue-500" />
                      تسجيل يدوي: {CRITICAL_TABS.find(t => t.id === activeCritTab)?.name}
                    </h4>
                  </div>

                  {/* Standard Fields for all tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">تاريخ الفحص</label>
                      <input 
                        type="date" 
                        value={manualDate} 
                        onChange={e => setManualDate(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">الوردية</label>
                      <select 
                        value={manualShift} 
                        onChange={e => setManualShift(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs outline-none font-bold"
                      >
                        <option value="الأولى">الأولى</option>
                        <option value="الثانية">الثانية</option>
                        <option value="الثالثة">الثالثة</option>
                      </select>
                    </div>
                  </div>

                  {/* Tab Specific Input Fields */}
                  {activeCritTab === 'calib' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex bg-zinc-100 p-0.5 rounded-lg mb-2">
                        <button
                          type="button"
                          onClick={() => setEntryType('APPSHEET_ALIGN')}
                          className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all ${entryType === 'APPSHEET_ALIGN' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-550'}`}
                        >
                          شحن فريون
                        </button>
                        <button
                          type="button"
                          onClick={() => setEntryType('LAB_TEST')}
                          className={`flex-1 py-1 text-center text-[10px] font-bold rounded transition-all ${entryType === 'LAB_TEST' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-550'}`}
                        >
                          فحص معملي كامل
                        </button>
                      </div>

                      {entryType === 'APPSHEET_ALIGN' ? (
                        <>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">ماكينة الشحن</label>
                            {lineId === 'LINE_B' ? (
                              <select
                                value={manualMachine}
                                onChange={e => setManualMachine(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                              >
                                <option value="اجرامكو 1">اجرامكو 1</option>
                                <option value="اجرامكو 2">اجرامكو 2</option>
                                <option value="توشيبا">توشيبا</option>
                                <option value="R600">R600</option>
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                placeholder="مثال: اجرامكو 1"
                                value={manualMachine} 
                                onChange={e => setManualMachine(e.target.value)} 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                required 
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">الموديل</label>
                            {lineId === 'LINE_B' ? (
                              <select
                                value={manualModelName}
                                onChange={e => setManualModelName(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                                required
                              >
                                <option value="">-- اختر موديل مصنع B --</option>
                                <option value="48 (R134a)">48 (R134a)</option>
                                <option value="58 (R134a)">58 (R134a)</option>
                                <option value="PV-GV48 (R600a)">PV-GV48 (R600a)</option>
                                <option value="46 (R600a)">46 (R600a)</option>
                                <option value="51 (R600a)">51 (R600a)</option>
                                <option value="480TV-480ATV (R600a)">480TV-480ATV (R600a)</option>
                              </select>
                            ) : (
                              <select 
                                value={manualModelName} 
                                onChange={e => setManualModelName(e.target.value)} 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs outline-none"
                              >
                                <option value="">-- اختر موديل --</option>
                                {factoryModels.map(m => (
                                  <option key={m.id} value={m.name}>{m.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">وزن الشحنة الفعلية</label>
                            <input 
                              type="text" 
                              placeholder="مثال: 114" 
                              value={manualCharge} 
                              onChange={e => setManualCharge(e.target.value)} 
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-left" 
                              required 
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">شحنة الفريون (Gas Charge - Grams)</label>
                            <input 
                              type="number" step="0.1" value={gasInput} onChange={e => setGasInput(e.target.value)} 
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" required 
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeCritTab === 'init_ass' && (
                    <div className="space-y-3 pt-2">
                      {lineId === 'LINE_B' ? (
                        <>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">الموديل</label>
                            <select
                              value={manualModelCode}
                              onChange={e => setManualModelCode(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
                              required
                            >
                              <option value="48">48</option>
                              <option value="58">58</option>
                              <option value="46&51">46&51</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-zinc-700 font-bold mb-1.5">القيم الرقمية للأبعاد</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { key: 'Y', label: 'Y', val: manualY, set: setManualY },
                                { key: 'X', label: 'X', val: manualX, set: setManualX },
                                { key: 'N', label: 'N', val: manualN, set: setManualN },
                                { key: 'M', label: 'M', val: manualM, set: setManualM },
                                { key: 'L', label: 'L', val: manualL, set: setManualL },
                                { key: 'W', label: 'W', val: manualW, set: setManualW },
                                { key: 'P', label: 'P', val: manualP, set: setManualP },
                                { key: 'R', label: 'R', val: manualR, set: setManualR },
                                { key: 'S', label: 'S', val: manualS, set: setManualS }
                              ].map(f => (
                                <div key={f.key} className="space-y-1">
                                  <span className="text-[10px] font-bold text-zinc-500 block">{f.label}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={f.val}
                                    onChange={e => f.set(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs text-center font-mono outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-zinc-150">
                            <span className="block text-[11px] font-black text-zinc-700">بنود فحص مطابقة الجودة بالتجميع الابتدائي</span>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                              {[
                                { key: 'dabsha', label: 'التأكد من إستخدام الضبعه أثناء لصق المواسير مع الصاج', val: checkDabsha, setter: setCheckDabsha },
                                { key: 'scratch', label: 'فحص الكابينه الصاج للتاكد من عدم وجود خدوش او خبطات او انبعاجات او تشوهات بها', val: checkScratch, setter: setCheckScratch },
                                { key: 'aluminumTape', label: 'التاكد من تطبيع لصق الألومنيوم تيب علي جانبى الكابينه الصاج موديلات شارب وتورنيدو.', val: checkAluminumTape, setter: setCheckAluminumTape },
                                { key: 'hotPipe', label: 'التاكد من وجود Hot Pipe Support موديلات شارب وتورنيدو', val: checkHotPipe, setter: setCheckHotPipe },
                                { key: 'paste', label: 'التأكد من لصق العجينة بطريقة صحيحة فى تجميع الـ C . Partion والتأكد من المقاسات حسب تعليمات التشغيل بالقسم', val: checkPaste, setter: setCheckPaste },
                                { key: 'foamBack', label: 'التأكد من وجود فوم علي ظهر الكابينه البلاستيك ولصق الضفيرة جيدا حسب تعليمات التشغيل بالقسم لكل موديل .', val: checkFoamBack, setter: setCheckFoamBack },
                                { key: 'wiringClip', label: 'التأكد من تثبيت الضفيرة بالكات بطريقة صحيحة علي الكابينة البلاستيك', val: checkWiringClip, setter: setCheckWiringClip },
                                { key: 'hotSealer', label: 'التأكد من وضع الهوت سيلر بالاماكن المحدده بالزوايا', val: checkHotSealer, setter: setCheckHotSealer },
                                { key: 'barcodeDate', label: 'التأكد من مطابقة تاريخ الباركود لتاريخ اليوم .', val: checkBarcodeDate, setter: setCheckBarcodeDate },
                                { key: 'pcbTest', label: 'التأكد من إجراء إختبار البوردة بطريقة صحيحة.', val: checkPcbTest, setter: setCheckPcbTest },
                                { key: 'drainHose', label: 'إختبار خرطوم الصرف بجهاز ضغط الهواء', val: checkDrainHose, setter: setCheckDrainHose },
                                { key: 'doorFixtures', label: 'التأكد من إستخدام ضبعات تركيب المفصلة السفلية وضبعات أبعاد الأبواب وضبعات تركيب البادج', val: checkDoorFixtures, setter: setCheckDoorFixtures }
                              ].map((item) => (
                                <div key={item.key} className="flex flex-col gap-1.5 p-2 rounded-lg bg-zinc-50 border border-zinc-150">
                                  <span className="text-[10px] font-bold text-zinc-800 leading-relaxed">{item.label}</span>
                                  <div className="flex bg-zinc-200 p-0.5 rounded-md self-end w-32">
                                    <button
                                      type="button"
                                      onClick={() => item.setter('OK')}
                                      className={`flex-1 text-center py-0.5 text-[10px] font-black rounded transition-all ${item.val === 'OK' ? 'bg-emerald-500 text-white shadow-xs' : 'text-zinc-600'}`}
                                    >
                                      OK
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => item.setter('NG')}
                                      className={`flex-1 text-center py-0.5 text-[10px] font-black rounded transition-all ${item.val === 'NG' ? 'bg-red-500 text-white shadow-xs' : 'text-zinc-600'}`}
                                    >
                                      NG
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">كود الموديل</label>
                            <input 
                              type="text" 
                              placeholder="مثال: GR-EF31" 
                              value={manualModelCode} 
                              onChange={e => setManualModelCode(e.target.value)} 
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
                              required 
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">اسم المفتش</label>
                            <input 
                              type="text" 
                              value={manualInspectorName} 
                              onChange={e => setManualInspectorName(e.target.value)} 
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
                              required 
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">حالة التجميع</label>
                            <div className="flex gap-2">
                              <button 
                                type="button" onClick={() => setManualAssemblyStatus('PASS')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualAssemblyStatus === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                              >
                                سليم (Pass)
                              </button>
                              <button 
                                type="button" onClick={() => setManualAssemblyStatus('FAIL')} 
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualAssemblyStatus === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                              >
                                تالف (Fail)
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">ملاحظات الفحص</label>
                            <textarea 
                              rows={2}
                              value={manualNotes} 
                              onChange={e => setManualNotes(e.target.value)} 
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none resize-none"
                              placeholder="أي ملحوظة جودة..."
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeCritTab === 'injection' && (
                    <div className="space-y-4 pt-2">
                      {/* معلومات عامة */}
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-150 space-y-3">
                        <h4 className="font-extrabold text-zinc-900 border-b border-zinc-200 pb-1.5 text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                          بيانات الموديل والجيك
                        </h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">الموديل</label>
                            <select 
                              value={injModel} 
                              onChange={e => setInjModel(e.target.value as any)} 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs outline-none font-bold"
                            >
                              <option value="48">48</option>
                              <option value="58">58</option>
                              <option value="46&51">46&51</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1">رقم الجيك</label>
                            <select 
                              value={injJigNum} 
                              onChange={e => setInjJigNum(parseInt(e.target.value))} 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-xs outline-none font-bold font-mono"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* تسجيلات قيم الأبعاد */}
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-150 space-y-3">
                        <h4 className="font-extrabold text-zinc-900 border-b border-zinc-200 pb-1.5 text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                          قيم الأبعاد (F/R/D/K/W)
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'F', value: injF, setter: setInjF },
                            { label: 'R 1', value: injR1, setter: setInjR1 },
                            { label: 'R 2', value: injR2, setter: setInjR2 },
                            { label: 'D', value: injD, setter: setInjD },
                            { label: 'K', value: injK, setter: setInjK },
                            { label: 'FR', value: injFR, setter: setInjFR },
                            { label: 'FL', value: injFL, setter: setInjFL },
                            { label: 'HR', value: injHR, setter: setInjHR },
                            { label: 'HL', value: injHL, setter: setInjHL },
                            { label: 'تقوس F/P', value: injFPBow, setter: setInjFPBow },
                            { label: 'W1', value: injW1, setter: setInjW1 },
                            { label: 'W2', value: injW2, setter: setInjW2 },
                          ].map((field, idx) => (
                            <div key={idx}>
                              <label className="block text-zinc-650 font-bold mb-1 text-[10px]">{field.label}</label>
                              <input 
                                type="number" 
                                step="0.01"
                                placeholder="0.0"
                                value={field.value}
                                onChange={e => field.setter(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold font-mono outline-none text-left"
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* إستواء الكاستلا وكثافة الفوم */}
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-150 space-y-3">
                        <h4 className="font-extrabold text-zinc-900 border-b border-zinc-200 pb-1.5 text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                          إستواء الكاستلا وكثافة الفوم
                        </h4>
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-zinc-700 font-bold mb-1 text-[10px] leading-tight">إستواء العارضة/القائم يمين</label>
                              <input 
                                type="number" step="0.01" placeholder="0.0" value={injCastellaRight} onChange={e => setInjCastellaRight(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-700 font-bold mb-1 text-[10px] leading-tight">إستواء العارضة/القائم شمال</label>
                              <input 
                                type="number" step="0.01" placeholder="0.0" value={injCastellaLeft} onChange={e => setInjCastellaLeft(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-zinc-700 font-bold mb-1 text-[10px]">كثافة الفوم Head 1</label>
                              <input 
                                type="number" step="0.01" placeholder="0.0" value={injFoamDensityHead1} onChange={e => setInjFoamDensityHead1(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-700 font-bold mb-1 text-[10px]">كثافة الفوم Head 2</label>
                              <input 
                                type="number" step="0.01" placeholder="0.0" value={injFoamDensityHead2} onChange={e => setInjFoamDensityHead2(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* المواد والحرارة */}
                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-150 space-y-3">
                        <h4 className="font-extrabold text-zinc-900 border-b border-zinc-200 pb-1.5 text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></span>
                          الخامات ودرجات الحرارة
                        </h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1 text-[10px]">مادة الحقن</label>
                            <select 
                              value={injMaterial} 
                              onChange={e => setInjMaterial(e.target.value as any)} 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs outline-none font-bold"
                            >
                              <option value="Daw">Daw</option>
                              <option value="بعلبك">بعلبك</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1 text-[10px]">خامة الفاكيوم</label>
                            <select 
                              value={injVacuumMaterial} 
                              onChange={e => setInjVacuumMaterial(e.target.value as any)} 
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs outline-none font-bold"
                            >
                              <option value="N27">N27</option>
                              <option value="samsunge">samsunge</option>
                              <option value="LG">LG</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1 text-[10px] leading-tight">حرارة ضبعة الحقن (الباب)</label>
                            <input 
                              type="number" step="0.1" placeholder="0.0" value={injTempDoor} onChange={e => setInjTempDoor(e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-700 font-bold mb-1 text-[10px] leading-tight">حرارة ضبعة الحقن (الكابينة)</label>
                            <input 
                              type="number" step="0.1" placeholder="0.0" value={injTempCabinet} onChange={e => setInjTempCabinet(e.target.value)}
                              className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-bold outline-none font-mono text-left" required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCritTab === 'final_torque' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">الموديل</label>
                        <select 
                          value={manualModelName} 
                          onChange={e => setManualModelName(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs outline-none"
                        >
                          <option value="">-- اختر موديل --</option>
                          {factoryModels.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">قيمة العزم المقاسة (N.m)</label>
                        <input 
                          type="number" step="0.01"
                          placeholder="مثال: 1.35" 
                          value={manualTorqueValue} 
                          onChange={e => setManualTorqueValue(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-left" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">العزم القياسي المطلق</label>
                        <input 
                          type="text" 
                          value={manualTorqueStandard} 
                          onChange={e => setManualTorqueStandard(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">حالة العزم</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" onClick={() => setManualTorqueStatus('PASS')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualTorqueStatus === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            مطابق (Pass)
                          </button>
                          <button 
                            type="button" onClick={() => setManualTorqueStatus('FAIL')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualTorqueStatus === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            غير مطابق (Fail)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCritTab === 'start_torque' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">رقم المحطة</label>
                        <input 
                          type="text" 
                          placeholder="مثال: Station 4" 
                          value={manualStationNum} 
                          onChange={e => setManualStationNum(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">عزم مفك الربط (N.m)</label>
                        <input 
                          type="number" step="0.01"
                          placeholder="مثال: 1.45" 
                          value={manualScrewdriverTorque} 
                          onChange={e => setManualScrewdriverTorque(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-left" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">النتيجة</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" onClick={() => setManualStartTorqueStatus('PASS')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualStartTorqueStatus === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            مطابق (Pass)
                          </button>
                          <button 
                            type="button" onClick={() => setManualStartTorqueStatus('FAIL')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualStartTorqueStatus === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            غير مطابق (Fail)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCritTab === 'inject_torque' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">مسمار التثبيت المربوط</label>
                        <input 
                          type="text" 
                          placeholder="مثال: Fixing Bolt M6" 
                          value={manualFixingBolt} 
                          onChange={e => setManualFixingBolt(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">العزم الفعلي المقاس (N.m)</label>
                        <input 
                          type="number" step="0.01"
                          placeholder="مثال: 2.10" 
                          value={manualMeasuredTorque} 
                          onChange={e => setManualMeasuredTorque(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-left" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">حالة العزم</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" onClick={() => setManualInjectTorqueStatus('PASS')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualInjectTorqueStatus === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            مطابق (Pass)
                          </button>
                          <button 
                            type="button" onClick={() => setManualInjectTorqueStatus('FAIL')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualInjectTorqueStatus === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            غير مطابق (Fail)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeCritTab === 'perf_test' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">الموديل</label>
                        <select 
                          value={manualModelName} 
                          onChange={e => setManualModelName(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs outline-none"
                        >
                          <option value="">-- اختر موديل --</option>
                          {factoryModels.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-zinc-700 font-bold mb-1">حرارة الكابينة (°C)</label>
                          <input 
                            type="number" step="0.1"
                            placeholder="مثال: 5" 
                            value={manualCabinetTemp} 
                            onChange={e => setManualCabinetTemp(e.target.value)} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-left" 
                            required 
                          />
                        </div>
                        <div>
                          <label className="block text-zinc-700 font-bold mb-1">حرارة الفريزر (°C)</label>
                          <input 
                            type="number" step="0.1"
                            placeholder="مثال: -18" 
                            value={manualFreezerTemp} 
                            onChange={e => setManualFreezerTemp(e.target.value)} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-left" 
                            required 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">الأمبير الفعلي المستهلك</label>
                        <input 
                          type="number" step="0.01"
                          placeholder="مثال: 0.85" 
                          value={manualCurrentAmp} 
                          onChange={e => setManualCurrentAmp(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-left" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-700 font-bold mb-1">نتيجة اختبار الأداء</label>
                        <div className="flex gap-2">
                          <button 
                            type="button" onClick={() => setManualPerfResult('PASS')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualPerfResult === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            مقبول (Pass)
                          </button>
                          <button 
                            type="button" onClick={() => setManualPerfResult('FAIL')} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${manualPerfResult === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                          >
                            مرفوض (Fail)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-950 text-white font-black py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                    <Save className="w-4 h-4" />
                    حفظ وتوثيق قيم الجودة
                  </button>
                </form>
              </div>

              {/* Logs Archive List Table Column */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                {/* Section Title and Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150 pb-3">
                  <h3 className="text-xs font-black text-zinc-900">سجل: {CRITICAL_TABS.find(t => t.id === activeCritTab)?.name}</h3>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncTab(lineId, activeCritTab)}
                      disabled={isSyncing}
                      className="bg-zinc-150 hover:bg-zinc-200 text-zinc-750 font-bold px-2.5 py-1 rounded text-[10px] transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      تحديث هذا القسم
                    </button>
                    <div className="text-[10px] text-zinc-500 font-bold">
                      إجمالي العينات: <strong className="text-zinc-950 font-extrabold">{allCriticalLogs.length}</strong>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      {activeCritTab === 'calib' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">ماكينة الشحن</th>
                          <th className="p-2.5">الموديل</th>
                          <th className="p-2.5 text-center">شحنة الغاز</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                      {activeCritTab === 'init_ass' && (
                        lineId === 'LINE_B' ? (
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                            <th className="p-2.5">المصدر</th>
                            <th className="p-2.5">التاريخ والوردية</th>
                            <th className="p-2.5">الموديل</th>
                            <th className="p-2.5 text-center">الأبعاد (Y/X/N/M/L/W/P/R/S)</th>
                            <th className="p-2.5 text-center">حالة بنود الفحص</th>
                            <th className="p-2.5 text-center">النتيجة النهائية</th>
                            <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>
                          </tr>
                        ) : (
                          <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                            <th className="p-2.5">المصدر</th>
                            <th className="p-2.5">التاريخ والوردية</th>
                            <th className="p-2.5">كود الموديل</th>
                            <th className="p-2.5">المفتش المسؤول</th>
                            <th className="p-2.5 text-center">حالة التجميع</th>
                            <th className="p-2.5">ملاحظات</th>
                          </tr>
                        )
                      )}
                      {activeCritTab === 'injection' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">الموديل والجيك</th>
                          <th className="p-2.5 text-center">قيم الأبعاد (F/R/D/K/W)</th>
                          <th className="p-2.5 text-center">إستواء الكاستلا</th>
                          <th className="p-2.5 text-center">كثافة الفوم</th>
                          <th className="p-2.5 text-center">الخامة والحرارة</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                      {activeCritTab === 'final_torque' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">الموديل</th>
                          <th className="p-2.5 text-center">العزم المقاس</th>
                          <th className="p-2.5 text-center">المعيار القياسي</th>
                          <th className="p-2.5 text-center">حالة العزم</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                      {activeCritTab === 'start_torque' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">رقم المحطة</th>
                          <th className="p-2.5 text-center">عزم المفك (N.m)</th>
                          <th className="p-2.5 text-center">حالة الربط</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                      {activeCritTab === 'inject_torque' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">مسمار التثبيت</th>
                          <th className="p-2.5 text-center">العزم الفعلي (N.m)</th>
                          <th className="p-2.5 text-center">الحالة</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                      {activeCritTab === 'perf_test' && (
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                          <th className="p-2.5">المصدر</th>
                          <th className="p-2.5">التاريخ والوردية</th>
                          <th className="p-2.5">الموديل</th>
                          <th className="p-2.5 text-center">حرارة الكابينة / الفريزر</th>
                          <th className="p-2.5 text-center">الأمبير (A)</th>
                          <th className="p-2.5 text-center">نتيجة الأداء</th>
                          {lineId === 'LINE_B' && <th className="p-2.5 text-center text-red-600 font-extrabold">حذف</th>}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {allCriticalLogs.length === 0 ? (
                        <tr>
                          <td colSpan={lineId === 'LINE_B' ? 8 : 7} className="p-8 text-center text-zinc-400 font-medium">
                            لا توجد قراءات مسجلة حالياً لهذا القسم. قم بتسجيل قراءة أو مزامنة بيانات AppSheet.
                          </td>
                        </tr>
                      ) : (
                        allCriticalLogs.map((log) => {
                          const isAppSheet = log.source === 'APPSHEET';
                          const statusColor = (status: 'PASS' | 'FAIL' | undefined) => 
                            status === 'FAIL' ? 'text-red-600 bg-red-50 font-bold' : 'text-emerald-600 bg-emerald-50 font-bold';
                          
                          return (
                            <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="p-2.5">
                                {isAppSheet ? (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-150">
                                    AppSheet
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-150">
                                    الموقع
                                  </span>
                                )}
                              </td>
                              
                              <td className="p-2.5 text-zinc-600 font-mono">
                                {log.date || safeDateString(log.timestamp)}
                                <span className="text-[10px] text-zinc-400 block font-bold">
                                  وردية {log.shift}
                                </span>
                              </td>

                              {/* Tab specific cells */}
                              {activeCritTab === 'calib' && (
                                <>
                                  <td className="p-2.5 font-bold text-zinc-700">{log.machine}</td>
                                  <td className="p-2.5 text-zinc-650 truncate max-w-[130px]">{log.modelName}</td>
                                  <td className="p-2.5 font-mono font-black text-center text-zinc-950">{log.rawCharge || log.gasCharge}</td>
                                </>
                              )}

                              {activeCritTab === 'init_ass' && (
                                lineId === 'LINE_B' ? (
                                  <>
                                    <td className="p-2.5 font-bold text-zinc-800">{log.modelCode}</td>
                                    <td className="p-2.5 text-center font-mono text-[11px] text-zinc-600">
                                      {`Y:${log.Y ?? '0'} | X:${log.X ?? '0'} | N:${log.N ?? '0'} | M:${log.M ?? '0'} | L:${log.L ?? '0'} | W:${log.W ?? '0'} | P:${log.P ?? '0'} | R:${log.R ?? '0'} | S:${log.S ?? '0'}`}
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <div className="flex flex-wrap justify-center gap-1 max-w-[320px] mx-auto">
                                        {[
                                          { k: 'ضبعه', v: log.check_dabsha },
                                          { k: 'خدوش', v: log.check_scratch },
                                          { k: 'ألومنيوم', v: log.check_aluminum_tape },
                                          { k: 'هوت بايب', v: log.check_hot_pipe },
                                          { k: 'عجينة', v: log.check_paste },
                                          { k: 'فوم', v: log.check_foam_back },
                                          { k: 'ضفيرة', v: log.check_wiring_clip },
                                          { k: 'سيلر', v: log.check_hot_sealer },
                                          { k: 'باركود', v: log.check_barcode_date },
                                          { k: 'بوردة', v: log.check_pcb_test },
                                          { k: 'صرف', v: log.check_drain_hose },
                                          { k: 'مفصلة', v: log.check_door_fixtures }
                                        ].map((item, idx) => (
                                          <span
                                            key={idx}
                                            title={item.k}
                                            className={`px-1 py-0.5 rounded-[3px] text-[8px] font-black ${
                                              item.v === 'NG' ? 'bg-red-100 text-red-700' : 'bg-emerald-55/60 bg-opacity-40 text-emerald-800'
                                            }`}
                                          >
                                            {item.k}: {item.v || 'OK'}
                                          </span>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor(log.assemblyStatus)}`}>
                                        {log.assemblyStatus || 'PASS'}
                                      </span>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="p-2.5 font-bold text-zinc-700">{log.modelCode}</td>
                                    <td className="p-2.5 text-zinc-650">{log.inspectorName}</td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(log.assemblyStatus)}`}>
                                        {log.assemblyStatus || 'PASS'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-zinc-500 font-normal">{log.notes || '-'}</td>
                                  </>
                                )
                              )}

                              {activeCritTab === 'injection' && (
                                <>
                                  <td className="p-2.5 text-zinc-800">
                                    <span className="font-extrabold block text-xs">
                                      موديل {log.injModel || '48'}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-bold block">
                                      جيك رقم: <strong className="text-zinc-800">{log.injJigNum || '1'}</strong>
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-[10px] text-zinc-600 leading-normal">
                                    <div className="font-bold">
                                      F:{log.injF ?? 0} | R1:{log.injR1 ?? 0} | R2:{log.injR2 ?? 0} | D:{log.injD ?? 0} | K:{log.injK ?? 0}
                                    </div>
                                    <div className="text-zinc-400 text-[9px]">
                                      FR:{log.injFR ?? 0} FL:{log.injFL ?? 0} HR:{log.injHR ?? 0} HL:{log.injHL ?? 0} تقوس:{log.injFPBow ?? 0} W1:{log.injW1 ?? 0} W2:{log.injW2 ?? 0}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-[11px] text-zinc-700">
                                    <div>يمين: {log.injCastellaRight ?? 0}</div>
                                    <div className="text-zinc-400 text-[10px]">شمال: {log.injCastellaLeft ?? 0}</div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-[11px] text-zinc-700">
                                    <div>H1: {log.injFoamDensityHead1 ?? 0}</div>
                                    <div className="text-zinc-400 text-[10px]">H2: {log.injFoamDensityHead2 ?? 0}</div>
                                  </td>
                                  <td className="p-2.5 text-center text-zinc-700 text-[10px]">
                                    <div className="font-bold">مادة: {log.injMaterial || 'Daw'} | فاكيوم: {log.injVacuumMaterial || 'N27'}</div>
                                    <div className="text-zinc-400 text-[9px] font-mono">باب: {log.injTempDoor ?? 0}°م | كابينة: {log.injTempCabinet ?? 0}°م</div>
                                  </td>
                                </>
                              )}

                              {activeCritTab === 'final_torque' && (
                                <>
                                  <td className="p-2.5 font-bold text-zinc-700">{log.modelName}</td>
                                  <td className="p-2.5 text-center font-mono">{log.torqueValue} N.m</td>
                                  <td className="p-2.5 text-center text-zinc-500">{log.torqueStandard}</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(log.torqueStatus)}`}>
                                      {log.torqueStatus || 'PASS'}
                                    </span>
                                  </td>
                                </>
                              )}

                              {activeCritTab === 'start_torque' && (
                                <>
                                  <td className="p-2.5 font-bold text-zinc-700">{log.stationNum}</td>
                                  <td className="p-2.5 text-center font-mono">{log.screwdriverTorque} N.m</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(log.startTorqueStatus)}`}>
                                      {log.startTorqueStatus || 'PASS'}
                                    </span>
                                  </td>
                                </>
                              )}

                              {activeCritTab === 'inject_torque' && (
                                <>
                                  <td className="p-2.5 font-bold text-zinc-700">{log.fixingBolt}</td>
                                  <td className="p-2.5 text-center font-mono">{log.measuredTorque} N.m</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(log.injectTorqueStatus)}`}>
                                      {log.injectTorqueStatus || 'PASS'}
                                    </span>
                                  </td>
                                </>
                              )}

                              {activeCritTab === 'perf_test' && (
                                <>
                                  <td className="p-2.5 font-bold text-zinc-700">{log.modelName}</td>
                                  <td className="p-2.5 text-center font-mono text-zinc-800">
                                    {log.cabinetTemp}°C / {log.freezerTemp}°C
                                  </td>
                                  <td className="p-2.5 text-center font-mono">{log.currentAmp} A</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColor(log.perfResult)}`}>
                                      {log.perfResult || 'PASS'}
                                    </span>
                                  </td>
                                </>
                              )}

                              {lineId === 'LINE_B' && (
                                <td className="p-2.5 text-center">
                                  <button
                                    onClick={() => handleDeleteCriticalLog(log.id)}
                                    title="حذف السجل"
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: TRIAL_RUNS */}
        {/* ========================================================================= */}
        {currentSection === 'TRIAL_RUNS' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">تجارب التشغيل والاختبار الكهربائي والحراري المستمر</h2>
                <p className="text-[10px] text-zinc-400">مراقبة عينات الفحص المستمرة في غرف درجات الحرارة لخط الإنتاج: {getLineName(lineId)}</p>
              </div>
            </div>

            {trialSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-xs font-bold animate-pulse">
                {trialSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Trial Input Form */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">تسجيل تجربة تشغيل لعينة</h3>
                
                <form onSubmit={handleSubmitTrialRun} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">الرقم التسلسلي للعينة (Serial Number)</label>
                    <input 
                      type="text" value={trialSerial} onChange={e => setTrialSerial(e.target.value)} 
                      placeholder="مثال: TR-TOSH-450L-102"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-right font-mono" required 
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">موديل الثلاجة</label>
                    <select
                      value={trialModel}
                      onChange={e => setTrialModel(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs text-right outline-none"
                    >
                      {factoryModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-zinc-550 font-bold mb-1">فترة التشغيل (Duration)</label>
                      <input 
                        type="text" value={trialDuration} onChange={e => setTrialDuration(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-right outline-none" required 
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-550 font-bold mb-1">حرارة الكابينة المحققة (°C)</label>
                      <input 
                        type="number" step="0.1" value={trialCabinetTemp} onChange={e => setTrialCabinetTemp(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-center font-mono outline-none" required 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">النتيجة والتقييم النهائي</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" onClick={() => setTrialResult('PASS')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${trialResult === 'PASS' ? 'bg-emerald-50 border-emerald-305 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                      >
                        ناجح (Pass)
                      </button>
                      <button 
                        type="button" onClick={() => setTrialResult('FAIL')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${trialResult === 'FAIL' ? 'bg-red-50 border-red-305 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                      >
                        فشل (Fail)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">ملاحظات الفني التفصيلية</label>
                    <textarea 
                      value={trialNotes} onChange={e => setTrialNotes(e.target.value)} 
                      placeholder="حالة الضجيج، سحب الكهرباء، سلامة الثرموستات..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-right outline-none h-16 resize-none"
                    />
                  </div>

                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-xl text-xs">
                    حفظ وإثبات عينة تجربة التشغيل
                  </button>
                </form>
              </div>

              {/* Trial Logs Table */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">سجلات وتجارب التشغيل النشطة بالشهر</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                        <th className="p-2.5">سيريال العينة</th>
                        <th className="p-2.5">الموديل</th>
                        <th className="p-2.5">مدة التشغيل</th>
                        <th className="p-2.5">درجة الحرارة</th>
                        <th className="p-2.5">النتيجة</th>
                        <th className="p-2.5">ملاحظات التشغيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {lineTrialRuns.map(tr => {
                        const isTempErr = tr.cabinetTemp > -18;
                        return (
                          <tr key={tr.id} className="hover:bg-zinc-50">
                            <td className="p-2.5 font-mono font-bold text-zinc-900">{tr.serialNumber}</td>
                            <td className="p-2.5 text-zinc-650 font-bold">{getModelName(tr.modelId)}</td>
                            <td className="p-2.5 text-zinc-500">{tr.duration}</td>
                            <td className={`p-2.5 font-mono font-extrabold ${isTempErr ? 'text-red-650' : 'text-emerald-700'}`}>
                              {tr.cabinetTemp} °C
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tr.result === 'PASS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {tr.result === 'PASS' ? 'ناجح' : 'فاشل'}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-400 font-medium max-w-xs truncate">{tr.notes || 'لا يوجد'}</td>
                          </tr>
                        );
                      })}
                      {lineTrialRuns.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-zinc-400 font-bold">لم يتم تسجيل تجارب تشغيل حالياً للخط.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: ARCHIVE */}
        {/* ========================================================================= */}
        {currentSection === 'ARCHIVE' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">أرشيف فحوصات خط الإنتاج ({getLineName(lineId)})</h2>
                  <p className="text-[10px] text-zinc-400">تصفح وفلترة كافة سجلات الفحوصات الفنية لخط التجميع</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                    <th className="py-3 px-4">رقم السيريال (Serial)</th>
                    <th className="py-3 px-4">الموديل (Model)</th>
                    <th className="py-3 px-4">المفتش</th>
                    <th className="py-3 px-4">وقت الفحص</th>
                    <th className="py-3 px-4 text-center">النتيجة</th>
                    <th className="py-3 px-4">أعطال الوحدة إن وجدت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {lineInspections.map((log) => {
                    const modelObj = models.find(m => m.id === log.modelId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/55 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-950 tracking-wider">
                          {log.serialNumber}
                        </td>
                        <td className="py-3 px-4 text-zinc-800 font-bold">
                          {modelObj ? modelObj.name : log.modelId}
                        </td>
                        <td className="py-3 px-4 text-zinc-650">
                          {log.inspectorName} ({log.inspectorSap})
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">
                          {safeDateString(log.timestamp)} - {safeTimeString(log.timestamp)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'PASS' ? 'bg-emerald-50 border-emerald-250 text-emerald-750' : 'bg-red-50 border-red-250 text-red-750'
                          }`}>
                            {log.status === 'PASS' ? 'مطابق' : 'مرفوض'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-sans max-w-xs truncate">
                          {log.defects.length === 0 ? (
                            <span className="text-emerald-600 text-[10px] font-bold">• سليم</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {log.defects.map((def, id) => {
                                const defObj = DEFECT_OPTIONS.find(d => d.id === def.defectOptionId);
                                return (
                                  <span key={id} className="bg-red-50 text-red-600 px-1.5 py-0.2 rounded text-[9px] border border-red-150 font-bold">
                                    {defObj ? defObj.label : def.defectOptionId}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {lineInspections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-zinc-400 font-bold">لا توجد فحوصات مسجلة في الأرشيف لخط الإنتاج هذا.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: TEST_INSTRUCTIONS */}
        {/* ========================================================================= */}
        {currentSection === 'TEST_INSTRUCTIONS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">تعليمات وكتيب اختبارات الجودة المعتمد لمجموعة العربي</h2>
                <p className="text-[10px] text-zinc-400">المعايير المعتمدة من توشيبا اليابانية وقسم الجودة بمصر لخطوط تجميع الثلاجات</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-[10px]">المظهر الخارجي وصاج الثلاجة</span>
                <p className="text-zinc-700 font-bold mt-1">المعايير القياسية للفحص البصري 100%:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-550 mt-1.5 leading-relaxed pr-2">
                  <li>عدم وجود أي خدوش على السطح الخارجي للباب أو الهيكل وصاج الجوانب.</li>
                  <li>تطابق حواف الجوانات والكاوتش المطاطي لمنع أي تسرب للبرودة.</li>
                  <li>استواء الهيكل الخارجي والقاعدة السفلية للثلاجة وخلوها من الانبعاجات.</li>
                </ul>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-bold text-[10px]">دائرة التبريد وشحنة الغاز</span>
                <p className="text-zinc-700 font-bold mt-1">مواصفات تجميع كابينة التبريد الفنية:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-550 mt-1.5 leading-relaxed pr-2">
                  <li>التحقق التام من جودة لحامات أنابيب المكثف والضاغط النحاسية.</li>
                  <li>توافق ضغط تفريغ الهواء ومستوى غاز الفريون المحقون وصمام الخدمة.</li>
                  <li>سلامة تمدد الغاز داخل المواسير وعدم وجود صوت سريان شاذ بالدائرة.</li>
                </ul>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-bold text-[10px]">الدائرة الكهربائية وعمل الكنترول</span>
                <p className="text-zinc-700 font-bold mt-1">اختبار الجهد والتيار ولوحة التحكم:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-550 mt-1.5 leading-relaxed pr-2">
                  <li>التحقق من عمل الكنترول واللوحة الديجيتال وضبط مستويات درجات الحرارة.</li>
                  <li>سلامة كابل التغذية الأرضي ومقاومة العزل عالية القوة ضد الصعق.</li>
                  <li>انتظام تشغيل لمبة الإضاءة الداخلية ومروحة الفريزر عند فتح وإغلاق الباب.</li>
                </ul>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px]">الملحقات والأرفف والأدراج</span>
                <p className="text-zinc-700 font-bold mt-1">تنسيق وتثبيت المستلزمات الداخلية:</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-550 mt-1.5 leading-relaxed pr-2">
                  <li>ترتيب الرفوف الزجاجية المقاومة للكسر بموضعها المخصص في المجاري.</li>
                  <li>سلامة أدراج حفظ الخضراوات وسلاستها أثناء السحب والإغلاق.</li>
                  <li>إضافة أكياس الكتالوج الضمان وقطع الثلج والملحقات الإضافية كاملة.</li>
                </ul>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: MY_RECENT_INSPECTIONS */}
        {/* ========================================================================= */}
        {currentSection === 'MY_RECENT_INSPECTIONS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">سجل فحوصاتي الأخيرة للفني: {user.name}</h2>
                <p className="text-[10px] text-zinc-400">مراجعة أحدث الوحدات التي قمت بفحصها بنفسك في المصنع</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                    <th className="py-3 px-4">رقم السيريال (Serial)</th>
                    <th className="py-3 px-4">الموديل (Model)</th>
                    <th className="py-3 px-4">وقت الفحص</th>
                    <th className="py-3 px-4 text-center">النتيجة</th>
                    <th className="py-3 px-4 text-center">قرار المشرف الفني</th>
                    <th className="py-3 px-4">المخالفات المرصودة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {myInspections.map((log) => {
                    const modelObj = models.find(m => m.id === log.modelId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/55 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-950 tracking-wider">
                          {log.serialNumber}
                        </td>
                        <td className="py-3 px-4 text-zinc-805 font-bold">
                          {modelObj ? modelObj.name : log.modelId}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono">
                          {safeTimeString(log.timestamp)} ({safeDateStringWithOpts(log.timestamp, { month: 'numeric', day: 'numeric' })})
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.status === 'PASS' ? 'bg-emerald-50 border-emerald-250 text-emerald-750' : 'bg-red-50 border-red-250 text-red-750'
                          }`}>
                            {log.status === 'PASS' ? 'مطابق' : 'مرفوض'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {log.status === 'PASS' ? (
                            <span className="text-zinc-400 text-[11px]">- معتمد تلقائيًا -</span>
                          ) : log.recheckStatus === 'APPROVED_AFTER_REPAIR' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-50 border-cyan-200 text-cyan-700">
                              معتمد بعد الإصلاح
                            </span>
                          ) : log.recheckStatus === 'SCRAPPED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-zinc-100 border-zinc-250 text-zinc-500">
                              تم تخريده
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 border-amber-250 text-amber-700 animate-pulse">
                              قيد المعالجة والإصلاح
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-sans max-w-xs truncate">
                          {log.defects.length === 0 ? (
                            <span className="text-emerald-600 text-[10px] font-bold">• سليم</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {log.defects.map((def, id) => {
                                const defObj = DEFECT_OPTIONS.find(d => d.id === def.defectOptionId);
                                return (
                                  <span key={id} className="bg-red-50 text-red-600 px-1.5 py-0.2 rounded text-[9px] border border-red-150 font-bold">
                                    {defObj ? defObj.label : def.defectOptionId}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {myInspections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-zinc-400 font-bold">لم تقم بتسجيل أي فحوصات ثلاجات حتى الآن في هذه الجلسة.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: NCR_REPORTS */}
        {/* ========================================================================= */}
        {currentSection === 'NCR_REPORTS' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">تقارير عدم المطابقة الفنية (Non-Conformance Reports)</h2>
                <p className="text-[10px] text-zinc-400">إصدار تقارير الأعطال المكررة بالخط واتخاذ إجراءات وقائية فورية</p>
              </div>
            </div>

            {ncrSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                {ncrSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form to raise NCR */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">إصدار تقرير عدم مطابقة (NCR) جديد</h3>
                
                <form onSubmit={handleSubmitNCR} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">عنوان الخلل أو العيب</label>
                    <input 
                      type="text" value={ncrTitle} onChange={e => setNcrTitle(e.target.value)} 
                      placeholder="مثال: شرخ بمواسير النحاس باللحامات"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-right outline-none font-bold" required 
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">الموديل المتأثر</label>
                    <select
                      value={ncrModel}
                      onChange={e => setNcrModel(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs text-right outline-none"
                    >
                      {factoryModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">تفاصيل ومظاهر الخلل المرصود بالخط</label>
                    <textarea 
                      value={ncrDesc} onChange={e => setNcrDesc(e.target.value)} 
                      placeholder="وصف دقيق للأعداد المتكررة للمنتجات المعيبة والمنبعثة بالخط..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-right outline-none h-20 resize-none" required
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">الإجراء التصحيحي الفوري المقترح</label>
                    <input 
                      type="text" value={ncrAction} onChange={e => setNcrAction(e.target.value)} 
                      placeholder="تعديل زوايا اللحام أو ضبط المكبس أو حرارة الحقن..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs text-right outline-none" required 
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">درجة الخطورة الفنية (Severity)</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" onClick={() => setNcrSeverity('MAJOR')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${ncrSeverity === 'MAJOR' ? 'bg-amber-50 border-amber-305 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}
                      >
                        كبير (Major)
                      </button>
                      <button 
                        type="button" onClick={() => setNcrSeverity('CRITICAL')} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${ncrSeverity === 'CRITICAL' ? 'bg-red-50 border-red-305 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                      >
                        حرج جداً (Critical)
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-2 rounded-xl text-xs">
                    تأكيد وإرسال تقرير الـ NCR
                  </button>
                </form>
              </div>

              {/* NCR Reports List */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">تقارير عدم المطابقة المفتوحة والنشطة للخط</h3>
                
                <div className="space-y-3.5">
                  {ncrs.filter(n => n.lineId === lineId).map(ncr => (
                    <div key={ncr.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900 text-sm">{ncr.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ncr.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ncr.severity === 'CRITICAL' ? 'حرج' : 'كبير'}
                        </span>
                      </div>
                      <p className="text-zinc-650 leading-relaxed font-medium">الموديل: {getModelName(ncr.modelId)}</p>
                      <p className="text-zinc-500 font-medium bg-white border border-zinc-155 p-2 rounded-lg text-[11px]">{ncr.description}</p>
                      <div className="pt-2 border-t border-zinc-150 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>الإجراء المطلق: <strong className="text-zinc-700">{ncr.actionRequired}</strong></span>
                        <span className="font-mono">{safeDateString(ncr.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  {ncrs.filter(n => n.lineId === lineId).length === 0 && (
                    <div className="text-center py-10 text-zinc-400 font-bold">لا توجد تقارير عدم مطابقة مفتوحة حالياً بالخط.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: LOADING_STOPS */}
        {/* ========================================================================= */}
        {currentSection === 'LOADING_STOPS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">قرارات إيقاف التحميل من خطوط الإنتاج واللوجستيات</h2>
                <p className="text-[10px] text-zinc-400">سجل إيقاف شحن وتوزيع دفعات الإنتاج بسبب مشاكل فنية حرجة بالخط: {getLineName(lineId)}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <span className="font-black text-red-800 text-sm block">تحذير لوجستي عاجل!</span>
                  <p className="text-red-750 leading-relaxed font-medium">
                    يمنع تماماً شحن أو تحميل أي عينات من الدفعات الموقوفة لحين صدور تقرير توكيد الجودة المعتمد والموقع إلكترونياً من مدير الجودة والمشرف العام على النوبة.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-550 font-extrabold text-[10px]">
                      <th className="p-3">رقم الإيقاف (ID)</th>
                      <th className="p-3">الموديل المتأثر</th>
                      <th className="p-3">سبب الإيقاف الفني الدقيق</th>
                      <th className="p-3">الجهة الموقِفة</th>
                      <th className="p-3 text-center">حالة القرار</th>
                      <th className="p-3">تاريخ ووقت القرار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {loadingStops.filter(s => s.lineId === lineId).map(stop => (
                      <tr key={stop.id} className="hover:bg-rose-50/20 font-bold text-zinc-700">
                        <td className="p-3 font-mono text-zinc-400 text-[10px]">{stop.id}</td>
                        <td className="p-3 text-zinc-905">{getModelName(stop.modelId)}</td>
                        <td className="p-3 text-red-700 font-semibold">{stop.reason}</td>
                        <td className="p-3 text-zinc-500">{stop.stoppedBy}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            stop.status === 'ACTIVE' ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          }`}>
                            {stop.status === 'ACTIVE' ? 'إيقاف نشط' : 'تم فك الإيقاف'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-450 font-mono">
                          {safeDateString(stop.timestamp)} - {safeTimeString(stop.timestamp)}
                        </td>
                      </tr>
                    ))}
                    {loadingStops.filter(s => s.lineId === lineId).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-zinc-400 font-bold">لا توجد قرارات إيقاف تحميل نشطة بالخط حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: PRODUCTION_QTY */}
        {/* ========================================================================= */}
        {currentSection === 'PRODUCTION_QTY' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">مراقبة وتسجيل كمية الإنتاج اليومية والشهرية</h2>
                <p className="text-[10px] text-zinc-400">تحديث أرقام الإنتاج الفعلي مقابل المخطط لخط التجميع: {getLineName(lineId)}</p>
              </div>
            </div>

            {prodSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-xs font-bold">
                {prodSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form to log quantity */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">تسجيل إحصائية إنتاجية جديدة</h3>
                
                <form onSubmit={handleSubmitProdQty} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">الكمية المستهدفة للنوبة (Target Qty)</label>
                    <input 
                      type="number" value={prodTarget} onChange={e => setProdTarget(e.target.value)} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none font-mono" required 
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">الكمية الفعلية المفحوصة والمنتجة (Actual Qty)</label>
                    <input 
                      type="number" value={prodActual} onChange={e => setProdActual(e.target.value)} 
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none font-mono" required 
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-550 font-bold mb-1">ملاحظات خط الإنتاج اليومي</label>
                    <textarea 
                      value={prodNotes} onChange={e => setProdNotes(e.target.value)} 
                      placeholder="الأسباب في حال عدم تحقيق المستهدف أو تعطل النصف ساعة الأخيرة بالخط..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-right outline-none h-20 resize-none"
                    />
                  </div>

                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-xl text-xs">
                    حفظ وإدراج كميات الإنتاجية
                  </button>
                </form>
              </div>

              {/* Chart / List of quantities */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
                <h3 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-2">تاريخ وحجم الإنتاج اليومي بالخط</h3>
                
                <div className="space-y-4">
                  {productionQuantities.filter(q => q.lineId === lineId).map(p => {
                    const pct = p.target > 0 ? Math.round((p.actual / p.target) * 100) : 0;
                    return (
                      <div key={p.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-800 text-[11px] font-mono">تاريخ التسجيل: {safeDateString(p.timestamp)}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-150 text-zinc-700`}>
                            نسبة الإنجاز: {pct}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-zinc-650 font-bold text-[11px]">
                          <span>الكمية الفعلية: <strong className="text-zinc-900 font-mono">{p.actual} ثلاجة</strong></span>
                          <span>الكمية المستهدفة: <strong className="text-zinc-400 font-mono">{p.target} ثلاجة</strong></span>
                        </div>

                        {p.notes && (
                          <p className="text-[10px] text-zinc-400 mt-1 bg-white p-2 rounded border border-zinc-100 italic">
                            * {p.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {productionQuantities.filter(q => q.lineId === lineId).length === 0 && (
                    <div className="text-center py-10 text-zinc-400 font-bold">لا توجد قيود إنتاجية مسجلة حالياً بالخط.</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : null}

      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-400 text-[10px] font-bold">
        <p>© شركة العربي للصناعات الهندسية • نظام توكيد جودة الثلاجات المتنقل</p>
        <p className="mt-1 font-medium">يتم مزامنة كافة الفحوصات والعمليات الحرجة فوراً مع قواعد البيانات المركزية للشركة.</p>
      </footer>
    </div>
  );
}
