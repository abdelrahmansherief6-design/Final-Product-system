/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog, ManagedUser, UserRole, RefrigeratorModel, NCRReport } from '../types';
import { PRODUCTION_LINES } from '../data';
import { 
  BarChart3, LogOut, TrendingUp, Printer, FileSpreadsheet, Download, HelpCircle, 
  CheckCircle, ShieldAlert, Award, Users, UserPlus, Trash2, Lock, Shield, UserCheck, PlusCircle, Package,
  BookOpen, Search, ArrowRight, Settings
} from 'lucide-react';
import { 
  SHARP_PERFORMANCE_TESTS, 
  SHARP_CONSTRUCTION_TESTS, 
  TORNADO_PERFORMANCE_TESTS, 
  TORNADO_CONSTRUCTION_TESTS,
  TestInstruction 
} from '../testInstructionsData';

interface ManagerWorkspaceProps {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  processAudits: ProcessAuditLog[];
  users: ManagedUser[];
  onUpdateUsers: (users: ManagedUser[]) => void;
  models: RefrigeratorModel[];
  onUpdateModels: React.Dispatch<React.SetStateAction<RefrigeratorModel[]>>;
  ncrs: NCRReport[];
  onUpdateNcrs: React.Dispatch<React.SetStateAction<NCRReport[]>>;
  onPrintNCR: (ncr: NCRReport) => void;
}

