/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, QualityInspectionLog, ProductionLineId, RefrigeratorModel, NCRReport } from '../types';
import { PRODUCTION_LINES, DEFECT_OPTIONS } from '../data';
import { 
  ShieldCheck, LogOut, CheckCircle2, XCircle, AlertTriangle, ListChecks, History, 
  BookOpen, Layers, Ban, ClipboardList, Calendar, Search, ArrowRight, HelpCircle, 
  Archive, Save, PlusCircle, ShieldAlert, Gauge, Activity, FileText, ChevronLeft, 
  Settings, RefreshCw, Trash2, Printer, FileSpreadsheet, Eye, EyeOff, CheckSquare, 
  AlertCircle, Sparkles, ClipboardCheck
} from 'lucide-react';
import { OfficialReportModal } from './OfficialReportModal';
import XLSX from 'xlsx-js-style';
import { 
  SHARP_PERFORMANCE_TESTS, 
  SHARP_CONSTRUCTION_TESTS, 
  TORNADO_PERFORMANCE_TESTS, 
  TORNADO_CONSTRUCTION_TESTS,
  TestInstruction 
} from '../testInstructionsData';

interface CriticalLog {
  id: string;
  lineId: string;
  tabId?: 'calib' | 'init_ass' | 'injection' | 'final_torque' | 'start_torque' | 'inject_torque' | 'perf_test';
  inspectorSap: string;
  vacuumLevel?: number;
  gasCharge?: number;
  insulationRes?: number;
  heliumLeak?: 'PASS' | 'FAIL';
  timestamp: string;
  source?: 'WEBSITE' | 'APPSHEET';
  shift?: string;
  machine?: string;
  modelName?: string;
  rawCharge?: any;
  date?: string;
  [key: string]: any;
}

