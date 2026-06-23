/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog } from '../types';
import { REFRIGERATOR_MODELS, PRODUCTION_LINES } from '../data';
import { 
  BarChart3, LogOut, TrendingUp, Printer, FileSpreadsheet, Download, HelpCircle, 
  CheckCircle, ShieldAlert, Award
} from 'lucide-react';

interface ManagerWorkspaceProps {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  processAudits: ProcessAuditLog[];
}

export default function ManagerWorkspace({
  user,
  onLogout,
  inspections,
  processAudits,
}: ManagerWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'INVENTORY_REPORTS' | 'PROCESS_REPORTS'>('ANALYTICS');

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
          const label = REFRIGERATOR_MODELS.find(m => m.id === optionId)?.name || optionId;
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
      const model = REFRIGERATOR_MODELS.find(m => m.id === log.modelId)?.name || log.modelId;
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
        
        {/* Manager KPIs panels */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: FPY */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">معدل الجودة الأولي (FPY)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">{fpyGeneral}%</span>
              <span className="text-[9px] text-zinc-400 font-bold">هدف المصنع: 85%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5" style={{ width: `${fpyGeneral}%` }} />
            </div>
          </div>

          {/* Card 2: Inspected */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">إجمالي المفحوص</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-zinc-900">{totalInspected}</span>
              <span className="text-[9px] text-zinc-450">وحدة ثلاجة</span>
            </div>
            <p className="text-[10px] text-zinc-450 font-sans leading-none">محدثة خلال النبطية الحالية</p>
          </div>

          {/* Card 3: Matches */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">المطابق النهائي</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">{currentlyPassed}</span>
              <span className="text-[9px] text-emerald-600 font-bold">({Math.round((currentlyPassed / (totalInspected || 1)) * 100)}%)</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-none">تتضمن المعاد تصليحها واجتيازها</p>
          </div>

          {/* Card 4: Failed Pending */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-1.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">معلقة للإصلاح</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono ${currentlyPending > 0 ? 'text-amber-600 animate-pulse' : 'text-zinc-500'}`}>
                {currentlyPending}
              </span>
              <span className="text-[9px] text-zinc-455">في محطة المعالجة</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-none">بانتظار موافقة مشرف الجودة</p>
          </div>

          {/* Card 5: Scrapped */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-4.5 shadow-sm space-y-1.5 col-span-2 lg:col-span-1">
            <span className="text-[10px] text-zinc-400 font-bold uppercase block">التكهين الكلي (Scrap)</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold font-mono ${currentlyScrapped > 0 ? 'text-red-650' : 'text-zinc-500'}`}>
                {currentlyScrapped}
              </span>
              <span className="text-[9px] text-zinc-450">ثلاجة تالفة</span>
            </div>
            <p className="text-[10px] text-zinc-450 leading-none">فشل إصلاحها بالكامل بالصيانة</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 gap-2">
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
            <span>سجل فحوصات المنتجات النهائية وجدول التصحيح</span>
          </button>

          <button
            onClick={() => setActiveTab('PROCESS_REPORTS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'PROCESS_REPORTS'
                ? 'border-amber-500 text-amber-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تقارير تدقيق معايير العمليات (Line Process QC)</span>
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
                    const modelObj = REFRIGERATOR_MODELS.find(m => m.id === log.modelId);
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
        )}

        {/* Tab Components: PROCESS_REPORTS */}
        {activeTab === 'PROCESS_REPORTS' && (
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

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-405 text-[11px]">
        <p>© شركة العربي للصناعات الهندسية • الإشراف والتحليل الذكي لخطوط الإنتاج</p>
      </footer>
    </div>
  );
}