export default function ManagerWorkspace({
  user,
  onLogout,
  inspections,
  processAudits,
  users,
  onUpdateUsers,
  models,
  onUpdateModels,
  ncrs,
  onUpdateNcrs: setNcrs,
  onPrintNCR,
}: ManagerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'INVENTORY_REPORTS' | 'USER_DIRECTORY' | 'TEST_INSTRUCTIONS' | 'NCR_REPORTS'>('ANALYTICS');
  const [invSubTab, setInvSubTab] = useState<'INSPECTION' | 'OPERATIONS'>('INSPECTION');
  const [factoryTabs, setFactoryTabs] = useState<Record<string, 'INSPECTION' | 'OPERATIONS'>>({
    'LINE_A': 'INSPECTION',
    'LINE_B': 'INSPECTION',
    'LINE_C': 'INSPECTION',
  });
  const [selectedLineId, setSelectedLineId] = useState<string>('LINE_A');

  // Load complementary data from localStorage
  const [criticalLogs] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_critical_logs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [syncedLogs] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_synced_critical_logs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [trialRuns] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_trial_runs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Helper to check if a date is within current month strictly
  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  // State variables for test instructions
  const [instMainTab, setInstMainTab] = useState<'SHARP' | 'TORNADO'>('SHARP');
  const [instSubTab, setInstSubTab] = useState<'PERFORMANCE' | 'CONSTRUCTION'>('PERFORMANCE');
  const [instSearch, setInstSearch] = useState('');

  // State variables for NCR reports filtering
  const [ncrLineFilter, setNcrLineFilter] = useState<'ALL' | 'LINE_A' | 'LINE_B' | 'LINE_C'>('ALL');
  const [ncrStatusFilter, setNcrStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [ncrSeverityFilter, setNcrSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'MAJOR'>('ALL');
  const [ncrSearch, setNcrSearch] = useState('');

  // KPI calculations
  const totalInspected = inspections.length;
  
  // First Pass Yield (FPY) = (Total Pass initially without repairs / Total Inspected) * 100
  const passInitially = inspections.filter(log => log.status === 'PASS').length;
  const fpyGeneral = totalInspected > 0 ? Math.round((passInitially / totalInspected) * 100) : 100;

  // Currently Passed (including approved after repairs)
  const currentlyPassed = inspections.filter(
    log => log.status === 'PASS' || log.recheckStatus === 'APPROVED_AFTER_REPAIR'
  ).length;

  // Pending repairs count
  const currentlyPending = inspections.filter(
    log => log.status === 'FAIL' && log.recheckStatus === 'PENDING'
  ).length;

  // Scrapped products count
  const currentlyScrapped = inspections.filter(
    log => log.status === 'FAIL' && log.recheckStatus === 'SCRAPPED'
  ).length;

  // Calculate pareto defect statistics
  const defectCounts: Record<string, { label: string; count: number }> = {};
  
  inspections.forEach(log => {
    if (log.defects && log.defects.length > 0) {
      log.defects.forEach(def => {
        const optionId = def.defectOptionId;
        const exists = defectCounts[optionId];
        if (exists) {
          exists.count += 1;
        } else {
          // Find standard option label
          const label = models.find(m => m.id === optionId)?.name || optionId;
          defectCounts[optionId] = {
            label: optionId, // default label gets updated by searching DEFECT_OPTIONS or using option ID
            count: 1
          };
        }
      });
    }
  });

  // Flat array of defects
  const paretoDataRaw = Object.entries(defectCounts).map(([key, raw]) => {
    // Find readable text if any
    const matchLabel = [
      { id: 'DEF_WELD', label: 'عدم إحكام غلق اللحام لمجموعة البايبس' },
      { id: 'DEF_FOAM', label: 'تسريب فوم العزل بجدار البودي' },
      { id: 'DEF_SCR', label: 'خدوش الهيكل الصاج والأبواب الخارجية' },
      { id: 'DEF_ELEC', label: 'فشل تيار التسريب الأرضي والأمان' },
      { id: 'DEF_GAS', label: 'تجاوز ضغوط تعبئة غاز الفريون' },
      { id: 'DEF_VAC', label: 'ضعف تفريغ الهواء برطوبة الأنابيب' },
    ].find(opt => opt.id === key)?.label || key;

    return {
      id: key,
      label: matchLabel,
      count: raw.count,
    };
  }).sort((a, b) => b.count - a.count);

  const totalDefectsCount = paretoDataRaw.reduce((sum, d) => sum + d.count, 0);
  
  // Mapping cumulative percentage
  let runningSum = 0;
  const paretoData = paretoDataRaw.map(d => {
    runningSum += d.count;
    return {
      ...d,
      cumPercent: totalDefectsCount > 0 ? Math.round((runningSum / totalDefectsCount) * 100) : 0
    };
  });

  // Calculate statistics per production line
  const lineStats = PRODUCTION_LINES.map(line => {
    const lineInspections = inspections.filter(log => log.lineId === line.id);
    const lineTotal = lineInspections.length;
    
    // Initial passed
    const linePassInitially = lineInspections.filter(log => log.status === 'PASS').length;
    const lineFpy = lineTotal > 0 ? Math.round((linePassInitially / lineTotal) * 100) : 100;
    
    // Current fail
    const lineCurrentFail = lineInspections.filter(log => log.status === 'FAIL' && log.recheckStatus === 'PENDING').length;
    const lineScrap = lineInspections.filter(log => log.status === 'FAIL' && log.recheckStatus === 'SCRAPPED').length;

    return {
      ...line,
      total: lineTotal,
      fpy: lineFpy,
      currentFail: lineCurrentFail,
      scrap: lineScrap
    };
  });

  // Download reports
  const handleDownloadInventoryCSV = () => {
    const headers = ['Serial Number', 'Model Name', 'Production Line', 'Inspector SAP', 'Inspection Date/Time', 'Initial Status', 'Current Action Status'];
    const rows = inspections
      .filter(log => isCurrentMonth(log.timestamp))
      .map(log => {
        const model = models.find(m => m.id === log.modelId)?.name || log.modelId;
        const line = PRODUCTION_LINES.find(l => l.id === log.lineId)?.name || log.lineId;
        return [
          log.serialNumber,
          `"${model.replace(/"/g, '""')}"`,
          `"${line}"`,
          log.inspectorSap,
          log.timestamp,
          log.status,
          log.recheckStatus || 'APPROVED_PASS'
        ];
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `elaraby_fridge_qa_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProcessCSV = () => {
    const headers = ['Audit ID', 'Line Name', 'Auditor Name', 'Welding Temperature (C)', 'Foaming Density (kg/m3)', 'Gas Pressure (bar)', 'Vacuum Level (mbar)', 'Date/Time', 'Status'];
    const rows = processAudits
      .filter(aud => isCurrentMonth(aud.timestamp))
      .map(aud => {
        const line = PRODUCTION_LINES.find(l => l.id === aud.lineId)?.name || aud.lineId;
        const hasFail = !aud.weldingOK || !aud.foamingOK || !aud.gasChargingOK || !aud.vacuumOK || !aud.safetyGroundLeakageOK;
        return [
          aud.id,
          `"${line}"`,
          `"${aud.auditorName}"`,
          aud.weldingStationTemp,
          aud.foamingDensity,
          aud.gasChargingPressure,
          aud.vacuumLevel,
          aud.timestamp,
          hasFail ? 'NON_COMPLIANT' : 'COMPLIANT'
        ];
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `elaraby_process_control_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadInventoryCSVForLine = (lineId: string, lineName: string) => {
    const headers = ['Serial Number', 'Model Name', 'Production Line', 'Inspector SAP', 'Inspection Date/Time', 'Initial Status', 'Current Action Status'];
    const rows = inspections
      .filter(log => log.lineId === lineId && isCurrentMonth(log.timestamp))
      .map(log => {
        const model = models.find(m => m.id === log.modelId)?.name || log.modelId;
        const line = PRODUCTION_LINES.find(l => l.id === log.lineId)?.name || log.lineId;
        return [
          log.serialNumber,
          `"${model.replace(/"/g, '""')}"`,
          `"${line}"`,
          log.inspectorSap,
          log.timestamp,
          log.status,
          log.recheckStatus || 'APPROVED_PASS'
        ];
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `elaraby_${lineId}_qa_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadProcessCSVForLine = (lineId: string, lineName: string) => {
    const headers = ['Audit ID', 'Line Name', 'Auditor Name', 'Welding Temperature (C)', 'Foaming Density (kg/m3)', 'Gas Pressure (bar)', 'Vacuum Level (mbar)', 'Date/Time', 'Status'];
    const rows = processAudits
      .filter(aud => aud.lineId === lineId && isCurrentMonth(aud.timestamp))
      .map(aud => {
        const line = PRODUCTION_LINES.find(l => l.id === aud.lineId)?.name || aud.lineId;
        const hasFail = !aud.weldingOK || !aud.foamingOK || !aud.gasChargingOK || !aud.vacuumOK || !aud.safetyGroundLeakageOK;
        return [
          aud.id,
          `"${line}"`,
          `"${aud.auditorName}"`,
          aud.weldingStationTemp,
          aud.foamingDensity,
          aud.gasChargingPressure,
          aud.vacuumLevel,
          aud.timestamp,
          hasFail ? 'NON_COMPLIANT' : 'COMPLIANT'
        ];
      });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `elaraby_${lineId}_process_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-zinc-800 flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-zinc-900">لوحة مهندسي ومدراء الجودة والمتابعة</h1>
                <span className="font-mono bg-amber-50 text-amber-700 border border-amber-250 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                  التحليلات والمشاهدة الشاملة
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">إدارة الإحصائيات الفعالة (BI)، تحليل العيوب ونتائج فحص العمليات لمجموعات التبريد</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-left">
              <span className="text-[10px] text-zinc-400 font-bold block">مستشار جودة المصنع</span>
              <span className="text-xs text-amber-600 font-bold font-sans">{user.name}</span>
            </div>
            <button
              onClick={onLogout}
              className="bg-zinc-50 hover:bg-neutral-100 text-zinc-650 hover:text-red-650 border border-zinc-200 hover:border-red-200 p-2.5 rounded-xl transition-all"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-6">

        {/* Factory Production Quality Summary Grid */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div>
              <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                خلاصة مؤشرات ومعدلات جودة الإنتاج الشهرية للمصانع
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                تقرير شامل ومحدث يبين جودة تصنيع الثلاجات ومعدلات الـ PPM والأداء الفني لكل مصنع على حدة خلال الشهر الحالي
              </p>
            </div>
            <div className="bg-zinc-50 border border-zinc-150 px-3 py-1.5 rounded-xl text-[11px] font-bold text-zinc-500 text-center">
              الشهر الحالي: <span className="text-zinc-855 font-mono">{new Date().toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRODUCTION_LINES.map((line) => {
              // Calculate statistics
              const lineInspections = inspections.filter(log => log.lineId === line.id && isCurrentMonth(log.timestamp));
              const lineNcrs = ncrs.filter(ncr => ncr.lineId === line.id && isCurrentMonth(ncr.timestamp));
              const lineTrialRuns = trialRuns.filter(tr => tr.lineId === line.id && isCurrentMonth(tr.timestamp));
              const lineCritical = [...criticalLogs, ...syncedLogs].filter(cl => cl.lineId === line.id && isCurrentMonth(cl.timestamp));

              const inspectionsCount = lineInspections.length;
              const ncrsCount = lineNcrs.length;
              const trialRunsCount = lineTrialRuns.length;
              const criticalCount = lineCritical.length;

              // PPM Formula: (NCR reports / inspected samples) * 1,000,000
              const ppm = inspectionsCount > 0 ? Math.round((ncrsCount / inspectionsCount) * 1000000) : 0;

              // Color configuration based on PPM level
              let ppmColorClass = 'text-emerald-600 bg-emerald-50 border-emerald-200';
              let ppmStatusText = 'ممتاز ومطابق للمواصفة';
              if (ppm > 25000) {
                ppmColorClass = 'text-red-650 bg-red-50 border-red-200';
                ppmStatusText = 'حرج - يتطلب معالجة فورية';
              } else if (ppm > 0) {
                ppmColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
                ppmStatusText = 'مقبول - قيد المتابعة';
              }

              // Color theme accent per line
              const lineAccentColor = 
                line.id === 'LINE_A' ? 'border-t-blue-500 bg-gradient-to-b from-blue-50/20 to-transparent' :
                line.id === 'LINE_B' ? 'border-t-teal-500 bg-gradient-to-b from-teal-50/20 to-transparent' :
                'border-t-purple-500 bg-gradient-to-b from-purple-50/20 to-transparent';

              const badgeColor =
                line.id === 'LINE_A' ? 'bg-blue-100 text-blue-800' :
                line.id === 'LINE_B' ? 'bg-teal-100 text-teal-800' :
                'bg-purple-100 text-purple-800';

              return (
                <div 
                  key={line.id} 
                  className={`bg-white border-t-4 ${lineAccentColor} border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4`}
                >
                  {/* Factory Header */}
                  <div className="flex items-start justify-between">
                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${badgeColor}`}>
                        {line.id}
                      </span>
                      <h3 className="text-sm font-black text-zinc-900 mt-1.5">{line.name}</h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">المشرف: <strong className="text-zinc-700">{line.supervisorName}</strong></p>
                    </div>
                    
                    {/* PPM Badge */}
                    <div className={`text-center p-2 border rounded-xl ${ppmColorClass}`}>
                      <span className="text-[8px] font-bold block uppercase tracking-wider">معدل العيوب (PPM)</span>
                      <span className="text-base font-extrabold font-mono block leading-none mt-0.5">{ppm.toLocaleString('en-US')}</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-zinc-100 my-2"></div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-right">
                    {/* Inspected Samples */}
                    <div className="bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100/60 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold block">العينات المفحوصة</span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm font-extrabold font-mono text-zinc-800">{inspectionsCount}</span>
                        <span className="text-[9px] text-zinc-400">عينة</span>
                      </div>
                    </div>

                    {/* NCR Reports */}
                    <div className="bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100/60 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold block">تقارير عدم المطابقة</span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className={`text-sm font-extrabold font-mono ${ncrsCount > 0 ? 'text-red-650' : 'text-zinc-600'}`}>{ncrsCount}</span>
                        <span className="text-[9px] text-zinc-400">تقرير NCR</span>
                      </div>
                    </div>

                    {/* Trial Runs */}
                    <div className="bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100/60 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold block">تجارب التشغيل</span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm font-extrabold font-mono text-zinc-800">{trialRunsCount}</span>
                        <span className="text-[9px] text-zinc-400 font-medium">تجربة</span>
                      </div>
                    </div>

                    {/* Critical Operations Reports */}
                    <div className="bg-zinc-50/70 p-2.5 rounded-xl border border-zinc-100/60 space-y-1">
                      <span className="text-[9px] text-zinc-400 font-bold block">تقارير العمليات الحرجة</span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-sm font-extrabold font-mono text-zinc-800">{criticalCount}</span>
                        <span className="text-[9px] text-zinc-400">تقرير حرج</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Bar */}
                  <div className="pt-2 border-t border-zinc-100">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-450 font-medium">حالة الجودة العامة:</span>
                      <span className={`font-bold ${ppm > 25000 ? 'text-red-600' : ppm > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {ppmStatusText}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formula Reference */}
          <div className="bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-[10.5px] text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span>معادلة حساب الـ PPM المعتمدة:</span>
              <code className="bg-white px-2 py-0.5 rounded border border-zinc-150 font-mono text-zinc-700 font-bold">
                PPM = (عدد تقارير عدم المطابقة / عدد العينات المفحوصة) × 1,000,000
              </code>
            </div>
            <p className="text-[10px] text-zinc-400 italic font-medium">
              * يتم الحساب ديناميكياً بناءً على كشوف الجودة الجارية بالمصانع الثلاثة
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'ANALYTICS'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>لوحة التحليلات ومراحل جودة المنتجات والعمليات</span>
          </button>
          
          <button
            onClick={() => setActiveTab('INVENTORY_REPORTS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'INVENTORY_REPORTS'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>سجل الفحوصات</span>
          </button>

          <button
            onClick={() => setActiveTab('USER_DIRECTORY')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'USER_DIRECTORY'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>بيانات المستخدمين ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TEST_INSTRUCTIONS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'TEST_INSTRUCTIONS'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>تعليمات الاختبارات</span>
          </button>

          <button
            onClick={() => setActiveTab('NCR_REPORTS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'NCR_REPORTS'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <span>تقارير عدم المطابقة (NCR) ({ncrs.length})</span>
          </button>
        </div>

        {/* Workspace Tab Contents */}
        {activeTab === 'ANALYTICS' && (
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm text-center max-w-lg mx-auto my-12 space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-zinc-50 border border-zinc-150 flex items-center justify-center text-zinc-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-zinc-900">قسم لوحة التحليلات ملغى</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              تم إفراغ قسم لوحة التحليلات بالكامل بناءً على توجيهاتكم. يمكنك تصفح سجل الفحوصات الجارية ومؤشرات الجودة لكل مصنع من علامات التبويب الأخرى المخصصة.
            </p>
          </div>
        )}

        {activeTab === 'INVENTORY_REPORTS' && (
          <div className="space-y-6 animate-fadeIn text-right">
            {/* Factory Selector Tabs */}
            <div className="flex flex-wrap bg-zinc-100 p-1 rounded-2xl w-fit gap-1 mx-auto border border-zinc-200">
              {PRODUCTION_LINES.map((line) => {
                const isSelected = selectedLineId === line.id;
                return (
                  <button
                    key={line.id}
                    onClick={() => setSelectedLineId(line.id)}
                    className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-zinc-650 hover:text-zinc-900 hover:bg-white/50'
                    }`}
                  >
                    {line.name}
                  </button>
                );
              })}
            </div>

            {(() => {
              const line = PRODUCTION_LINES.find(l => l.id === selectedLineId) || PRODUCTION_LINES[0];
              const currentSubTab = factoryTabs[line.id] || 'INSPECTION';
              const lineInspections = inspections.filter(log => log.lineId === line.id && isCurrentMonth(log.timestamp));
              const lineAudits = processAudits.filter(aud => aud.lineId === line.id && isCurrentMonth(aud.timestamp));

              return (
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm space-y-6">
                  {/* Section Title and Info */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 pb-4">
                    <div>
                      <h2 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        {line.name}
                      </h2>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        المشرف المسؤول: <strong className="text-zinc-700">{line.supervisorName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sub-tab Selectors within the Factory */}
                      <div className="flex bg-zinc-100 p-1 rounded-xl">
                        <button
                          onClick={() => setFactoryTabs(prev => ({ ...prev, [line.id]: 'INSPECTION' }))}
                          className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                            currentSubTab === 'INSPECTION'
                              ? 'bg-white text-amber-700 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          تقارير فحص العينات ({lineInspections.length})
                        </button>
                        <button
                          onClick={() => setFactoryTabs(prev => ({ ...prev, [line.id]: 'OPERATIONS' }))}
                          className={`px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                            currentSubTab === 'OPERATIONS'
                              ? 'bg-white text-amber-700 shadow-sm'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                        >
                          تقارير العمليات ({lineAudits.length})
                        </button>
                      </div>

                      {/* Download Specific Factory CSV */}
                      {currentSubTab === 'INSPECTION' ? (
                        <button
                          onClick={() => handleDownloadInventoryCSVForLine(line.id, line.name)}
                          disabled={lineInspections.length === 0}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                          title="تحميل كشف اكسل للفحص"
                        >
                          <Download className="w-3 h-3" />
                          <span>تصدير الفحص</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadProcessCSVForLine(line.id, line.name)}
                          disabled={lineAudits.length === 0}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                          title="تحميل كشف اكسل للعمليات"
                        >
                          <Download className="w-3 h-3" />
                          <span>تصدير العمليات</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table area based on current sub tab */}
                  {currentSubTab === 'INSPECTION' ? (
                    <div>
                      {lineInspections.length === 0 ? (
                        <div className="text-center py-10 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-zinc-450 text-xs">
                          لا توجد تقارير فحص عينات مسجلة لهذا المصنع حتى الآن.
                        </div>
                      ) : (
                        <div className="overflow-x-auto text-[11px] rounded-2xl border border-zinc-200">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-200 text-zinc-650 uppercase text-[10px] font-bold bg-zinc-50">
                                <th className="py-2.5 px-4">رقم السيريال (Serial)</th>
                                <th className="py-2.5 px-4">الموديل الفني</th>
                                <th className="py-2.5 px-4">الفاحص (الـ SAP)</th>
                                <th className="py-2.5 px-4">التاريخ والوقت</th>
                                <th className="py-2.5 px-4 text-center">القرار المبدئي للثلاجة</th>
                                <th className="py-2.5 px-4 text-center">حالة معالجة العيوب لخط الإنتاج</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-zinc-700">
                              {lineInspections.map((log) => {
                                const modelObj = models.find(m => m.id === log.modelId);
                                return (
                                  <tr key={log.id} className="hover:bg-zinc-50/55 transition-colors">
                                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-900 tracking-wider">
                                      {log.serialNumber}
                                    </td>
                                    <td className="py-2.5 px-4 font-sans text-zinc-800">
                                      {modelObj ? modelObj.name : log.modelId}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono text-[10px] text-zinc-400">
                                      {log.inspectorName.split(' ')[0]} ({log.inspectorSap})
                                    </td>
                                    <td className="py-2.5 px-4 text-zinc-500">
                                      {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        log.status === 'PASS' 
                                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                                          : 'bg-red-50 border-red-200 text-red-700'
                                      }`}>
                                        {log.status === 'PASS' ? 'مطابق وممتاز' : 'به عيوب تصنيع'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      {log.status === 'PASS' ? (
                                        <span className="text-zinc-300 text-[10px]">-</span>
                                      ) : log.recheckStatus === 'APPROVED_AFTER_REPAIR' ? (
                                        <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                          أصلح واعتمد بنجاح
                                        </span>
                                      ) : log.recheckStatus === 'SCRAPPED' ? (
                                        <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                          تم تخريد الهيكل
                                        </span>
                                      ) : (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                                          قيد المعالجة الميكانيكية
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {lineAudits.length === 0 ? (
                        <div className="text-center py-10 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-zinc-450 text-xs">
                          لا توجد تقارير تدقيق عمليات مسجلة لهذا المصنع حتى الآن.
                        </div>
                      ) : (
                        <div className="overflow-x-auto text-[11px] rounded-2xl border border-zinc-200">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-200 text-zinc-650 uppercase text-[10px] font-bold bg-zinc-50">
                                <th className="py-2.5 px-4">رقم التدقيق</th>
                                <th className="py-2.5 px-4">المشرف المسؤول</th>
                                <th className="py-2.5 px-4">محطة اللحام للنحاس</th>
                                <th className="py-2.5 px-4">كثافة الفوم العازل</th>
                                <th className="py-2.5 px-4">ضغط تعبئة الغاز المبرد</th>
                                <th className="py-2.5 px-4">تفريغ الأنابيب (Vacuum)</th>
                                <th className="py-2.5 px-4 text-center">معايرة التسريب الكهربي</th>
                                <th className="py-2.5 px-4">التاريخ والوقت الموثق</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-zinc-700">
                              {lineAudits.map((item) => {
                                return (
                                  <tr key={item.id} className="hover:bg-zinc-50/55 transition-colors">
                                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-450">
                                      {item.id}
                                    </td>
                                    <td className="py-2.5 px-4 text-zinc-550">
                                      {item.auditorName}
                                    </td>
                                    <td className="py-2.5 px-4 font-mono font-bold">
                                      <span className={item.weldingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                        {item.weldingStationTemp} °C {item.weldingOK ? '✓' : '✗'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 font-mono font-bold">
                                      <span className={item.foamingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                        {item.foamingDensity} kg/m³ {item.foamingOK ? '✓' : '✗'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 font-mono font-bold">
                                      <span className={item.gasChargingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                        {item.gasChargingPressure} bar {item.gasChargingOK ? '✓' : '✗'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 font-mono font-bold">
                                      <span className={item.vacuumOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                        {item.vacuumLevel} mbar {item.vacuumOK ? '✓' : '✗'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${item.safetyGroundLeakageOK ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        {item.safetyGroundLeakageOK ? 'مطابق' : 'فاشل المعايرة'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-zinc-400">
                                      {new Date(item.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* User Directory Tab Panel */}
        {activeTab === 'USER_DIRECTORY' && (
          <div className="space-y-12 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Add User Form */}
              <div className="lg:col-span-1">
                <AddUserForm users={users} onAddUser={(newUser) => onUpdateUsers([...users, newUser])} />
              </div>

              {/* Right Column: Users List & Management */}
              <div className="lg:col-span-2">
                <UsersList users={users} onDeleteUser={(sap) => onUpdateUsers(users.filter(u => u.sapNumber !== sap))} />
              </div>

            </div>

            {/* Separator / Header for Models Management */}
            <div className="border-t border-zinc-200 pt-8">
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-zinc-950">إضافة الموديلات على حسب المصنع</h2>
                  <p className="text-xs text-zinc-400">إدارة كتالوج موديلات الثلاجات التي تظهر للفنيين والمشرفين في كل مصنع لتسجيل الفحوصات والتدقيق عليها</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Add Model Form */}
                <div className="lg:col-span-1">
                  <AddModelForm models={models} onAddModel={(newModel) => onUpdateModels([...models, newModel])} />
                </div>

                {/* Right Column: Models List & Management */}
                <div className="lg:col-span-2">
                  <ModelsList models={models} onDeleteModel={(modelId) => onUpdateModels(models.filter(m => m.id !== modelId))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Instructions Tab Panel */}
        {activeTab === 'TEST_INSTRUCTIONS' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-6 animate-fadeIn text-right mt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">تعليمات وكتيب اختبارات الجودة المعتمد لمجموعة العربي</h2>
                  <p className="text-[11px] text-zinc-500">كتيب المعايير والتعليمات التفصيلية لفحص المنتجات النهائية ومراحل الإنتاج</p>
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
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-55'
                  }`}
                >
                  الأداء (Performance)
                </button>
                <button
                  onClick={() => setInstSubTab('CONSTRUCTION')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                    instSubTab === 'CONSTRUCTION'
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-sm'
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-55'
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-right">
                  {filtered.map((test) => (
                    <div 
                      key={`${instMainTab}-${instSubTab}-${test.id}`}
                      className={`border rounded-2xl p-4 shadow-sm bg-white transition-all hover:shadow-md space-y-3 flex flex-col justify-between ${
                        instMainTab === 'SHARP' 
                          ? 'border-zinc-200 hover:border-blue-200 border-r-4 border-r-blue-500' 
                          : 'border-zinc-200 hover:border-amber-200 border-r-4 border-r-amber-500'
                      }`}
                    >
                      <div className="space-y-2 text-right">
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
                        <h3 className="text-xs font-black text-zinc-800 leading-relaxed text-right">
                          {test.title}
                        </h3>

                        {/* Objective */}
                        <div className="bg-zinc-50 border border-zinc-100 p-2.5 rounded-xl space-y-1 text-right">
                          <h4 className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 justify-end">
                            <span>الهدف من الاختبار</span>
                          </h4>
                          <p className="text-[10.5px] font-medium text-zinc-600 leading-relaxed text-right">
                            {test.objective}
                          </p>
                        </div>

                        {/* Steps */}
                        <div className="space-y-1 text-right">
                          <h4 className="text-[10px] font-bold text-zinc-400 text-right">خطوات التنفيذ والطريقة</h4>
                          <ul className="space-y-1 text-right">
                            {test.steps.map((step, sIdx) => (
                              <li key={sIdx} className="text-[11px] font-medium text-zinc-600 leading-relaxed bg-zinc-50/40 px-2 py-1 rounded-md border border-zinc-100 text-right">
                                <span className="font-bold text-zinc-400 ml-1">{sIdx + 1}.</span> {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Acceptance Criteria */}
                      <div className="pt-2 border-t border-zinc-100 space-y-1 bg-zinc-50/20 p-2 rounded-xl text-right">
                        <h4 className="text-[10px] font-bold text-zinc-400 text-right">معايير القبول والرفض</h4>
                        <ul className="space-y-1 text-right">
                          {test.acceptanceCriteria.map((crit, cIdx) => (
                            <li key={cIdx} className="text-[10.5px] font-semibold text-zinc-700 leading-relaxed flex items-start gap-1 justify-end">
                              <span>{crit}</span>
                              <span className="text-zinc-400">•</span>
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
        )}

        {activeTab === 'NCR_REPORTS' && (
          <div className="space-y-6 animate-fadeIn text-right mt-6">
            {/* Header */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-zinc-900">إدارة ومتابعة تقارير عدم المطابقة (NCR)</h2>
                <p className="text-[11px] text-zinc-500 font-bold">لوحة تحكم المدير لمراجعة تقارير عدم المطابقة ومتابعة قرارات التغذية العكسية المعتمدة لخطوط إنتاج العربي</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-zinc-400 font-bold block">إجمالي التقارير المسجلة</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold font-mono text-zinc-900">{ncrs.length}</span>
                  <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-bold">تقرير</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-zinc-400 font-bold block">التقارير المفتوحة (نشط)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold font-mono text-red-650">{ncrs.filter(n => n.status === 'OPEN').length}</span>
                  <span className="text-[10px] bg-red-50 text-red-655 px-2 py-0.5 rounded-full font-bold">جاري العمل</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-zinc-400 font-bold block">التقارير المغلقة (تم الحل)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold font-mono text-emerald-650">{ncrs.filter(n => n.status === 'RESOLVED').length}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-655 px-2 py-0.5 rounded-full font-bold">مغلق</span>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-zinc-400 font-bold block">تقارير شديدة الخطورة (Critical)</span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl font-extrabold font-mono text-amber-655">{ncrs.filter(n => n.severity === 'CRITICAL').length}</span>
                  <span className="text-[10px] bg-amber-50 text-amber-655 px-2 py-0.5 rounded-full font-bold">حرج</span>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-bold text-zinc-450 mb-1.5">البحث بالباركود أو الوصف</label>
                  <input
                    type="text"
                    value={ncrSearch}
                    onChange={e => setNcrSearch(e.target.value)}
                    placeholder="ابحث بالباركود، رقم التقرير..."
                    className="w-full bg-zinc-50 border border-zinc-250 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-xs outline-none transition-all text-right"
                  />
                </div>

                {/* Line Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-450 mb-1.5">تصفية حسب المصنع</label>
                  <select
                    value={ncrLineFilter}
                    onChange={e => setNcrLineFilter(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-250 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-xs outline-none transition-all text-right"
                  >
                    <option value="ALL">كل المصانع</option>
                    <option value="LINE_A">مصنع A</option>
                    <option value="LINE_B">مصنع B</option>
                    <option value="LINE_C">مصنع C</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-450 mb-1.5">حالة التقرير</label>
                  <select
                    value={ncrStatusFilter}
                    onChange={e => setNcrStatusFilter(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-250 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-xs outline-none transition-all text-right"
                  >
                    <option value="ALL">كل الحالات</option>
                    <option value="OPEN">مفتوح (جاري المراجعة)</option>
                    <option value="RESOLVED">مغلق (تم اعتماد القرار)</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-450 mb-1.5">درجة الخطورة</label>
                  <select
                    value={ncrSeverityFilter}
                    onChange={e => setNcrSeverityFilter(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-250 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-xs outline-none transition-all text-right"
                  >
                    <option value="ALL">كل الدرجات</option>
                    <option value="CRITICAL">حرج (Critical)</option>
                    <option value="MAJOR">رئيسي (Major)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Reports Cards */}
            <div className="space-y-4">
              {(() => {
                const filteredNcrs = ncrs.filter(n => {
                  const matchesLine = ncrLineFilter === 'ALL' || n.lineId === ncrLineFilter;
                  const matchesStatus = ncrStatusFilter === 'ALL' || n.status === ncrStatusFilter;
                  const matchesSeverity = ncrSeverityFilter === 'ALL' || n.severity === ncrSeverityFilter;
                  const matchesSearch = !ncrSearch.trim() || 
                    n.barcode.includes(ncrSearch) || 
                    n.id.toLowerCase().includes(ncrSearch.toLowerCase()) ||
                    n.description.includes(ncrSearch) ||
                    (n.specification && n.specification.includes(ncrSearch));
                  return matchesLine && matchesStatus && matchesSeverity && matchesSearch;
                });

                if (filteredNcrs.length === 0) {
                  return (
                    <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-450 space-y-2">
                      <ShieldAlert className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p className="font-bold text-sm">لا توجد تقارير عدم مطابقة (NCR) تطابق معايير البحث والفرز.</p>
                      <p className="text-xs">يرجى تعديل خيارات التصفية أو التأكد من قيام فنيي ومشرّفي الجودة بتسجيل تقارير الـ NCR.</p>
                    </div>
                  );
                }

                const getLineFriendlyName = (lineId: string) => {
                  switch (lineId) {
                    case 'LINE_A': return 'مصنع A';
                    case 'LINE_B': return 'مصنع B';
                    case 'LINE_C': return 'مصنع C';
                    default: return lineId;
                  }
                };

                return (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredNcrs.map(ncr => {
                      const modelName = models.find(m => m.id === ncr.modelId)?.name || ncr.modelId;
                      return (
                        <div key={ncr.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all text-right">
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-150 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-black text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">
                                {ncr.id}
                              </span>
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                ncr.status === 'OPEN' 
                                  ? 'bg-red-50 text-red-650 border border-red-150' 
                                  : 'bg-emerald-50 text-emerald-650 border border-emerald-150'
                              }`}>
                                {ncr.status === 'OPEN' ? 'مفتوح / جاري الحل' : 'مغلق ومصحح'}
                              </span>
                              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                ncr.severity === 'CRITICAL' 
                                  ? 'bg-red-600 text-white' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {ncr.severity === 'CRITICAL' ? 'حرج (Critical)' : 'رئيسي (Major)'}
                              </span>
                              <span className="text-[10px] font-black bg-zinc-100 text-zinc-650 px-2 py-0.5 rounded-full">
                                {getLineFriendlyName(ncr.lineId)}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-zinc-500 font-bold flex items-center gap-1.5 justify-end">
                              <span>الوردية: {ncr.shift}</span>
                              <span>•</span>
                              <span>{ncr.date} {ncr.time}</span>
                            </div>
                          </div>

                          {/* Refrigerator Info */}
                          <div className="bg-zinc-50/75 p-3.5 rounded-xl border border-zinc-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[10px] text-zinc-405 font-bold block">موديل الثلاجة</span>
                              <span className="text-xs font-extrabold text-zinc-900">{modelName}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-405 font-bold block">باركود الثلاجة الفريد</span>
                              <span className="text-xs font-bold font-mono text-zinc-900">{ncr.barcode}</span>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] text-zinc-405 font-bold block">طبيعة ومكان رصد عدم المطابقة</span>
                                <span className="text-zinc-800 font-bold">
                                  {ncr.defectType === 'CRITICAL_DEFECT' && 'عطل حرج بالمنتج النهائي'}
                                  {ncr.defectType === 'MAJOR_DEFECT' && 'عيب رئيسي بمظهر ومكونات المنتج'}
                                  {ncr.defectType === 'MINOR_DEFECT' && 'عيب بسيط / مظهر سطحي'}
                                  {ncr.defectType === 'CRITICAL_OP' && 'حيود في بارامترات العمليات الحرجة'}
                                  {ncr.defectType === 'PERFORMANCE_TEST' && 'فشل اختبارات الأداء (غرف التبريد)'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-450 font-bold block">وصف العيب والحيود بالتفصيل</span>
                                <p className="text-zinc-700 bg-zinc-50/40 p-2.5 rounded-lg border border-zinc-150/60 leading-relaxed font-semibold">
                                  {ncr.description}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] text-zinc-405 font-bold block">المواصفة المعتمدة (Spec)</span>
                                  <span className="text-zinc-700 font-bold">{ncr.specification || 'غير محدد'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-405 font-bold block">الحيود المرصود (Deviation)</span>
                                  <span className="text-zinc-700 font-bold">{ncr.deviation || 'غير محدد'}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-450 font-bold block">السبب الجذري المتوقع والتحليل</span>
                                <p className="text-zinc-700 bg-zinc-50/40 p-2.5 rounded-lg border border-zinc-150/60 leading-relaxed">
                                  {ncr.rootCause || 'لم يتم كتابة سبب جذري'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action taken by QC */}
                          <div>
                            <span className="text-[10px] text-zinc-405 font-bold block">الإجراء الفوري المتخذ بواسطة الجودة (Action Taken)</span>
                            <p className="text-zinc-700 font-bold bg-amber-50/35 border border-amber-200/50 p-2.5 rounded-xl text-xs">
                              {ncr.actionRequired}
                            </p>
                          </div>

                          {/* Feedback loop from Supervisor */}
                          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                            <h4 className="text-[11px] font-extrabold text-zinc-900 border-b border-zinc-200 pb-1.5 flex items-center justify-between">
                              <span className="text-blue-750 bg-blue-50 px-2 py-0.5 rounded text-[9px] font-bold">نموذج FEEDBACK للتغذية العكسية</span>
                              <span>ملاحظات وإجراءات القسم والاعتماد</span>
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-405 font-bold block">رأي وقرار مراقبة الجودة (QC Opinion)</span>
                                <p className="text-zinc-700 mt-1 italic font-semibold">
                                  {ncr.qcOpinion || 'بانتظار تدوين ملاحظات مراقبة الجودة...'}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-405 font-bold block">رأي وقرار القسم الإنتاجي (Production Opinion)</span>
                                <p className="text-zinc-700 mt-1 italic font-semibold">
                                  {ncr.productionOpinion || 'بانتظار تدوين ملاحظات وإجراءات الإنتاج...'}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-405 font-bold block">القرار النهائي لـ اعتماده</span>
                                <div className="font-extrabold text-zinc-900 mt-1">
                                  {ncr.finalDecision ? (
                                    <div className="space-y-1">
                                      <span className="inline-block text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-bold">{ncr.finalDecision}</span>
                                      <p className="text-[10px] text-zinc-450 font-normal">معتمد القرار: {ncr.decisionMaker || 'مشرف الجودة'}</p>
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 font-medium italic">بانتظار اتخاذ القرار النهائي المعتمد...</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Print and Delete Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-zinc-150">
                            <button
                              onClick={() => {
                                if (confirm('هل أنت متأكد من رغبتك في حذف تقرير الـ NCR هذا نهائياً من قاعدة البيانات؟')) {
                                  setNcrs(prev => prev.filter(n => n.id !== ncr.id));
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-650 hover:bg-red-50 text-xs font-bold transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف التقرير نهائياً</span>
                            </button>

                            <button
                              onClick={() => onPrintNCR(ncr)}
                              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 text-xs font-bold transition-all shadow-sm"
                            >
                              <Printer className="w-4 h-4" />
                              <span>طباعة نموذج Feed BACK (التغذية العكسية)</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-405 text-[11px]">
        <p>© شركة العربي للصناعات الهندسية • الإشراف والتحليل الذكي لخطوط الإنتاج</p>
      </footer>
    </div>
  );
}

// Subcomponents for User Directory Management
interface AddUserFormProps {
  users: ManagedUser[];
  onAddUser: (user: ManagedUser) => void;
}

function AddUserForm({ users, onAddUser }: AddUserFormProps) {
  const [sapNumber, setSapNumber] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'TECHNICIAN' | 'SUPERVISOR' | 'MANAGER'>('TECHNICIAN');
  const [factoryId, setFactoryId] = useState<'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL'>('LINE_A');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{8}$/.test(sapNumber)) {
      setError('يجب أن يتكون رقم الساب (SAP Number) من 8 أرقام فقط.');
      return;
    }

    if (users.some(u => u.sapNumber === sapNumber)) {
      setError('رقم الساب هذا مسجل بالفعل لمستخدم آخر!');
      return;
    }

    if (!name.trim()) {
      setError('يرجى إدخال اسم المستخدم الكامل.');
      return;
    }

    // Add user
    onAddUser({
      sapNumber,
      name: name.trim(),
      role,
      factoryId: role === 'MANAGER' ? 'ALL' : factoryId
    });

    setSuccess('تم إضافة المستخدم الجديد بنجاح!');
    setSapNumber('');
    setName('');
    // Auto clear success after 3s
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="border-b border-zinc-150 pb-2 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-amber-500" />
        <h3 className="font-extrabold text-zinc-950 text-sm">إضافة مستخدم جديد للنظام</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">الاسم الكامل (ثنائي أو ثلاثي)</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="مثال: أحمد عبد الرحمن"
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-zinc-800 outline-none transition-all text-right"
            required
          />
        </div>

        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">رقم الساب الوظيفي (SAP Number)</label>
          <input
            type="text"
            maxLength={8}
            value={sapNumber}
            onChange={e => setSapNumber(e.target.value.replace(/\D/g, ''))}
            placeholder="مثال: 20114059"
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 font-mono font-bold text-center tracking-wide text-zinc-900 outline-none transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">الفئة والصلاحية (Role)</label>
          <select
            value={role}
            onChange={e => {
              const val = e.target.value as 'TECHNICIAN' | 'SUPERVISOR' | 'MANAGER';
              setRole(val);
              if (val === 'MANAGER') {
                setFactoryId('ALL');
              } else if (factoryId === 'ALL') {
                setFactoryId('LINE_A');
              }
            }}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-zinc-800 outline-none transition-all"
          >
            <option value="TECHNICIAN">فني جودة (Technician)</option>
            <option value="SUPERVISOR">مشرف خط إنتاج (Supervisor)</option>
            <option value="MANAGER">مدير جودة ومتابعة (Manager)</option>
          </select>
        </div>

        {role !== 'MANAGER' && (
          <div>
            <label className="block text-zinc-550 font-bold mb-1.5">المصنع التابع له (Factory Line)</label>
            <select
              value={factoryId}
              onChange={e => setFactoryId(e.target.value as 'LINE_A' | 'LINE_B' | 'LINE_C')}
              className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-zinc-800 outline-none transition-all"
            >
              <option value="LINE_A">مصنع A</option>
              <option value="LINE_B">مصنع B</option>
              <option value="LINE_C">مصنع C</option>
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-150 rounded-xl p-2.5 text-red-700 flex items-center gap-1.5 font-sans">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 text-emerald-800 flex items-center gap-1.5 font-sans">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <UserCheck className="w-4 h-4" />
          <span>تثبيت وإضافة المستخدم</span>
        </button>
      </form>
    </div>
  );
}

interface UsersListProps {
  users: ManagedUser[];
  onDeleteUser: (sapNumber: string) => void;
}

function UsersList({ users, onDeleteUser }: UsersListProps) {
  const [filter, setFilter] = useState<'ALL' | 'LINE_A' | 'LINE_B' | 'LINE_C'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => {
    const matchesFilter = filter === 'ALL' || u.factoryId === filter;
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.sapNumber.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const getFactoryName = (fid: string) => {
    switch (fid) {
      case 'LINE_A': return 'مصنع A';
      case 'LINE_B': return 'مصنع B';
      case 'LINE_C': return 'مصنع C';
      case 'ALL': return 'الإدارة العامة';
      default: return fid;
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-150 pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          <h3 className="font-extrabold text-zinc-950 text-sm">مستشاري ومستخدمي المنظومة المعتمدين</h3>
        </div>

        {/* Factory Filter */}
        <div className="flex gap-1.5">
          {(['ALL', 'LINE_A', 'LINE_B', 'LINE_C'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-[10px] ${
                filter === f
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {f === 'ALL' ? 'الكل' : f === 'LINE_A' ? 'مصنع A' : f === 'LINE_B' ? 'مصنع B' : 'مصنع C'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو برقم الساب..."
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-zinc-800 outline-none transition-all text-right"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px] bg-zinc-50">
              <th className="py-2.5 px-3">الاسم الكامل</th>
              <th className="py-2.5 px-3">رقم الساب</th>
              <th className="py-2.5 px-3">الصلاحية</th>
              <th className="py-2.5 px-3">المصنع المعين</th>
              <th className="py-2.5 px-3 text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredUsers.map(u => {
              const isOwner = u.sapNumber === '40016452';
              return (
                <tr key={u.sapNumber} className="hover:bg-zinc-50/50 transition-all">
                  <td className="py-2.5 px-3 font-bold text-zinc-900">{u.name}</td>
                  <td className="py-2.5 px-3 font-mono text-zinc-650 font-extrabold">{u.sapNumber}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'MANAGER'
                        ? 'bg-purple-50 border border-purple-150 text-purple-700'
                        : u.role === 'SUPERVISOR'
                        ? 'bg-blue-50 border border-blue-150 text-blue-700'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-650'
                    }`}>
                      {u.role === 'MANAGER' ? 'مدير' : u.role === 'SUPERVISOR' ? 'مشرف' : 'فني'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-zinc-500">{getFactoryName(u.factoryId)}</td>
                  <td className="py-2.5 px-3 text-center">
                    {isOwner ? (
                      <span className="text-zinc-400 font-bold text-[9px]">مالك غير قابل للحذف</span>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من رغبتك في حذف المستخدم ${u.name}؟`)) {
                            onDeleteUser(u.sapNumber);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors inline-block"
                        title="حذف هذا المستخدم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-zinc-400 font-bold">
                  لا يوجد مستخدمين يطابقون خيارات البحث والفرز الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AddModelFormProps {
  models: RefrigeratorModel[];
  onAddModel: (model: RefrigeratorModel) => void;
}

function AddModelForm({ models, onAddModel }: AddModelFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<"No Frost" | "Defrost">('No Frost');
  const [factoryId, setFactoryId] = useState<'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL'>('LINE_A');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('يرجى إدخال اسم الموديل كاملاً.');
      return;
    }

    const modelId = 'MOD_' + Math.floor(1000 + Math.random() * 9000);

    onAddModel({
      id: modelId,
      name: name.trim(),
      type,
      factoryId,
    });

    setSuccess('تم إضافة الموديل الجديد بنجاح!');
    setName('');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="border-b border-zinc-150 pb-2 flex items-center gap-2">
        <PlusCircle className="w-4 h-4 text-amber-500" />
        <h3 className="font-extrabold text-zinc-950 text-sm">إضافة موديل جديد للمصنع</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">اسم الموديل الفني الكامل</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="مثال: ثلاجة العربي تورنيدو 450 لتر نوفروست"
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-zinc-800 outline-none transition-all text-right"
            required
          />
        </div>

        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">النوع الفني (Type)</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-zinc-800 outline-none transition-all text-right"
          >
            <option value="No Frost">No Frost</option>
            <option value="Defrost">Defrost</option>
          </select>
        </div>

        <div>
          <label className="block text-zinc-550 font-bold mb-1.5">المصنع المستهدف (Factory Line)</label>
          <select
            value={factoryId}
            onChange={e => setFactoryId(e.target.value as any)}
            className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-2.5 py-2 text-zinc-800 outline-none transition-all text-right"
          >
            <option value="LINE_A">مصنع A</option>
            <option value="LINE_B">مصنع B</option>
            <option value="LINE_C">مصنع C</option>
            <option value="ALL">كل المصانع (ALL)</option>
          </select>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-150 rounded-xl p-2.5 text-red-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 text-emerald-800 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>تثبيت وإضافة الموديل</span>
        </button>
      </form>
    </div>
  );
}

interface ModelsListProps {
  models: RefrigeratorModel[];
  onDeleteModel: (id: string) => void;
}

function ModelsList({ models, onDeleteModel }: ModelsListProps) {
  const [filter, setFilter] = useState<'ALL' | 'LINE_A' | 'LINE_B' | 'LINE_C'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredModels = models.filter(m => {
    const matchesFilter = filter === 'ALL' || m.factoryId === filter;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getFactoryName = (fid: string) => {
    switch (fid) {
      case 'LINE_A': return 'مصنع A';
      case 'LINE_B': return 'مصنع B';
      case 'LINE_C': return 'مصنع C';
      case 'ALL': return 'كل المصانع';
      default: return fid;
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-150 pb-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-500" />
          <h3 className="font-extrabold text-zinc-950 text-sm">قائمة موديلات الثلاجات المعتمدة</h3>
        </div>

        {/* Factory Filter */}
        <div className="flex gap-1.5">
          {(['ALL', 'LINE_A', 'LINE_B', 'LINE_C'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition-all text-[10px] ${
                filter === f
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              {f === 'ALL' ? 'الكل' : f === 'LINE_A' ? 'مصنع A' : f === 'LINE_B' ? 'مصنع B' : 'مصنع C'}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث باسم الموديل..."
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-amber-500 focus:bg-white rounded-xl px-3 py-2 text-zinc-800 outline-none transition-all text-right"
        />
      </div>

      {/* Models Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 font-extrabold text-[10px] bg-zinc-50">
              <th className="py-2.5 px-3">رقم الموديل (ID)</th>
              <th className="py-2.5 px-3">اسم الموديل الكامل</th>
              <th className="py-2.5 px-3">النوع الفني</th>
              <th className="py-2.5 px-3">المصنع التابع له</th>
              <th className="py-2.5 px-3 text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredModels.map(m => {
              return (
                <tr key={m.id} className="hover:bg-zinc-55/35 transition-all">
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-400 text-[10px]">{m.id}</td>
                  <td className="py-2.5 px-3 font-bold text-zinc-900">{m.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono">
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-zinc-500">{getFactoryName(m.factoryId)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من رغبتك في حذف الموديل ${m.name}؟`)) {
                          onDeleteModel(m.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors inline-block"
                      title="حذف هذا الموديل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {filteredModels.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-zinc-400 font-bold">
                  لا توجد موديلات تطابق خيارات البحث والفرز الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