interface TrialRun {
  id: string;
  lineId: string;
  serialNumber: string;
  modelId: string;
  duration: string;
  cabinetTemp: number;
  result: 'PASS' | 'FAIL';
  notes: string;
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

const CRITICAL_TABS = [
  { id: 'calib', name: 'معايرة ماكينة الشحن' },
  { id: 'init_ass', name: 'التجمع الابتدائي' },
  { id: 'injection', name: 'الحقن' },
  { id: 'final_torque', name: 'عزوم التجميع النهائي' },
  { id: 'start_torque', name: 'عزوم بداية خط' },
  { id: 'inject_torque', name: 'عزوم الحقن' },
  { id: 'perf_test', name: 'اختبار الأداء' }
] as const;

export default function SupervisorWorkspace({
  user,
  onLogout,
  inspections,
  models,
  onUpdateInspection,
  processAudits,
  onAddProcessAudit,
  ncrs,
  onUpdateNcrs: setNcrs,
  onPrintNCR,
}: {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  models: RefrigeratorModel[];
  onUpdateInspection?: any;
  processAudits?: any;
  onAddProcessAudit?: any;
  ncrs: NCRReport[];
  onUpdateNcrs: React.Dispatch<React.SetStateAction<NCRReport[]>>;
  onPrintNCR: (ncr: NCRReport) => void;
}) {
  // Line Selection based on Supervisor's assigned factoryId
  const [lineId, setLineId] = useState<ProductionLineId>(() => {
    if (user.factoryId && user.factoryId !== 'ALL') {
      return user.factoryId;
    }
    return 'LINE_A';
  });

  // Current active section (matches tech sections visually)
  const [currentSection, setCurrentSection] = useState<'DASHBOARD' | 'ARCHIVE' | 'CRITICAL_OPS' | 'TRIAL_RUNS' | 'TEST_INSTRUCTIONS' | 'NCR_REPORTS' | 'LOADING_STOPS' | 'PRODUCTION_QTY'>('DASHBOARD');

  // Month selector for statistics
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });

  // Active Detailed Report Preview Modal State
  const [activeReport, setActiveReport] = useState<QualityInspectionLog | null>(null);

  // Active Critical Operations Tab
  const [activeCritTab, setActiveCritTab] = useState<'calib' | 'init_ass' | 'injection' | 'final_torque' | 'start_torque' | 'inject_torque' | 'perf_test'>('calib');

  // NCR Feed BACK Opinion states
  const [editingNcrId, setEditingNcrId] = useState<string | null>(null);
  const [qcOpinionText, setQcOpinionText] = useState('');
  const [prodOpinionText, setProdOpinionText] = useState('');
  const [finalDecisionText, setFinalDecisionText] = useState('');
  const [ncrFinalStatus, setNcrFinalStatus] = useState<'OPEN' | 'RESOLVED'>('OPEN');

  // Load technician's logs from localStorage to view them live
  const [criticalLogs] = useState<CriticalLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_critical_logs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // State variables for test instructions
  const [instMainTab, setInstMainTab] = useState<'SHARP' | 'TORNADO'>('SHARP');
  const [instSubTab, setInstSubTab] = useState<'PERFORMANCE' | 'CONSTRUCTION'>('PERFORMANCE');
  const [instSearch, setInstSearch] = useState('');

  const [syncedLogs] = useState<CriticalLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_synced_critical_logs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [trialRuns] = useState<TrialRun[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_trial_runs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [loadingStops] = useState<LoadingStop[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_loading_stops');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [productionQuantities] = useState<ProductionQty[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_production_qty');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Supervisor reviews: recordId -> { read: boolean, reviewed: boolean }
  const [reviews, setReviews] = useState<Record<string, { read: boolean; reviewed: boolean }>>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_supervisor_reviews');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  // Toggles for Read and Reviewed states with automatic persistence
  const toggleRead = (id: string) => {
    setReviews(prev => {
      const updated = {
        ...prev,
        [id]: {
          read: !prev[id]?.read,
          reviewed: prev[id]?.reviewed || false
        }
      };
      localStorage.setItem('elaraby_qa_supervisor_reviews', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleReviewed = (id: string) => {
    setReviews(prev => {
      const updated = {
        ...prev,
        [id]: {
          read: prev[id]?.read || false,
          reviewed: !prev[id]?.reviewed
        }
      };
      localStorage.setItem('elaraby_qa_supervisor_reviews', JSON.stringify(updated));
      return updated;
    });
  };

  // Naming and formatting helpers
  const getLineName = (lid: string) => {
    switch (lid) {
      case 'LINE_A': return 'مصنع A';
      case 'LINE_B': return 'مصنع B';
      case 'LINE_C': return 'مصنع C';
      default: return lid;
    }
  };

  const getModelName = (mid: string) => {
    const found = models.find(m => m.id === mid);
    return found ? found.name : mid;
  };

  const safeDateString = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch { return '—'; }
  };

  const safeTimeString = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch { return '—'; }
  };

  // Helper status colorizer
  const statusColor = (status: string) => {
    if (status === 'PASS' || status === 'مطابق' || status === 'RELEASED' || status === 'OK' || status === 'RESOLVED') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  // Simplified spreadsheet downloader for compatibility
  const handleDownloadExcel = (log: QualityInspectionLog) => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["تقرير جودة ثلاجات العربي - فحص العينة العشوائية"],
      [""],
      ["رقم السيريال (Serial Number)", log.serialNumber],
      ["الموديل (Model Name)", getModelName(log.modelId)],
      ["المفتش الفني (Inspector)", `${log.inspectorName} (SAP: ${log.inspectorSap})`],
      ["وقت الفحص (Inspection Timestamp)", `${safeDateString(log.timestamp)} ${safeTimeString(log.timestamp)}`],
      ["خط الإنتاج (Production Line)", getLineName(log.lineId)],
      ["حالة المطابقة الفنية (Status)", log.status === 'PASS' ? "مطابق (PASS)" : "مرفوض (FAIL)"],
      [""]
    ];

    if (log.defects && log.defects.length > 0) {
      data.push(["العيوب الفنية المرصودة:"]);
      log.defects.forEach((def, idx) => {
        const dObj = DEFECT_OPTIONS.find(d => d.id === def.defectOptionId);
        data.push([`${idx + 1}. ${dObj ? dObj.label : def.defectOptionId} ${def.details ? `(ملاحظة: ${def.details})` : ''}`]);
      });
    } else {
      data.push(["نتائج الفحص: سليم ومطابق لكافة المواصفات المعتمدة."]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "بيانات الفحص");
    XLSX.writeFile(wb, `ElAraby_QA_Report_${log.serialNumber}.xlsx`);
  };

  // Filtering inspections & statistics calculations
  const lineInspections = inspections.filter(log => log.lineId === lineId);
  const sortedLineInspections = [...lineInspections].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
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
  const sortedTrialRuns = [...lineTrialRuns].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const monthlyTrialRuns = lineTrialRuns.filter(tr => {
    const trDate = new Date(tr.timestamp);
    const trY = trDate.getFullYear();
    const trM = String(trDate.getMonth() + 1).padStart(2, '0');
    return `${trY}-${trM}` === selectedMonth;
  });
  const monthTrialRunsCount = monthlyTrialRuns.length;

  const lineNcrs = ncrs.filter(ncr => ncr.lineId === lineId);
  const sortedNcrs = [...lineNcrs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleSaveNcrOpinion = (ncrId: string) => {
    setNcrs((prev: NCRReport[]) => prev.map(n => {
      if (n.id === ncrId) {
        return {
          ...n,
          qcOpinion: qcOpinionText.trim(),
          productionOpinion: prodOpinionText.trim(),
          finalDecision: finalDecisionText.trim(),
          decisionMaker: user.name,
          status: ncrFinalStatus,
        };
      }
      return n;
    }));
    setEditingNcrId(null);
  };

  const lineStops = loadingStops.filter(stop => stop.lineId === lineId);
  const sortedStops = [...lineStops].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lineQuantities = productionQuantities.filter(q => q.lineId === lineId);
  const sortedQuantities = [...lineQuantities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Critical logs unified list
  const allCriticalLogs = useMemo(() => {
    const localLineLogs = (criticalLogs || [])
      .filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === activeCritTab)
      .map(log => ({
        ...log,
        source: log.source || 'WEBSITE' as const,
        shift: log.shift || 'الأولى',
        machine: log.machine || 'خط التجميع',
        modelName: log.modelName || getModelName(log.modelName || log.modelId) || 'عام',
        rawCharge: log.rawCharge || log.gasCharge,
        date: log.date || safeDateString(log.timestamp)
      }));
    
    const syncedLineLogs = (syncedLogs || []).filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === activeCritTab)
      .map(log => ({
        ...log,
        source: log.source || 'WEBSITE' as const,
        shift: log.shift || 'الأولى',
        machine: log.machine || 'خط التجميع',
        modelName: log.modelName || getModelName(log.modelName || log.modelId) || 'عام',
        rawCharge: log.rawCharge || log.gasCharge,
        date: log.date || safeDateString(log.timestamp)
      }));
    
    return [...localLineLogs, ...syncedLineLogs].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [criticalLogs, syncedLogs, lineId, activeCritTab, models]);

  // Review progress metrics
  const totalLogsCount = useMemo(() => {
    const localLineLogs = (criticalLogs || []).filter(l => l && l.lineId === lineId);
    const syncedLineLogs = (syncedLogs || []).filter(l => l && l.lineId === lineId);
    const trialLineLogs = (trialRuns || []).filter(l => l && l.lineId === lineId);
    const ncrLineLogs = (ncrs || []).filter(l => l && l.lineId === lineId);
    const stopLineLogs = (loadingStops || []).filter(l => l && l.lineId === lineId);
    const qtyLineLogs = (productionQuantities || []).filter(l => l && l.lineId === lineId);

    return lineInspections.length + localLineLogs.length + syncedLineLogs.length + trialLineLogs.length + ncrLineLogs.length + stopLineLogs.length + qtyLineLogs.length;
  }, [lineInspections, criticalLogs, syncedLogs, trialRuns, ncrs, loadingStops, productionQuantities, lineId]);

  const reviewedLogsCount = useMemo(() => {
    let count = 0;
    const check = (id: string) => {
      if (reviews[id]?.reviewed) count++;
    };
    lineInspections.forEach(l => check(l.id));
    (criticalLogs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (syncedLogs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (trialRuns || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (ncrs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (loadingStops || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (productionQuantities || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    return count;
  }, [lineInspections, criticalLogs, syncedLogs, trialRuns, ncrs, loadingStops, productionQuantities, lineId, reviews]);

  const readLogsCount = useMemo(() => {
    let count = 0;
    const check = (id: string) => {
      if (reviews[id]?.read) count++;
    };
    lineInspections.forEach(l => check(l.id));
    (criticalLogs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (syncedLogs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (trialRuns || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (ncrs || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (loadingStops || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    (productionQuantities || []).filter(l => l && l.lineId === lineId).forEach(l => check(l.id));
    return count;
  }, [lineInspections, criticalLogs, syncedLogs, trialRuns, ncrs, loadingStops, productionQuantities, lineId, reviews]);

  // Unified visual component for supervisor actions
  const renderSupervisorToggles = (recordId: string) => {
    const isRead = reviews[recordId]?.read || false;
    const isReviewed = reviews[recordId]?.reviewed || false;

    return (
      <div className="flex items-center gap-2 justify-center">
        {/* Read Status Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleRead(recordId);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            isRead
              ? 'bg-emerald-50 border-emerald-250 text-emerald-750 hover:bg-emerald-100/50'
              : 'bg-zinc-100 border-zinc-250 text-zinc-550 hover:bg-zinc-200'
          }`}
          title={isRead ? 'تغيير إلى غير مقروء' : 'تغيير إلى مقروء'}
        >
          {isRead ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>{isRead ? 'مقروء' : 'غير مقروء'}</span>
        </button>

        {/* Reviewed Status Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleReviewed(recordId);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
            isReviewed
              ? 'bg-emerald-50 border-emerald-250 text-emerald-750 hover:bg-emerald-100/50'
              : 'bg-amber-50 border-amber-250 text-amber-700 hover:bg-amber-100'
          }`}
          title={isReviewed ? 'تغيير إلى قيد المراجعة' : 'تغيير إلى تم الاعتماد'}
        >
          {isReviewed ? <CheckSquare className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          <span>{isReviewed ? 'تمت المراجعة' : 'تحت المراجعة'}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col font-sans" dir="rtl">
      
      {/* Top Header Row */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-zinc-900">بوابة المشرفين الفنية ومراقبة الجودة</h1>
                <span className="font-mono bg-blue-50 text-blue-600 border border-blue-100 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">
                  توشيبا & العربي
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">متابعة واعتماد تسجيلات الفنيين لخطوط تجميع الثلاجات</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right text-xs">
              <span className="text-[10px] text-zinc-400 font-bold block">المشرف الفني</span>
              <span className="text-blue-600 font-bold">{user.name}</span>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded mr-2">
                كود: {user.code || 'SUP-QA'}
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
              <label className="block text-[10px] text-zinc-400 font-extrabold mb-1">المصنع المستهدف بالتدقيق والاعتماد</label>
              {user.factoryId && user.factoryId !== 'ALL' ? (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-bold">
                  {getLineName(user.factoryId)}
                </div>
              ) : (
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value as ProductionLineId)}
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
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-1.5 text-xs text-center font-bold text-zinc-800 outline-none transition-all"
              />
            </div>
          </div>

          {/* Supervisor Audit Performance Progress Widget */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl px-4 py-2.5 flex items-center gap-4">
            <div className="text-right">
              <span className="text-[9px] text-zinc-400 font-bold block">معدل مراجعة البيانات للخط الحالي</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-black text-blue-650">{reviewedLogsCount} / {totalLogsCount}</span>
                <span className="text-[10px] text-zinc-400">سجل معتمد</span>
              </div>
            </div>
            <div className="w-20 bg-zinc-200 h-2 rounded-full overflow-hidden relative">
              <div 
                className="bg-blue-600 h-full transition-all duration-500" 
                style={{ width: `${totalLogsCount > 0 ? Math.round((reviewedLogsCount / totalLogsCount) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Global Statistics Overview Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-600 font-extrabold block">العينات العشوائية المفحوصة بالشهر</span>
              <ClipboardCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-900 font-mono">{monthTotalInspected}</span>
              <span className="text-[10px] text-zinc-400">ثلاجات</span>
            </div>
            <p className="text-[9px] text-zinc-400">فحص عشوائي روتيني 100% بالخط</p>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-600 font-extrabold block">العينات المطابقة تمامًا (Pass)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 font-mono">{monthConforming}</span>
              <span className="text-[9px] text-emerald-500 font-bold">
                ({monthTotalInspected > 0 ? Math.round((monthConforming / monthTotalInspected) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[9px] text-zinc-400">خلو تام من أي ملاحظات فنية</p>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-red-650 font-extrabold block">العينات المرفوضة والعيوب (Fail)</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-red-650 font-mono">{monthNonConforming}</span>
              <span className="text-[9px] text-red-500 font-bold">
                ({monthTotalInspected > 0 ? Math.round((monthNonConforming / monthTotalInspected) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[9px] text-zinc-400">مرصودة وقيد الإصلاح بالخط</p>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-600 font-extrabold block">تجارب تشغيل العينات والضواغط</span>
              <Gauge className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 font-mono">{monthTrialRunsCount}</span>
              <span className="text-[10px] text-zinc-400">تجارب نشطة</span>
            </div>
            <p className="text-[9px] text-zinc-400">قياس استقرار التيار الكهربائي ومعدل التبريد</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONDITIONAL SECTIONS RENDER */}
        {/* ========================================================================= */}

        {currentSection === 'DASHBOARD' ? (
          <div className="space-y-6">
            <div className="border-b border-zinc-200 pb-2">
              <h2 className="text-xs font-black text-zinc-400 uppercase tracking-wider">لوحة تحكم المشرف ومراجعة السجلات</h2>
              <p className="text-xs text-zinc-500">اختر أحد الأقسام والمصنفات أدناه لمراجعة كافة بيانات الفنيين والتوقيع عليها إلكترونياً</p>
            </div>

            {/* Grid of identical Technician data blocks with supervisor review status overlay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Item 1: Archive (Daily Inspections) */}
              <div 
                onClick={() => setCurrentSection('ARCHIVE')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">أرشيف الفحوصات اليومية</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تصفح سجلات الفحص العشوائي للثلاجات والتوقيع عليها أو تصديرها وطباعتها كتقارير رسمية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-blue-600 font-bold pt-2 border-t border-zinc-100">
                  <span>فتح السجلات ({lineInspections.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 2: Critical Operations */}
              <div 
                onClick={() => setCurrentSection('CRITICAL_OPS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-red-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-red-50 text-red-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-red-600 group-hover:text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">العمليات الحرجة بمصنع {getLineName(lineId)}</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">مراقبة قياسات الشحن، عزل الفوم، عزم مفصلات الأبواب، واختبار الأداء الكهربائي المتزامن.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-red-650 font-bold pt-2 border-t border-zinc-100">
                  <span>مراجعة 7 تبويبات فنية</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 3: Trial Runs */}
              <div 
                onClick={() => setCurrentSection('TRIAL_RUNS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-amber-600 group-hover:text-white">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تجارب تشغيل العينات اليومية</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تتبع درجات حرارة كابينة التبريد والفريزر واستقرار التيار للوحدات قيد التجارب الفنية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-650 font-bold pt-2 border-t border-zinc-100">
                  <span>عرض تجارب التشغيل ({lineTrialRuns.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 4: NCR Reports */}
              <div 
                onClick={() => setCurrentSection('NCR_REPORTS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-rose-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-rose-600 group-hover:text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تقارير عدم المطابقة الفنية (NCR)</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">سجل حالات الخلل أو الأعطال المتكررة المرصودة بالخط والقرارات التصحيحية لضمان مطابقتها.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-rose-650 font-bold pt-2 border-t border-zinc-100">
                  <span>عرض التقارير النشطة ({lineNcrs.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 5: Loading Stops */}
              <div 
                onClick={() => setCurrentSection('LOADING_STOPS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-700 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-zinc-100 text-zinc-700 rounded-xl flex items-center justify-center transition-colors group-hover:bg-zinc-700 group-hover:text-white">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">قرارات إيقاف شحن الموديلات</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">أوامر حظر شحن موديلات معينة بسبب عيوب فنية طارئة وتتبع حالات فك الحظر الفني.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-750 font-bold pt-2 border-t border-zinc-100">
                  <span>عرض أوامر الحظر ({lineStops.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 6: Production Quantities */}
              <div 
                onClick={() => setCurrentSection('PRODUCTION_QTY')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
              >
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <TrendingUpIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">الكميات والإنتاجية المحققة بالخط</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">مطابقة الإنتاجية الفعلية لخط تجميع الثلاجات مع المستهدف المخطط لكل وردية عمل فنية.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-650 font-bold pt-2 border-t border-zinc-100">
                  <span>عرض تقارير الإنتاجية ({lineQuantities.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

              {/* Item 7: Test Instructions */}
              <div 
                onClick={() => setCurrentSection('TEST_INSTRUCTIONS')}
                className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-violet-500 hover:shadow-md cursor-pointer transition-all space-y-3 relative group sm:col-span-2 lg:col-span-3"
              >
                <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-violet-600 group-hover:text-white">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">تعليمات وكتيب اختبارات الجودة المعتمد لمجموعة العربي</h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">تصفح المعايير والتعليمات القياسية لفحص المظهر ودائرة التبريد والدائرة الكهربائية والملحقات المعتمدة رسمياً.</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-violet-600 font-bold pt-2 border-t border-zinc-100">
                  <span>تصفح كتيب الجودة والمعايير المعتمدة</span>
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>

            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: ARCHIVE (Daily Inspections list with supervisor approvals) */}
        {/* ========================================================================= */}
        {currentSection === 'ARCHIVE' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-right">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">أرشيف فحوصات خط الإنتاج ({getLineName(lineId)})</h2>
                  <p className="text-[10px] text-zinc-400">تصفح واعتماد سجلات الفحوصات الفنية لخط التجميع</p>
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
                    <th className="py-3 px-4 text-center">التوقيع والاعتماد الفني للمشرف</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedLineInspections.map((log) => {
                    const modelObj = models.find(m => m.id === log.modelId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-950 tracking-wider">
                          {log.serialNumber}
                        </td>
                        <td className="py-3 px-4 text-zinc-800 font-bold">
                          {modelObj ? modelObj.name : log.modelId}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 font-bold">
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
                        {/* Interactive Supervisor verification actions */}
                        <td className="py-3 px-4 text-center">
                          {renderSupervisorToggles(log.id)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setActiveReport(log)}
                            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-900 rounded-lg transition-colors cursor-pointer"
                            title="عرض وطباعة التقرير بالكامل"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedLineInspections.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-400 font-bold">لا توجد فحوصات مسجلة في الأرشيف لخط الإنتاج هذا.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: CRITICAL OPERATIONS (7 tabs with supervisor verification) */}
        {/* ========================================================================= */}
        {currentSection === 'CRITICAL_OPS' ? (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-600 transition-colors cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-sm font-black text-zinc-900">العمليات الحرجة وفحوصات الجودة بمصنع {getLineName(lineId)}</h2>
                  <p className="text-[10px] text-zinc-400">مراقبة واعتماد كافة قياسات الأجهزة وعزوم ربط الباب والتجميع</p>
                </div>
              </div>
            </div>

            {/* Department / Sections (Tabs) Slider */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {CRITICAL_TABS.map(tab => {
                const isActive = activeCritTab === tab.id;
                const tabLogs = [...(syncedLogs || []), ...(criticalLogs || [])].filter(l => l && l.lineId === lineId && (l.tabId || 'calib') === tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCritTab(tab.id as any)}
                    className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer ${
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

            {/* List Table with Review statuses */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                      <th className="p-3">رقم المفتش فني (Inspector)</th>
                      <th className="p-3">التاريخ والوقت</th>
                      
                      {activeCritTab === 'calib' && (
                        <>
                          <th className="p-3">رقم ماكينة الشحن</th>
                          <th className="p-3">الموديل الفني للثلاجة</th>
                          <th className="p-3 text-center">كمية غاز الشحن المستهدفة (جرام)</th>
                        </>
                      )}

                      {activeCritTab === 'init_ass' && (
                        <>
                          <th className="p-3">كود الموديل</th>
                          <th className="p-3 text-center">تطابق وتجانس الفولتيات والجهود</th>
                          <th className="p-3 text-center">أعطال التجميع الابتدائي إن وجدت</th>
                          <th className="p-3 text-center">النتيجة</th>
                        </>
                      )}

                      {activeCritTab === 'injection' && (
                        <>
                          <th className="p-3 text-center">حرارة فوم الحقن (°C)</th>
                          <th className="p-3 text-center">ضغط مكبس الحقن (bar)</th>
                          <th className="p-3 text-center">كثافة مادة عزل الفوم (kg/m³)</th>
                          <th className="p-3 text-center">النتيجة</th>
                        </>
                      )}

                      {activeCritTab === 'final_torque' && (
                        <>
                          <th className="p-3 text-center">مفصلة الباب العلوية (N.m)</th>
                          <th className="p-3 text-center">مفصلة الباب الوسطى (N.m)</th>
                          <th className="p-3 text-center">مفصلة الباب السفلية (N.m)</th>
                          <th className="p-3 text-center">مدة تفريغ الفاكيوم (ثانية)</th>
                          <th className="p-3 text-center">عمق ماسورة الكابلري (mm)</th>
                          <th className="p-3 text-center">النتيجة</th>
                        </>
                      )}

                      {activeCritTab === 'start_torque' && (
                        <>
                          <th className="p-3 text-center">موضع تجميع شاصيه الضاغط الماتور (N.m)</th>
                          <th className="p-3 text-center">مسامير قاعدة التجميع الحديدية (N.m)</th>
                          <th className="p-3 text-center">النتيجة</th>
                        </>
                      )}

                      {activeCritTab === 'inject_torque' && (
                        <>
                          <th className="p-3 text-center">عزم تجميع الأرجل الأمامية (N.m)</th>
                          <th className="p-3 text-center">عزم تجميع الأرجل الخلفية (N.m)</th>
                          <th className="p-3 text-center">مكابس الحقن وزاوية ربط البوردة (N.m)</th>
                          <th className="p-3 text-center">النتيجة</th>
                        </>
                      )}

                      {activeCritTab === 'perf_test' && (
                        <>
                          <th className="p-3 text-center">حرارة الغرفة الفنية (°C)</th>
                          <th className="p-3 text-center">شدة شد الحزام الكرتوني كرتون الشحن (kg)</th>
                          <th className="p-3 text-center">حالة اختبار الأمان الكهربائي والجهد</th>
                          <th className="p-3 text-center">النتيجة النهائية</th>
                        </>
                      )}

                      <th className="p-3 text-center">التوقيع والاعتماد الفني للمشرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {allCriticalLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-zinc-900">
                          {log.inspectorSap}
                          <span className="text-[9px] bg-zinc-100 text-zinc-500 font-bold px-1 py-0.2 rounded mr-1.5 uppercase tracking-wide">
                            {log.source || 'WEBSITE'}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-600 font-mono">
                          {log.date || safeDateString(log.timestamp)}
                          <span className="text-[9px] text-zinc-400 block font-bold">
                            وردية {log.shift}
                          </span>
                        </td>

                        {/* Tab specific cells */}
                        {activeCritTab === 'calib' && (
                          <>
                            <td className="p-3 font-bold text-zinc-700">{log.machine}</td>
                            <td className="p-3 text-zinc-650 truncate max-w-[150px]">{log.modelName}</td>
                            <td className="p-3 font-mono font-black text-center text-zinc-950">{log.rawCharge || log.gasCharge} جرام</td>
                          </>
                        )}

                        {activeCritTab === 'init_ass' && (
                          <>
                            <td className="p-3 font-bold text-zinc-700">{log.modelCode || 'عام'}</td>
                            <td className="p-3 text-center font-mono text-[10px] text-zinc-650">
                              {`Y:${log.Y ?? '0'} | X:${log.X ?? '0'} | N:${log.N ?? '0'} | M:${log.M ?? '0'} | L:${log.L ?? '0'} | W:${log.W ?? '0'} | P:${log.P ?? '0'} | R:${log.R ?? '0'} | S:${log.S ?? '0'}`}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-wrap justify-center gap-1 max-w-[280px] mx-auto">
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
                                    className={`px-1 py-0.2 rounded text-[8px] font-black ${
                                      item.v === 'NG' ? 'bg-red-100 text-red-750' : 'bg-emerald-50 text-emerald-800'
                                    }`}
                                  >
                                    {item.k}: {item.v || 'OK'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.assemblyStatus || 'PASS')}`}>
                                {log.assemblyStatus || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {activeCritTab === 'injection' && (
                          <>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.manualY || log.tempFoam || '38'} °C</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.manualX || log.pressFoam || '2.3'} bar</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.manualN || log.densityFoam || '38.5'} kg/m³</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.assemblyStatus || 'PASS')}`}>
                                {log.assemblyStatus || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {activeCritTab === 'final_torque' && (
                          <>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.ftHingeTopL1 || '4.5'} | {log.ftHingeTopC1 || '4.5'} | {log.ftHingeTopR1 || '4.5'}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.ftHingeMidL1 || '3.2'} | {log.ftHingeMidR1 || '3.2'}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.ftHingeBotL1 || '4.8'} | {log.ftHingeBotR1 || '4.8'}</td>
                            <td className="p-3 text-center font-mono text-zinc-600">{log.ftVacuumCycleTime || '45'} ثانية</td>
                            <td className="p-3 text-center font-mono text-zinc-650">{log.ftCapillaryDepth || '120'} mm</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.torqueStatus || 'PASS')}`}>
                                {log.torqueStatus || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {activeCritTab === 'start_torque' && (
                          <>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.stCompBaseFrontL1 || '3.8'} | {log.stCompBaseFrontR1 || '3.8'}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.stBaseScrewFrontL1 || '2.9'} | {log.stBaseScrewFrontR1 || '2.9'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.startTorqueStatus || 'PASS')}`}>
                                {log.startTorqueStatus || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {activeCritTab === 'inject_torque' && (
                          <>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.itLegFrontL1 || '4.1'} | {log.itLegFrontR1 || '4.1'}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.itLegBackL2 || '3.9'} | {log.itLegBackR2 || '3.9'}</td>
                            <td className="p-3 text-center font-mono font-bold text-zinc-800">{log.itScrewFPL || '2.8'} N.m</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.injectTorqueStatus || 'PASS')}`}>
                                {log.injectTorqueStatus || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {activeCritTab === 'perf_test' && (
                          <>
                            <td className="p-3 text-center font-mono text-zinc-805">{log.ptTempPerfRoom || '25'} °C</td>
                            <td className="p-3 text-center font-mono text-zinc-805">{log.ptStrapTightL1 || '45'} | {log.ptStrapTightL2 || '45'} kg</td>
                            <td className="p-3 text-center font-bold text-emerald-600">
                              {log.pt_check_electric_insulation === 'OK' ? 'آمنة ومعايرة' : 'فاشلة العزل'}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(log.perfResult || 'PASS')}`}>
                                {log.perfResult || 'PASS'}
                              </span>
                            </td>
                          </>
                        )}

                        {/* Interactive Supervisor review indicators */}
                        <td className="p-3 text-center">
                          {renderSupervisorToggles(log.id)}
                        </td>
                      </tr>
                    ))}
                    {allCriticalLogs.length === 0 && (
                      <tr>
                        <td colSpan={12} className="text-center py-12 text-zinc-400 font-bold">لا توجد سجلات عمليات حرجة تابعة لخط تجميع الثلاجات الحالي.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: TRIAL RUNS */}
        {/* ========================================================================= */}
        {currentSection === 'TRIAL_RUNS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn text-right">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">سجل تجارب تشغيل العينات للخط ({getLineName(lineId)})</h2>
                <p className="text-[10px] text-zinc-400">مراجعة درجات حرارة الكابينة وتيار التشغيل واستقرار الضواغط للعينات العشوائية</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                    <th className="py-3 px-4">رقم تجربة التشغيل</th>
                    <th className="py-3 px-4">رقم السيريال (Serial)</th>
                    <th className="py-3 px-4">الموديل الفني للثلاجة</th>
                    <th className="py-3 px-4 text-center">مدة التجربة بالدقيقة</th>
                    <th className="py-3 px-4 text-center">حرارة كابينة التبريد والماتور (°C)</th>
                    <th className="py-3 px-4 text-center">النتيجة</th>
                    <th className="py-3 px-4">تفاصيل وملاحظات التجربة</th>
                    <th className="py-3 px-4 text-center">التوقيع والاعتماد الفني للمشرف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedTrialRuns.map((tr) => (
                    <tr key={tr.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-500">{tr.id}</td>
                      <td className="py-3 px-4 font-mono font-black text-zinc-900">{tr.serialNumber}</td>
                      <td className="py-3 px-4 font-bold text-zinc-800">{getModelName(tr.modelId)}</td>
                      <td className="py-3 px-4 text-center font-mono text-zinc-700">{tr.duration}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-blue-600">{tr.cabinetTemp} °C</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor(tr.result)}`}>
                          {tr.result === 'PASS' ? 'مطابق وتبريد ناجح' : 'تبريد فاشل'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">{tr.notes}</td>
                      {/* Interactive Supervisor action */}
                      <td className="py-3 px-4 text-center">
                        {renderSupervisorToggles(tr.id)}
                      </td>
                    </tr>
                  ))}
                  {sortedTrialRuns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-400 font-bold">لا توجد عينات قيد تجارب التشغيل مسجلة حالياً بالخط.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: NCR REPORTS */}
        {/* ========================================================================= */}
        {currentSection === 'NCR_REPORTS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn text-right">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">تقارير عدم المطابقة الفنية (Non-Conformance Reports)</h2>
                <p className="text-[10px] text-zinc-400">متابعة التغذية العكسية Feed BACK لتقارير خط {getLineName(lineId)} وتسجيل قرارات واعتمادات الجودة والإنتاج</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sortedNcrs.map((ncr) => (
                <div key={ncr.id} className="bg-zinc-50 border border-zinc-250 rounded-xl p-4 space-y-4 relative overflow-hidden text-xs">
                  <div className={`absolute top-0 right-0 w-full h-1 ${ncr.status === 'OPEN' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-900 text-sm font-mono">#{ncr.id}</span>
                      <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-md font-bold">
                        الوردية: {ncr.shift}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${ncr.severity === 'CRITICAL' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                        {ncr.severity === 'CRITICAL' ? 'خطورة حرجة' : 'خطورة متوسطة'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${ncr.status === 'RESOLVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        {ncr.status === 'RESOLVED' ? 'مغلق ومصحح' : 'مفتوح ونشط'}
                      </span>
                    </div>
                  </div>

                  {/* NCR Basic Info Matrix */}
                  <div className="grid grid-cols-2 gap-3 text-[11px] bg-white border border-zinc-150 p-3 rounded-lg font-medium">
                    <div>
                      <p className="text-zinc-400">موديل الثلاجة:</p>
                      <p className="text-zinc-800 font-bold">{models.find(m => m.id === ncr.modelId)?.name || ncr.modelId}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">باركود الثلاجة:</p>
                      <p className="text-zinc-800 font-bold font-mono">{ncr.barcode}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">التاريخ والوقت:</p>
                      <p className="text-zinc-800 font-bold font-mono">{ncr.date} | {ncr.time}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">مكان الفحص:</p>
                      <p className="text-zinc-800 font-bold">
                        {ncr.defectType === 'PERFORMANCE_TEST' ? 'إختبار اداء' : 
                         ncr.defectType === 'CRITICAL_OP' ? 'عمليات حرجة' : 
                         ncr.defectType === 'CRITICAL_DEFECT' ? 'عينات - عيب حرج' : 
                         ncr.defectType === 'MAJOR_DEFECT' ? 'عينات - عيب رئيسي' : 'عينات - عيب ثانوي'}
                      </p>
                    </div>
                  </div>

                  {/* Defect description & Spec Details */}
                  <div className="space-y-1">
                    <p className="text-zinc-500 font-bold text-[11px]">وصف الخلل الفني المرصود:</p>
                    <p className="text-zinc-800 bg-white border border-zinc-150 p-2.5 rounded-lg text-[11px] font-medium leading-relaxed">{ncr.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-zinc-100/70 p-2 rounded-lg">
                      <span className="text-zinc-400 block">المواصفة الفنية:</span>
                      <span className="text-zinc-700 font-bold">{ncr.specification || 'غير محددة'}</span>
                    </div>
                    <div className="bg-zinc-100/70 p-2 rounded-lg">
                      <span className="text-zinc-400 block">الحيود المرصود فعلياً:</span>
                      <span className="text-zinc-700 font-bold">{ncr.deviation || 'غير محدد'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-zinc-100/70 p-2 rounded-lg">
                      <span className="text-zinc-400 block">السبب الجذري:</span>
                      <span className="text-zinc-700 font-bold">{ncr.rootCause || 'جاري التحقق من الفني'}</span>
                    </div>
                    <div className="bg-zinc-100/70 p-2 rounded-lg">
                      <span className="text-zinc-400 block">الإجراء الفوري المتخذ:</span>
                      <span className="text-zinc-700 font-bold">{ncr.actionRequired}</span>
                    </div>
                  </div>

                  {/* QC & Production Opinions */}
                  {(ncr.qcOpinion || ncr.productionOpinion || ncr.finalDecision) && (
                    <div className="border-t border-dashed border-zinc-200 pt-3 space-y-2 bg-indigo-50/40 p-3 rounded-lg">
                      <h4 className="text-[10px] text-indigo-900 font-extrabold flex items-center justify-between">
                        <span>بيانات التغذية العكسية الحالية (Feed BACK Sheet):</span>
                        {ncr.decisionMaker && <span className="font-mono text-[9px] text-zinc-400">بواسطة: {ncr.decisionMaker}</span>}
                      </h4>
                      {ncr.qcOpinion && (
                        <p className="text-[11px]"><strong className="text-zinc-700">ملاحظات وقرار مراقبة الجودة:</strong> {ncr.qcOpinion}</p>
                      )}
                      {ncr.productionOpinion && (
                        <p className="text-[11px]"><strong className="text-zinc-700">رأي وإجراءات القسم الإنتاجي:</strong> {ncr.productionOpinion}</p>
                      )}
                      {ncr.finalDecision && (
                        <div className="bg-white border border-indigo-100 p-2 rounded text-[11px] font-bold text-zinc-900">
                          <span className="text-indigo-700">القرار النهائي لـ اعتماده: </span>{ncr.finalDecision}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Opinion Editing Form */}
                  {editingNcrId === ncr.id ? (
                    <div className="bg-white border-2 border-indigo-200 rounded-xl p-3 space-y-3 animate-fadeIn">
                      <h4 className="text-[11px] font-black text-indigo-900 border-b border-indigo-100 pb-1.5">تعديل واعتماد التغذية العكسية Feed BACK</h4>
                      
                      <div className="space-y-2.5 text-[11px]">
                        <div>
                          <label className="block text-zinc-550 font-bold mb-1">ملاحظات وقرار مراقبة الجودة (QC Decision)</label>
                          <textarea
                            value={qcOpinionText}
                            onChange={e => setQcOpinionText(e.target.value)}
                            placeholder="اكتب تعليق مراقبة الجودة على المشكلة والإجراء..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-right outline-none h-12"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-550 font-bold mb-1">رأي وإجراءات القسم الإنتاجي (Production Feedback)</label>
                          <textarea
                            value={prodOpinionText}
                            onChange={e => setProdOpinionText(e.target.value)}
                            placeholder="أدخل رأي الإنتاج في السبب الجذري والإجراء المتخذ..."
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-right outline-none h-12"
                          />
                        </div>

                        <div>
                          <label className="block text-zinc-550 font-bold mb-1">القرار النهائي لـ اعتماده (مثل: قبول، فرز، تخريج، تخريد)</label>
                          <input
                            type="text"
                            value={finalDecisionText}
                            onChange={e => setFinalDecisionText(e.target.value)}
                            placeholder="مثال: تم قبول العينة استثنائياً / تخريد الجسم الخارجي"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-2 text-xs text-right outline-none font-bold"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-zinc-550 font-bold mb-1">حالة تقرير الـ NCR</label>
                            <select
                              value={ncrFinalStatus}
                              onChange={e => setNcrFinalStatus(e.target.value as any)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs text-right outline-none font-bold"
                            >
                              <option value="OPEN">مفتوح ونشط (OPEN)</option>
                              <option value="RESOLVED">مغلق ومصحح (RESOLVED)</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveNcrOpinion(ncr.id)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-lg text-[10px] transition-all cursor-pointer text-center"
                            >
                              حفظ الاعتماد
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNcrId(null)}
                              className="bg-zinc-150 hover:bg-zinc-200 text-zinc-650 font-bold py-2 px-2.5 rounded-lg text-[10px] transition-all cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-150">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingNcrId(ncr.id);
                            setQcOpinionText(ncr.qcOpinion || '');
                            setProdOpinionText(ncr.productionOpinion || '');
                            setFinalDecisionText(ncr.finalDecision || '');
                            setNcrFinalStatus(ncr.status);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          تعديل التغذية العكسية Feed BACK
                        </button>
                        <button
                          onClick={() => onPrintNCR(ncr)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          طباعة التقرير
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {renderSupervisorToggles(ncr.id)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {sortedNcrs.length === 0 && (
                <div className="col-span-2 text-center py-12 text-zinc-400 font-bold bg-zinc-50 border border-zinc-150 rounded-xl">خلو تام من أي تقارير عدم مطابقة فنية نشطة بالخط.</div>
              )}
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: LOADING STOPS */}
        {/* ========================================================================= */}
        {currentSection === 'LOADING_STOPS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn text-right">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">قرارات إيقاف وحظر شحن الموديلات المعيبة</h2>
                <p className="text-[10px] text-zinc-400">تتبع حالات حظر الشحن الفني وفك قيود التحميل من المخازن لإنتاج خط {getLineName(lineId)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sortedStops.map((stop) => (
                <div key={stop.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-400 font-bold">حظر رقم: {stop.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stop.status === 'ACTIVE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {stop.status === 'ACTIVE' ? '🚫 حظر شحن نشط' : '✅ تم فك الحظر'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-900">الموديل المحظور: {getModelName(stop.modelId)}</h3>
                    <p className="text-[11px] text-zinc-500 font-bold mt-1.5 leading-relaxed bg-white border border-zinc-150 p-2.5 rounded-lg text-red-650">
                      أسباب الحظر: {stop.reason}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-150 text-[10px] text-zinc-400 font-bold">
                    <span>الجهة المصدرة للقرار: {stop.stoppedBy}</span>
                    <span>التاريخ: {safeDateString(stop.timestamp)}</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    {renderSupervisorToggles(stop.id)}
                  </div>
                </div>
              ))}
              {sortedStops.length === 0 && (
                <div className="col-span-2 text-center py-12 text-zinc-400 font-bold">لا توجد أوامر حظر شحن نشطة تابعة لمخازن هذا الخط حالياً.</div>
              )}
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: PRODUCTION QUANTITIES */}
        {/* ========================================================================= */}
        {currentSection === 'PRODUCTION_QTY' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn text-right">
            <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
              <button 
                onClick={() => setCurrentSection('DASHBOARD')}
                className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-lg text-zinc-650 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-sm font-black text-zinc-900">سجل الكميات والانتاجية الفنية ({getLineName(lineId)})</h2>
                <p className="text-[10px] text-zinc-400">مطابقة أعداد الأجهزة المجمعة فعلياً مع أهداف الوردية الإنتاجية المعتمدة</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                    <th className="py-3 px-4">رقم الوردية</th>
                    <th className="py-3 px-4 text-center">المستهدف المخطط للوردية (وحدة)</th>
                    <th className="py-3 px-4 text-center">الإنتاج الفعلي المحقق (وحدة)</th>
                    <th className="py-3 px-4 text-center">معدل تحقيق الكفاءة</th>
                    <th className="py-3 px-4">تعليقات وملاحظات فنية بالخط</th>
                    <th className="py-3 px-4 text-center">تاريخ النشر</th>
                    <th className="py-3 px-4 text-center">التوقيع والاعتماد الفني للمشرف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedQuantities.map((q) => {
                    const efficiency = q.target > 0 ? Math.round((q.actual / q.target) * 100) : 0;
                    return (
                      <tr key={q.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-500">{q.id}</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-zinc-900">{q.target} ثلاجة</td>
                        <td className="py-3 px-4 text-center font-mono font-black text-blue-600">{q.actual} ثلاجة</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            efficiency >= 100 ? 'bg-emerald-50 border-emerald-200 text-emerald-705' : 'bg-amber-50 border-amber-250 text-amber-705'
                          }`}>
                            {efficiency}% من الهدف
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{q.notes || 'انتظام لوجستيات خط التجميع'}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">{safeDateString(q.timestamp)}</td>
                        {/* Interactive Supervisor action */}
                        <td className="py-3 px-4 text-center">
                          {renderSupervisorToggles(q.id)}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedQuantities.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-400 font-bold">لا توجد بيانات إنتاج مضافة حالياً لخط تجميع الثلاجات الحالي.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ========================================================================= */}
        {/* SUB SECTION: TEST INSTRUCTIONS (Dynamic copy for supervisor audits) */}
        {/* ========================================================================= */}
        {currentSection === 'TEST_INSTRUCTIONS' ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-6 animate-fadeIn text-right">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCurrentSection('DASHBOARD')}
                  className="bg-zinc-100 hover:bg-zinc-200 p-2.5 rounded-xl text-zinc-650 transition-all active:scale-95"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-black text-zinc-900">تعليمات وكتيب اختبارات الجودة المعتمد لمجموعة العربي</h2>
                  <p className="text-[11px] text-zinc-500">المعايير المعتمدة من توشيبا اليابانية وقسم الجودة بمصر لخطوط تجميع الثلاجات</p>
                </div>
              </div>

              {/* Main Division Tabs (Sharp vs Tornado) */}
              <div className="flex bg-zinc-100 p-1 rounded-xl self-end sm:self-center">
                <button
                  onClick={() => { setInstMainTab('SHARP'); setInstSearch(''); }}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    instMainTab === 'SHARP' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Sharp Standard
                </button>
                <button
                  onClick={() => { setInstMainTab('TORNADO'); setInstSearch(''); }}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                    instMainTab === 'TORNADO' 
                      ? 'bg-white text-amber-700 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  Tornado Standard
                </button>
              </div>
            </div>

            {/* Sub Division Tabs & Search Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-50/50 p-4 rounded-xl border border-zinc-200/60">
              {/* Sub Tabs (Performance vs Construction) */}
              <div className="flex gap-2">
                <button
                  onClick={() => setInstSubTab('PERFORMANCE')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    instSubTab === 'PERFORMANCE'
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  الأداء (Performance)
                </button>
                <button
                  onClick={() => setInstSubTab('CONSTRUCTION')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    instSubTab === 'CONSTRUCTION'
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  التجميع والإنشاء (Construction)
                </button>
              </div>

              {/* Search Field */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 right-3 flex items-center pr-2 pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={instSearch}
                  onChange={(e) => setInstSearch(e.target.value)}
                  placeholder="ابحث باسم الاختبار أو الهدف..."
                  className="w-full pr-10 pl-4 py-2 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900 text-right font-medium"
                />
                {instSearch && (
                  <button
                    onClick={() => setInstSearch('')}
                    className="absolute inset-y-0 left-3 flex items-center text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Render Instructions List */}
            {(() => {
              // Retrieve corresponding test list
              let sourceList: TestInstruction[] = [];
              if (instMainTab === 'SHARP') {
                sourceList = instSubTab === 'PERFORMANCE' ? SHARP_PERFORMANCE_TESTS : SHARP_CONSTRUCTION_TESTS;
              } else {
                sourceList = instSubTab === 'PERFORMANCE' ? TORNADO_PERFORMANCE_TESTS : TORNADO_CONSTRUCTION_TESTS;
              }

              // Filter by search keyword
              const keyword = instSearch.trim().toLowerCase();
              const filtered = sourceList.filter(test => {
                if (!keyword) return true;
                return (
                  test.title.toLowerCase().includes(keyword) ||
                  test.objective.toLowerCase().includes(keyword) ||
                  test.id.toString() === keyword ||
                  test.steps.some(s => s.toLowerCase().includes(keyword)) ||
                  test.acceptanceCriteria.some(c => c.toLowerCase().includes(keyword))
                );
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/30">
                    <HelpCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-zinc-700">لا توجد اختبارات تطابق البحث</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">تأكد من كتابة الكلمة بشكل صحيح، أو تنقل بين تبويبات الأقسام</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filtered.map((test) => (
                    <div 
                      key={`${instMainTab}-${instSubTab}-${test.id}`}
                      className={`border rounded-2xl p-4 shadow-sm bg-white transition-all hover:shadow-md space-y-3 flex flex-col justify-between ${
                        instMainTab === 'SHARP' 
                          ? 'border-zinc-200 hover:border-blue-200 border-r-4 border-r-blue-500' 
                          : 'border-zinc-200 hover:border-amber-200 border-r-4 border-r-amber-500'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Title */}
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            instMainTab === 'SHARP' 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            اختبار #{test.id}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-zinc-800 leading-relaxed">
                          {test.title}
                        </h3>

                        {/* Objective */}
                        <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl space-y-1">
                          <h4 className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                            <span>الهدف من الاختبار:</span>
                          </h4>
                          <p className="text-[10.5px] font-medium text-zinc-600 leading-relaxed">
                            {test.objective}
                          </p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-bold text-zinc-400">خطوات التنفيذ والطريقة:</h4>
                          <ul className="space-y-1">
                            {test.steps.map((step, sIdx) => (
                              <li key={sIdx} className="text-[11px] font-medium text-zinc-600 leading-relaxed bg-zinc-50/40 px-2 py-1 rounded-md border border-zinc-100">
                                <span className="font-bold text-zinc-400 ml-1">{sIdx + 1}.</span> {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="pt-2 border-t border-zinc-100 space-y-1 bg-zinc-50/20 p-2 rounded-xl">
                        <h4 className="text-[10px] font-bold text-zinc-400">معايير القبول والرفض:</h4>
                        <ul className="space-y-1">
                          {test.acceptanceCriteria.map((crit, cIdx) => (
                            <li key={cIdx} className="text-[10.5px] font-semibold text-zinc-700 leading-relaxed flex items-start gap-1">
                              <span className="text-zinc-400">•</span>
                              <span>{crit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : null}

      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-400 text-[10px] font-bold no-print">
        <p>© شركة العربي للصناعات الهندسية • نظام توكيد جودة الثلاجات المتنقل</p>
        <p className="mt-1 font-medium">يتم مراجعة واعتماد كافة الفحوصات والعمليات الحرجة فوراً من قبل مشرف الجودة.</p>
      </footer>

      {/* Active detailed Report Modal */}
      {activeReport && (
        <OfficialReportModal
          activeReport={activeReport}
          inspections={inspections}
          models={models}
          getLineName={getLineName}
          setActiveReport={setActiveReport}
          handleDownloadExcel={handleDownloadExcel}
        />
      )}
    </div>
  );
}

// Extra local trending up icon for completeness
function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
