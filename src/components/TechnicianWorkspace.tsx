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
  Gauge, Activity, FileText, ChevronLeft
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
  inspectorSap: string;
  vacuumLevel: number; // mbar (Standard <= 0.1)
  gasCharge: number; // grams (Standard 60g +/- 2g)
  insulationRes: number; // MegaOhms (Standard >= 100)
  heliumLeak: 'PASS' | 'FAIL';
  timestamp: string;
  // Extended for AppSheet synchronization:
  date?: string;
  shift?: string;
  machine?: string;
  modelName?: string;
  source?: 'WEBSITE' | 'APPSHEET';
  rawCharge?: string | number;
}

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
      { id: 'CRIT-1', lineId: 'LINE_A', inspectorSap: '40016452', vacuumLevel: 0.08, gasCharge: 59.5, insulationRes: 120, heliumLeak: 'PASS', timestamp: new Date().toISOString(), source: 'WEBSITE' },
      { id: 'CRIT-2', lineId: 'LINE_B', inspectorSap: '12345678', vacuumLevel: 0.09, gasCharge: 60.2, insulationRes: 105, heliumLeak: 'PASS', timestamp: new Date().toISOString(), source: 'WEBSITE' }
    ];
  });

  // AppSheet Google Sheet published CSV urls
  const [sheetUrls, setSheetUrls] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_sheet_urls');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      LINE_A: '',
      LINE_B: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQmFuckmtTroMM1r-FLYIKKfZF92NbGQE7hmhPM_jbiE8tayt_2H8vwiUt6R_pehFJKpLm8144szGSm/pub?output=csv',
      LINE_C: ''
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

  // Sync URLs and logs to localStorage on changes
  useEffect(() => {
    localStorage.setItem('elaraby_qa_sheet_urls', JSON.stringify(sheetUrls));
  }, [sheetUrls]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_synced_critical_logs', JSON.stringify(syncedLogs));
  }, [syncedLogs]);

  // Robust CSV parser
  const parseCriticalSheetCSV = (csvText: string, targetLineId: ProductionLineId): CriticalLog[] => {
    const lines = csvText.split('\n');
    if (lines.length <= 1) return [];
    
    const results: CriticalLog[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 5) continue;
      
      const dateStr = parts[0];
      const shift = parts[1];
      const machine = parts[2];
      const model = parts[3];
      const charge = parts[4];
      
      if (dateStr === 'التاريخ' || dateStr === '2' || (!dateStr && !shift && !machine)) continue;
      
      let parsedTimestamp = new Date().toISOString();
      try {
        if (dateStr.includes('/')) {
          const dParts = dateStr.split('/');
          if (dParts.length === 3) {
            const day = parseInt(dParts[0]);
            const month = parseInt(dParts[1]) - 1;
            const year = parseInt(dParts[2]);
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
      
      results.push({
        id: `APPSHEET-${targetLineId}-${i}-${dateStr}-${machine}-${charge}`,
        lineId: targetLineId,
        inspectorSap: 'AppSheet',
        vacuumLevel: 0.08,
        gasCharge: parseFloat(charge) || 0,
        insulationRes: 110,
        heliumLeak: 'PASS',
        timestamp: parsedTimestamp,
        date: dateStr,
        shift: shift,
        machine: machine,
        modelName: model,
        source: 'APPSHEET',
        rawCharge: charge
      } as any);
    }
    
    return results;
  };

  // Sync function
  const handleSyncSheet = async (targetLineId: ProductionLineId) => {
    const url = sheetUrls[targetLineId];
    if (!url) {
      setSyncError('لم يتم إدخال رابط جدول بيانات جوجل (Google Sheet) لهذا الخط بعد.');
      return;
    }
    
    setIsSyncing(true);
    setSyncError('');
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`خطأ في جلب البيانات: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = parseCriticalSheetCSV(csvText, targetLineId);
      
      setSyncedLogs(prev => {
        const rest = prev.filter(log => log.lineId !== targetLineId);
        return [...parsed, ...rest];
      });
      
      setCritSuccessMsg('تم مزامنة وتحديث بيانات AppSheet بنجاح!');
      setTimeout(() => setCritSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setSyncError(`فشل الاتصال بجدول البيانات المرفوع. تأكد من نشر الملف كـ CSV ومن صحة الرابط. تفاصيل الخطأ: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto sync on mount/active line change
  useEffect(() => {
    if (sheetUrls[lineId]) {
      handleSyncSheet(lineId);
    }
  }, [lineId, sheetUrls[lineId]]);

  // Memoized unified critical logs list for display
  const allCriticalLogs = React.useMemo(() => {
    const localLineLogs = criticalLogs.filter(l => l.lineId === lineId).map(log => ({
      ...log,
      source: log.source || 'WEBSITE' as const,
      shift: (log as any).shift || 'الأولى',
      machine: (log as any).machine || 'موقع الويب',
      modelName: (log as any).modelName || getModelName(log.modelName || modelId) || 'عام',
      rawCharge: (log as any).rawCharge || log.gasCharge,
      date: (log as any).date || new Date(log.timestamp).toLocaleDateString('ar-EG')
    }));
    
    const syncedLineLogs = syncedLogs.filter(l => l.lineId === lineId);
    
    return [...localLineLogs, ...syncedLineLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [criticalLogs, syncedLogs, lineId, modelId, models]);

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

  const handleSubmitCriticalLog = (e: React.FormEvent) => {
    e.preventDefault();
    let newLog: CriticalLog;

    if (entryType === 'APPSHEET_ALIGN') {
      const formattedDate = manualDate.split('-').reverse().join('/'); // "DD/MM/YYYY"
      newLog = {
        id: `CRIT-${Date.now()}`,
        lineId,
        inspectorSap: user.sapNumber || 'UNKNOWN',
        vacuumLevel: 0.08, // standard ok
        gasCharge: isNaN(parseFloat(manualCharge)) ? 0 : parseFloat(manualCharge),
        insulationRes: 110, // standard ok
        heliumLeak: 'PASS',
        timestamp: new Date(manualDate + 'T12:00:00').toISOString(),
        date: formattedDate,
        shift: manualShift,
        machine: manualMachine,
        modelName: manualModelName || getModelName(modelId),
        source: 'WEBSITE',
        rawCharge: manualCharge
      } as any;
    } else {
      newLog = {
        id: `CRIT-${Date.now()}`,
        lineId,
        inspectorSap: user.sapNumber || 'UNKNOWN',
        vacuumLevel: parseFloat(vacuumInput) || 0,
        gasCharge: parseFloat(gasInput) || 0,
        insulationRes: parseFloat(insulationInput) || 0,
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

    setCriticalLogs(prev => [newLog, ...prev]);
    setCritSuccessMsg('تم تسجيل عملية الجودة الحرجة وتحديث السجل بنجاح!');
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

  // Helpers
  const getLineName = (lid: string) => {
    const l = PRODUCTION_LINES.find(x => x.id === lid);
    return l ? l.name : lid;
  };

  const getModelName = (mid: string) => {
    const m = models.find(x => x.id === mid);
    return m ? m.name : mid;
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
                  <ClipboardList className="w-5 h-5" />
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
                  <span>التقارير النشطة ({ncrs.filter(n => n.lineId === lineId).length})</span>
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
                  <h3 className="text-xs font-black text-zinc-900">إيقافات التحميل</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">سجل قرارات إيقاف شحن وتوزيع دفعات ثلاجات معينة في حالة رصد عيب حرج بالخط.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-rose-600 font-bold pt-2 border-t border-zinc-100">
                  <span>الإيقافات الحالية ({loadingStops.filter(s => s.lineId === lineId).length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 9 */}
              <div 
                onClick={() => setCurrentSection('PRODUCTION_QTY')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">كمية الإنتاج</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تسجيل الإنتاجية المستهدفة والفعلية لخط تجميع الثلاجات الحالي ومتابعة نسب الإنجاز.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-600 font-bold pt-2 border-t border-zinc-100">
                  <span>حجم الإنتاجية والخطط</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: DAILY_INSPECTION */}
        {/* ========================================================================= */}
        {currentSection === 'DAILY_INSPECTION' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">تسجيل الفحص اليومي للثلاجات</h2>
                  <p className="text-[10px] text-zinc-400">إدخال بيانات الفحص الفني الروتيني لخط الإنتاج: {getLineName(lineId)}</p>
                </div>
              </div>
              <button
                onClick={handleResetForm}
                className="text-xs text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                إعادة ضبط الاستمارة
              </button>
            </div>

            <form onSubmit={handleSubmitDailyInspection} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form Settings */}
              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <h3 className="text-xs font-black text-zinc-900">بيانات الوحدة والموديل</h3>
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-xs text-zinc-550 font-bold mb-2">موديل الثلاجة</label>
                    <select
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-zinc-805 outline-none transition-all"
                    >
                      {factoryModels.map(model => (
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

              {/* Right Checklist and Defect logs */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b border-zinc-150 pb-2">
                    <h3 className="text-xs font-black text-zinc-900">بنود الفحص الفني الفصلي للثلاجة</h3>
                  </div>

                  <div className="space-y-2.5">
                    {CHECKLIST_ITEMS.map((item, idx) => {
                      const isItemPassed = checklist[item.id] !== false;
                      return (
                        <div 
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                            isItemPassed ? 'bg-zinc-50/50 border-zinc-200' : 'bg-red-50/40 border-red-200'
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase bg-zinc-150 text-zinc-600 border border-zinc-200">
                              {item.category === 'exterior' && 'مظهر خارجي'}
                              {item.category === 'cooling' && 'دائرة التبريد'}
                              {item.category === 'electrical' && 'توصيل كهربي'}
                              {item.category === 'safety' && 'أمان عزل'}
                              {item.category === 'accessories' && 'ملحقات وأرفف'}
                            </span>
                            <h4 className="text-xs font-bold text-zinc-805 mt-1">{item.label}</h4>
                            <p className="text-[10px] text-zinc-400">{item.description}</p>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(item.id, true)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                isItemPassed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-50 text-zinc-500'
                              }`}
                            >
                              مطابق
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleChecklist(item.id, false)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                !isItemPassed ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-50 text-zinc-500'
                              }`}
                            >
                              مرفوض
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Defects */}
                  {selectedDefects.length > 0 && (
                    <div className="bg-red-50/40 border border-red-200 rounded-xl p-4.5 space-y-4">
                      <div className="flex items-center gap-2 text-red-700 border-b border-red-150 pb-2">
                        <BadgeAlert className="w-4 h-4" />
                        <span className="text-xs font-bold">تسجيل مبررات وأسباب عدم المطابقة</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {DEFECT_OPTIONS.map((def) => {
                          const isChosen = selectedDefects.includes(def.id);
                          return (
                            <div 
                              key={def.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isChosen ? 'bg-red-50 border-red-300 text-red-850' : 'bg-zinc-50'
                              }`}
                              onClick={() => handleToggleDefect(def.id)}
                            >
                              <div className="flex items-start gap-2">
                                <input type="checkbox" checked={isChosen} onChange={() => {}} className="mt-0.5 rounded text-red-600 focus:ring-red-500" />
                                <div>
                                  <span className="text-xs font-bold block">{def.label}</span>
                                  <span className="text-[10px] text-zinc-400 font-mono">Severity: {def.severity}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-4">
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
                  <h2 className="text-sm font-black text-zinc-900">العمليات الحرجة وتفريغ الهواء وشحن الغاز</h2>
                  <p className="text-[10px] text-zinc-400">مزامنة تلقائية مع AppSheet وجدول بيانات جوجل لمصنع: {getLineName(lineId)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${sheetUrls[lineId] ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sheetUrls[lineId] ? 'bg-emerald-500' : 'bg-amber-500'} ${sheetUrls[lineId] ? 'animate-ping' : ''}`}></span>
                  {sheetUrls[lineId] ? 'مربوط بـ AppSheet' : 'غير مربوط'}
                </span>
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

            {/* AppSheet / Google Sheets Link Configuration Card */}
            <div className="bg-gradient-to-l from-zinc-50 to-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    رابط جدول بيانات جوجل (Google Sheet / AppSheet CSV)
                  </h3>
                  <p className="text-[10px] text-zinc-400">تأكد من نشر الجدول كملف CSV عام ليقوم الموقع بجلب بيانات الفحص تلقائيًا.</p>
                </div>
                
                <div className="flex-1 max-w-xl flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="ضع رابط الـ CSV هنا..."
                    value={sheetUrls[lineId] || ''}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setSheetUrls(prev => ({ ...prev, [lineId]: newUrl }));
                    }}
                    className="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500 font-mono"
                  />
                  
                  <button 
                    onClick={() => handleSyncSheet(lineId)}
                    disabled={isSyncing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    {isSyncing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        مزامنة...
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5" />
                        تحديث ومزامنة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Entry Form Column */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                {/* Form Tab Selector */}
                <div className="flex bg-zinc-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEntryType('APPSHEET_ALIGN')}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${entryType === 'APPSHEET_ALIGN' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-550 hover:text-zinc-900'}`}
                  >
                    شحن فريون (أب شيت)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('LAB_TEST')}
                    className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all ${entryType === 'LAB_TEST' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-550 hover:text-zinc-900'}`}
                  >
                    فحص معملي كامل
                  </button>
                </div>

                {entryType === 'APPSHEET_ALIGN' ? (
                  // AppSheet Aligned Form
                  <form onSubmit={handleSubmitCriticalLog} className="space-y-4 text-xs">
                    <h4 className="font-bold text-zinc-900 pb-1 border-b border-zinc-100 flex items-center gap-1">
                      <PlusCircle className="w-4 h-4 text-blue-500" />
                      إدخال مباشر لعملية شحن غاز
                    </h4>
                    
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">تاريخ العملية</label>
                      <input 
                        type="date" 
                        value={manualDate} 
                        onChange={e => setManualDate(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" 
                        required 
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">الوردية</label>
                      <select 
                        value={manualShift} 
                        onChange={e => setManualShift(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs outline-none"
                      >
                        <option value="الأولى">الأولى</option>
                        <option value="الثانية">الثانية</option>
                        <option value="الثالثة">الثالثة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">ماكينة الشحن</label>
                      <select 
                        value={manualMachine} 
                        onChange={e => setManualMachine(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs outline-none mb-2"
                      >
                        <option value="اجرامكو 1">اجرامكو 1</option>
                        <option value="R600">ماكينة R600</option>
                        <option value="اجرامكو 2">اجرامكو 2</option>
                        <option value="custom">كتابة يدوية...</option>
                      </select>
                      {manualMachine === 'custom' && (
                        <input 
                          type="text" 
                          placeholder="اكتب اسم الماكينة هنا..."
                          value={manualMachine === 'custom' ? '' : manualMachine}
                          onChange={e => setManualMachine(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                          required
                        />
                      )}
                    </div>

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
                      <label className="block text-zinc-700 font-bold mb-1">وزن الشحنة الفعلية</label>
                      <input 
                        type="text" 
                        placeholder="مثال: 114 أو OK" 
                        value={manualCharge} 
                        onChange={e => setManualCharge(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none text-left" 
                        required 
                      />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl text-xs transition-colors">
                      تسجيل وحفظ شحنة الغاز
                    </button>
                  </form>
                ) : (
                  // Full Lab Test Form
                  <form onSubmit={handleSubmitCriticalLog} className="space-y-4">
                    <h4 className="font-bold text-zinc-900 pb-1 border-b border-zinc-100 flex items-center gap-1">
                      <PlusCircle className="w-4 h-4 text-red-500" />
                      تسجيل فحص معملي كامل للوحدة
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">مستوى تفريغ الهواء (Vacuum Level - mbar)</label>
                      <input 
                        type="number" step="0.001" value={vacuumInput} onChange={e => setVacuumInput(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" required 
                      />
                      <span className="text-[10px] text-zinc-400 block mt-1">* المعيار القياسي: أقل من أو يساوي 0.1 mbar</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">وزن شحنة الفريون (Gas Charge - Grams)</label>
                      <input 
                        type="number" step="0.1" value={gasInput} onChange={e => setGasInput(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" required 
                      />
                      <span className="text-[10px] text-zinc-400 block mt-1">* المعيار القياسي: 60 جرام (+/- 2 جرام)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">مقاومة عزل الكهرباء (Insulation - MΩ)</label>
                      <input 
                        type="number" step="1" value={insulationInput} onChange={e => setInsulationInput(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold outline-none" required 
                      />
                      <span className="text-[10px] text-zinc-400 block mt-1">* المعيار القياسي: أكثر من أو يساوي 100 MegaOhm</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-1">كاشف تسريب غاز الهيليوم (Helium Leak Test)</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" onClick={() => setHeliumLeakInput('PASS')} 
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${heliumLeakInput === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}
                        >
                          سليم (Pass)
                        </button>
                        <button 
                          type="button" onClick={() => setHeliumLeakInput('FAIL')} 
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${heliumLeakInput === 'FAIL' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-zinc-100 text-zinc-500'}`}
                        >
                          تسريب (Fail)
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition-colors">
                      حفظ وتوثيق قيم المعمل للوحدة
                    </button>
                  </form>
                )}
              </div>

              {/* Logs Archive List Table Column */}
              <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                
                {/* Section Title and Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-150 pb-3">
                  <h3 className="text-xs font-bold text-zinc-900">سجل قياسات الجودة الحرجة وشحن الغاز المدمج</h3>
                  
                  <div className="text-[10px] text-zinc-500 font-medium">
                    إجمالي الفحوصات: <strong className="text-zinc-950 font-extrabold">{allCriticalLogs.length}</strong> عينة
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px]">
                        <th className="p-2.5">المصدر</th>
                        <th className="p-2.5">التاريخ / الوقت</th>
                        <th className="p-2.5">الوردية</th>
                        <th className="p-2.5">ماكينة الشحن</th>
                        <th className="p-2.5">الموديل</th>
                        <th className="p-2.5 text-center">شحنة الغاز</th>
                        <th className="p-2.5 text-center">تفريغ / عزل</th>
                        <th className="p-2.5 text-center">كاشف الهيليوم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-150">
                      {allCriticalLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-zinc-400 font-medium">
                            لا توجد قراءات مسجلة حالياً للخط. قم بتسجيل قراءة أو مزامنة بيانات AppSheet.
                          </td>
                        </tr>
                      ) : (
                        allCriticalLogs.map((log) => {
                          const isAppSheet = log.source === 'APPSHEET';
                          
                          // Parse gas charge status or color
                          let isGasErr = false;
                          if (typeof log.gasCharge === 'number') {
                            if (log.gasCharge > 0) {
                              if (log.gasCharge >= 50 && log.gasCharge <= 70) {
                                isGasErr = log.gasCharge < 58 || log.gasCharge > 62;
                              }
                            }
                          } else if (typeof log.rawCharge === 'string') {
                            const rawUpper = log.rawCharge.toUpperCase();
                            isGasErr = rawUpper === 'FAIL' || rawUpper === 'NG';
                          }

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
                                {log.date || new Date(log.timestamp).toLocaleDateString('ar-EG')}
                                <span className="text-[10px] text-zinc-400 block font-normal">
                                  {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>
                              
                              <td className="p-2.5 font-bold text-zinc-800">{log.shift}</td>
                              <td className="p-2.5 font-bold text-zinc-700">{log.machine}</td>
                              <td className="p-2.5 text-zinc-650 max-w-[140px] truncate" title={log.modelName}>{log.modelName}</td>
                              
                              <td className={`p-2.5 font-mono font-black text-center ${isGasErr ? 'text-red-600 bg-red-50' : 'text-zinc-800'}`}>
                                {log.rawCharge || log.gasCharge}
                              </td>
                              
                              <td className="p-2.5 text-center text-zinc-400 font-mono text-[10px]">
                                {isAppSheet ? (
                                  <span className="text-zinc-400 font-normal">-</span>
                                ) : (
                                  <span className="font-bold text-zinc-700">
                                    {log.vacuumLevel} mbar / {log.insulationRes} MΩ
                                  </span>
                                )}
                              </td>
                              
                              <td className="p-2.5 text-center">
                                {isAppSheet ? (
                                  <span className="text-emerald-600 font-bold">✓ تلقائي</span>
                                ) : (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.heliumLeak === 'FAIL' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {log.heliumLeak}
                                  </span>
                                )}
                              </td>
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
                          {new Date(log.timestamp).toLocaleDateString('ar-EG')} - {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
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
                          {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} ({new Date(log.timestamp).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })})
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
                        <span className="font-mono">{new Date(ncr.timestamp).toLocaleDateString('ar-EG')}</span>
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
                          {new Date(stop.timestamp).toLocaleDateString('ar-EG')} - {new Date(stop.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
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
                          <span className="font-bold text-zinc-800 text-[11px] font-mono">تاريخ التسجيل: {new Date(p.timestamp).toLocaleDateString('ar-EG')}</span>
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
