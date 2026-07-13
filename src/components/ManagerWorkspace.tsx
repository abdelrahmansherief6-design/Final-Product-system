/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog, ManagedUser, UserRole, RefrigeratorModel } from '../types';
import { PRODUCTION_LINES } from '../data';
import { 
  BarChart3, LogOut, TrendingUp, Printer, FileSpreadsheet, Download, HelpCircle, 
  CheckCircle, ShieldAlert, Award, Users, UserPlus, Trash2, Lock, Shield, UserCheck, PlusCircle, Package,
  BookOpen, Search, ArrowRight
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
}: ManagerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'INVENTORY_REPORTS' | 'USER_DIRECTORY' | 'TEST_INSTRUCTIONS'>('ANALYTICS');
  const [invSubTab, setInvSubTab] = useState<'INSPECTION' | 'OPERATIONS'>('INSPECTION');

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
  const [ncrs] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_ncrs');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  // Helper to check if a date is within current month or past 30 days
  const isCurrentMonth = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) || diffDays <= 30;
  };

  // State variables for test instructions
  const [instMainTab, setInstMainTab] = useState<'SHARP' | 'TORNADO'>('SHARP');
  const [instSubTab, setInstSubTab] = useState<'PERFORMANCE' | 'CONSTRUCTION'>('PERFORMANCE');
  const [instSearch, setInstSearch] = useState('');

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
    const rows = inspections.map(log => {
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
    const rows = processAudits.map(aud => {
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
        </div>

        {/* Workspace Tab Contents */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pareto Chart for Defects */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-zinc-150 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 font-sans">
                      تحليل باريتو للعيوب الشائعة بمصنع الثلاجات (Pareto Defect Chart)
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">تحديد العيوب التي تسهم بنسبة 80% من مشاكل الجودة لإرساء أولويات الإصلاح خط الإنتاج</p>
                  </div>
                  <HelpCircle className="w-4 h-4 text-zinc-300 hover:text-zinc-550 cursor-help" title="مخطط باريتو يرتب العيوب تنازليًا مع منحنى تراكمي" />
                </div>

                {/* Handscrafted SVG Pareto Chart */}
                {totalDefectsCount === 0 ? (
                  <div className="text-center py-16 text-zinc-450 text-xs">
                    لم يتم تسجيل أي عيوب عينات في هذه النوبة الفنية حتى الآن. خط الإنتاج سليم تمامًا.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative h-64 w-full bg-zinc-50/50 rounded-xl border border-zinc-150 p-2">
                      <svg className="w-full h-full" viewBox="0 0 500 240" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="40" y1="20" x2="460" y2="20" stroke="#f4f4f5" strokeWidth="2" />
                        <line x1="40" y1="73" x2="460" y2="73" stroke="#e4e4e7" strokeDasharray="3" />
                        <line x1="40" y1="126" x2="460" y2="126" stroke="#e4e4e7" strokeDasharray="3" />
                        <line x1="40" y1="180" x2="460" y2="180" stroke="#e4e4e7" strokeDasharray="3" />
                        <line x1="40" y1="200" x2="460" y2="200" stroke="#d4d4d8" />

                        {/* Defect Bars and Dots for cumulative percent */}
                        {paretoData.slice(0, 6).map((defect, index) => {
                          const barWidth = 45;
                          const spacing = (420 / 6);
                          const x = 50 + index * spacing;
                          
                          // Convert frequencies to height
                          const maxCount = Math.max(...paretoData.map(d => d.count)) || 1;
                          const barHeight = (defect.count / maxCount) * 150;
                          const y = 200 - barHeight;

                          // Cumulative line dots coordinates
                          const dotY = 200 - (defect.cumPercent / 100) * 180;
                          
                          return (
                            <g key={defect.id} className="group cursor-pointer">
                              {/* Transparent hover catcher */}
                              <rect x={x - 5} y={20} width={barWidth + 10} height={180} fill="transparent" />
                              <title>{`${defect.label}: ${defect.count} مرة (${defect.cumPercent}% تراكمي)`}</title>
                              
                              {/* The bar */}
                              <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={index < 2 ? '#b91c1c' : index < 4 ? '#d97706' : '#15803d'}
                                rx="4"
                                className="transition-all duration-300 hover:opacity-85"
                              />

                              {/* Label on top of bar */}
                              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fill="#52525b" fontSize="10" fontWeight="extrabold">
                                {defect.count}
                              </text>

                              {/* Cumulative Dot */}
                              <circle cx={x + barWidth / 2} cy={dotY} r="5" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
                            </g>
                          );
                        })}

                        {/* Cumulative curve line path connector */}
                        {(() => {
                          const points = paretoData.slice(0, 6).map((defect, index) => {
                            const spacing = (420 / 6);
                            const x = 50 + index * spacing + 45 / 2;
                            const dotY = 200 - (defect.cumPercent / 100) * 180;
                            return `${x},${dotY}`;
                          }).join(' ');

                          return <polyline fill="none" stroke="#f59e0b" strokeWidth="2.5" points={points} />;
                        })()}
                      </svg>
                    </div>

                    {/* Legend descriptors */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[9px] font-bold text-center text-zinc-550">
                      {paretoData.slice(0, 6).map((defect, idx) => (
                        <div key={defect.id} className="p-1.5 bg-zinc-50 rounded border border-zinc-200 truncate" title={defect.label}>
                          <span className="block text-zinc-400 text-[8px]">#{idx + 1}</span>
                          <span className="text-zinc-800">{defect.label.length > 15 ? defect.label.substring(0, 15) + '..' : defect.label}</span>
                          <span className="block mt-1 font-mono text-red-650 font-bold">{defect.cumPercent}% تراكمي</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Line Production yield overview */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-zinc-150 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 font-sans">
                      جدول مقارنة كفاءة خطوط التجميع الثلاجات والـ FPY
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">تقييم عينات الإنتاج الأولي ومعدل تخريد الورش وإصلاح العيوب</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Line compare bars */}
                  <div className="space-y-3 pt-1">
                    {lineStats.map((line) => {
                      return (
                        <div key={line.id} className="bg-zinc-50 p-4 rounded-xl border border-zinc-150 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-zinc-800">{line.name}</span>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-zinc-450">إجمالي المفحوص: <strong>{line.total}</strong></span>
                              <span className="text-emerald-600 font-bold">• FPY: <strong>{line.fpy}%</strong></span>
                            </div>
                          </div>

                          {/* Progress bar representing yield */}
                          <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 rounded-full transition-all duration-505 ${
                                line.fpy >= 85 
                                  ? 'bg-emerald-600' 
                                  : line.fpy >= 70 
                                  ? 'bg-amber-500' 
                                  : 'bg-red-500'
                              }`} 
                              style={{ width: `${line.fpy}%` }} 
                            />
                          </div>

                          {/* Mini breakdowns */}
                          <div className="flex justify-between items-center text-[10px] text-zinc-400">
                            <span>المشرف المسؤول: <strong className="text-zinc-700">{line.supervisorName}</strong></span>
                            <span className="flex gap-2">
                              <span>قيد المعالجة بالخط: <strong className="text-amber-600">{line.currentFail}</strong></span>
                              <span>التخريد الكلي: <strong className="text-red-650">{line.scrap}</strong></span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary commentary info */}
                  <div className="bg-blue-50/50 border border-blue-150 p-3.5 rounded-xl text-[10px] text-blue-800 leading-relaxed font-sans">
                    💡 <strong>تقرير المشاهدة التحليلي:</strong> يعتبر خط التجميع ج أعلى الخطوط استقرارًا حاليًا لنقاء فنيات لحام الكوندنسر، بينما يتأثر الخط ب عيب في خدوش الهيكل الخارجي وصاج الأبواب مما يستدعي تدقيق عزل مكبس سحب الستيل.
                  </div>
                </div>
              </div>

            </div>

            {/* Downside grid: Recent Process QC limits review */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-zinc-150 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 font-sans">
                    سجل المعاينات ومطابقة شاشات الفحص الفنية للعمليات (Process Parameters Status)
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1">آخر تدقيق لمعايير اللحام، الشحن بالفريون، والخواص الهيدروليكية الموثقة بواسطة المشرفين</p>
                </div>
              </div>

              {processAudits.length === 0 ? (
                <div className="text-center py-6 text-zinc-450 text-xs">
                  لم يسجل المشرفون أي معاينات للعمليات والخطوط حتى الآن.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processAudits.slice(0, 3).map((aud) => {
                    const line = PRODUCTION_LINES.find(l => l.id === aud.lineId);
                    const isPassed = aud.weldingOK && aud.foamingOK && aud.gasChargingOK && aud.vacuumOK && aud.safetyGroundLeakageOK;
                    return (
                      <div key={aud.id} className={`p-4 rounded-xl border ${isPassed ? 'bg-zinc-50 border-zinc-200' : 'bg-red-50/40 border-red-200'} space-y-3 text-xs`}>
                        <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                          <div>
                            <span className="text-[10px] font-sans font-bold text-zinc-700 block">{line ? line.name : aud.lineId}</span>
                            <span className="text-[9px] font-mono text-zinc-400 block mt-0.5">#{aud.id}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {isPassed ? 'مطابق ومستقر' : 'تجاوز المعايير'}
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono text-[11px] text-zinc-600">
                          <div className="flex justify-between">
                            <span>حرارة اللحام :</span>
                            <span className={aud.weldingOK ? 'text-emerald-705' : 'text-red-705 font-bold'}>{aud.weldingStationTemp} °C</span>
                          </div>
                          <div className="flex justify-between">
                            <span>كثافة عزل الفوم :</span>
                            <span className={aud.foamingOK ? 'text-emerald-705' : 'text-red-705 font-bold'}>{aud.foamingDensity} kg/m³</span>
                          </div>
                          <div className="flex justify-between">
                            <span>شحن غاز المبرد :</span>
                            <span className={aud.gasChargingOK ? 'text-emerald-705' : 'text-red-705 font-bold'}>{aud.gasChargingPressure} bar</span>
                          </div>
                          <div className="flex justify-between">
                            <span>تفريغ الأنابيب :</span>
                            <span className={aud.vacuumOK ? 'text-emerald-705' : 'text-red-705 font-bold'}>{aud.vacuumLevel} mbar</span>
                          </div>
                          <div className="flex justify-between border-t border-zinc-200/60 pt-1 text-[10px] text-zinc-400 font-sans">
                            <span>المسؤول: {aud.auditorName.split(' ')[0]} {aud.auditorName.split(' ')[1]}</span>
                            <span>{new Date(aud.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'INVENTORY_REPORTS' && (
          <div className="space-y-4 animate-fadeIn text-right">
            {/* Sub Tabs: Inspections vs Operations */}
            <div className="flex bg-zinc-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setInvSubTab('INSPECTION')}
                className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                  invSubTab === 'INSPECTION'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                الفحص
              </button>
              <button
                onClick={() => setInvSubTab('OPERATIONS')}
                className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${
                  invSubTab === 'OPERATIONS'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                العمليات
              </button>
            </div>

            {invSubTab === 'INSPECTION' ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-150 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-amber-500" />
                      بيان سجل ومواصفات الفحص الفني لجرد الثلاجات
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">كشف تفصيلي يبين جودة كافة الوحدات المغادرة لخط الإنتاج والقرار الإشرافي المتخذ بشأنها</p>
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handleDownloadInventoryCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل كشف اكسل (CSV)</span>
                  </button>
                </div>

                {/* Inventory table logs */}
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-550 uppercase text-[10px] font-bold bg-zinc-50">
                        <th className="py-3 px-4">رقم السيريال (Serial)</th>
                        <th className="py-3 px-4">الموديل الفني</th>
                        <th className="py-3 px-4">خط الإنتاج</th>
                        <th className="py-3 px-4">الفاحص (الـ SAP)</th>
                        <th className="py-3 px-4">التاريخ والوقت</th>
                        <th className="py-3 px-4 text-center">القرار المبدئي للثلاجة</th>
                        <th className="py-3 px-4 text-center">حالة معالجة العيوب لخط الإنتاج</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700">
                      {inspections.map((log) => {
                        const modelObj = models.find(m => m.id === log.modelId);
                        const lineObj = PRODUCTION_LINES.find(l => l.id === log.lineId);
                        return (
                          <tr key={log.id} className="hover:bg-zinc-55/35 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-900 tracking-wider">
                              {log.serialNumber}
                            </td>
                            <td className="py-3 px-4 font-sans text-zinc-800">
                              {modelObj ? modelObj.name : log.modelId}
                            </td>
                            <td className="py-3 px-4 font-bold text-zinc-500">
                              {lineObj ? lineObj.name : log.lineId}
                            </td>
                            <td className="py-3 px-4 font-mono text-[10px] text-zinc-400">
                              {log.inspectorName.split(' ')[0]} ({log.inspectorSap})
                            </td>
                            <td className="py-3 px-4 text-zinc-500">
                              {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                log.status === 'PASS' 
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                                  : 'bg-red-50 border-red-200 text-red-700'
                              }`}>
                                {log.status === 'PASS' ? 'مطابق وممتاز' : 'به عيوب تصنيع'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
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
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-150 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                      تقارير تدقيق جودة العمليات المترولوجية لمجموعات الدعم والإنتاج
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">تتبع انحرافات اللحام، قوة وضغط قذف غاز الفريون المبرد، وكثافة مركب عزل الهيكل الخارجي</p>
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handleDownloadProcessCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تحميل بيان العمليات الفنية (CSV)</span>
                  </button>
                </div>

                {/* Audits table logs */}
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-550 uppercase text-[10px] font-bold bg-zinc-50">
                        <th className="py-3 px-4">رقم التدقيق</th>
                        <th className="py-3 px-4">اسم خط التجميع</th>
                        <th className="py-3 px-4">المشرف المسؤول</th>
                        <th className="py-3 px-4">محطة اللحام للنحاس</th>
                        <th className="py-3 px-4">كثافة الفوم العازل</th>
                        <th className="py-3 px-4">ضغط تعبئة الغاز المبرد</th>
                        <th className="py-3 px-4">تفريغ الأنابيب (Vacuum)</th>
                        <th className="py-3 px-4 text-center">معايرة التسريب الكهربي</th>
                        <th className="py-3 px-4">التاريخ والوقت الموثق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-zinc-700">
                      {processAudits.map((item) => {
                        const lineObj = PRODUCTION_LINES.find(l => l.id === item.lineId);
                        return (
                          <tr key={item.id} className="hover:bg-zinc-55/35 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-400">
                              {item.id}
                            </td>
                            <td className="py-3 px-4 font-bold text-zinc-800 font-sans">
                              {lineObj ? lineObj.name : item.lineId}
                            </td>
                            <td className="py-3 px-4 text-zinc-400">
                              {item.auditorName}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={item.weldingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                {item.weldingStationTemp} °C {item.weldingOK ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={item.foamingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                {item.foamingDensity} kg/m³ {item.foamingOK ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={item.gasChargingOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                {item.gasChargingPressure} bar {item.gasChargingOK ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              <span className={item.vacuumOK ? 'text-emerald-700' : 'text-red-750 font-bold'}>
                                {item.vacuumLevel} mbar {item.vacuumOK ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${item.safetyGroundLeakageOK ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {item.safetyGroundLeakageOK ? 'مطابق' : 'فاشل المعايرة'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-400">
                              {new Date(item.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
