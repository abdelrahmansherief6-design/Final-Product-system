/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, QualityInspectionLog, ProcessAuditLog, ProductionLineId } from '../types';
import { REFRIGERATOR_MODELS, PRODUCTION_LINES, DEFECT_OPTIONS } from '../data';
import { ShieldCheck, LogOut, CheckCircle, RefreshCcw, ClipboardCheck, Trash2, ArrowLeftRight, Activity, Thermometer, Flame, Gauge, ShieldAlert, PlusCircle, History } from 'lucide-react';

interface SupervisorWorkspaceProps {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  onUpdateInspection: (id: string, updates: Partial<QualityInspectionLog>) => void;
  processAudits: ProcessAuditLog[];
  onAddProcessAudit: (audit: ProcessAuditLog) => void;
}

export default function SupervisorWorkspace({
  user,
  onLogout,
  inspections,
  onUpdateInspection,
  processAudits,
  onAddProcessAudit,
}: SupervisorWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'PENDING_REPAIRS' | 'PROCESS_AUDIT' | 'AUDIT_HISTORY'>('PENDING_REPAIRS');

  // Process Audit form states
  const [auditLineId, setAuditLineId] = useState<ProductionLineId>('LINE_A');
  const [weldingTemp, setWeldingTemp] = useState(380);
  const [foamingDensity, setFoamingDensity] = useState(38.5);
  const [gasPressure, setGasPressure] = useState(2.3);
  const [vacuumLevel, setVacuumLevel] = useState(0.04);
  const [groundLeakageOK, setGroundLeakageOK] = useState(true);
  const [auditNotes, setAuditNotes] = useState('');
  
  const [auditSuccess, setAuditSuccess] = useState('');

  // Repair action state (supervisor comments per card)
  const [supervisorComments, setSupervisorComments] = useState<Record<string, string>>({});

  // Filters
  const pendingLogs = inspections.filter(
    (log) => log.status === 'FAIL' && log.recheckStatus === 'PENDING'
  );

  // My line audits list (supervisor specific or general)
  const sortedAudits = [...processAudits].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Submitting final product repair approval
  const handleApproveRepair = (logId: string) => {
    onUpdateInspection(logId, {
      status: 'PASS',
      recheckStatus: 'APPROVED_AFTER_REPAIR',
      supervisorApproved: true,
      approvalTimestamp: new Date().toISOString(),
    });
    
    // Clear comment state
    setSupervisorComments(prev => {
      const copy = { ...prev };
      delete copy[logId];
      return copy;
    });
  };

  // Submitting final product scrapping
  const handleScrapProduct = (logId: string) => {
    if (window.confirm('هل أنت متأكد من قرار تكهين وتخريد هذه الثلاجة بالكامل؟ هذا الإجراء غير قابل للتراجع.')) {
      onUpdateInspection(logId, {
        status: 'FAIL',
        recheckStatus: 'SCRAPPED',
        supervisorApproved: false,
        approvalTimestamp: new Date().toISOString(),
      });
      
      setSupervisorComments(prev => {
        const copy = { ...prev };
        delete copy[logId];
        return copy;
      });
    }
  };

  // Process Quality Audit submission
  const handleProcessAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Standard calculations
    const isWeldingOK = weldingTemp >= 375 && weldingTemp <= 395;
    const isFoamingOK = foamingDensity >= 37 && foamingDensity <= 41;
    const isGasPressureOK = gasPressure >= 2.2 && gasPressure <= 2.5;
    const isVacuumOK = vacuumLevel <= 0.06;

    const newAudit: ProcessAuditLog = {
      id: `PA-SUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      lineId: auditLineId,
      auditorId: user.id,
      auditorName: user.name,
      timestamp: new Date().toISOString(),
      weldingStationTemp: weldingTemp,
      weldingOK: isWeldingOK,
      foamingDensity: foamingDensity,
      foamingOK: isFoamingOK,
      gasChargingPressure: gasPressure,
      gasChargingOK: isGasPressureOK,
      vacuumLevel: vacuumLevel,
      vacuumOK: isVacuumOK,
      safetyGroundLeakageOK: groundLeakageOK,
      notes: auditNotes || 'عمليات التفتيش والمراقبة الدورية مطابقة ومسجلة.',
    };

    onAddProcessAudit(newAudit);
    
    // UI Feedback
    let faultsCount = 0;
    if (!isWeldingOK) faultsCount++;
    if (!isFoamingOK) faultsCount++;
    if (!isGasPressureOK) faultsCount++;
    if (!isVacuumOK) faultsCount++;
    if (!groundLeakageOK) faultsCount++;

    setAuditSuccess(
      faultsCount === 0 
        ? 'تم تسجيل تدقيق الجودة بنجاح! جميع المعايير مطابقة للمواصفات الفنية.' 
        : `تم تسجيل تدقيق الجودة بوجود عدد (${faultsCount}) معايير خارج النطاقات الحرجة. تم إرسال تنبيه آلي لمدير الدائرة.`
    );
    
    // Reset Form
    setWeldingTemp(380);
    setFoamingDensity(38.5);
    setGasPressure(2.3);
    setVacuumLevel(0.04);
    setGroundLeakageOK(true);
    setAuditNotes('');

    setTimeout(() => {
      setAuditSuccess('');
    }, 6000);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-zinc-800 flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-zinc-900">بوابة المشرفين الفنية</h1>
                <span className="font-mono bg-blue-50 text-blue-600 border border-blue-150 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                  المتابعة والاعتماد
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">إدارة إصلاح منتجات الثلاجات وتدقيق معايير الجودة للعمليات</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-left">
              <span className="text-[10px] text-zinc-400 font-bold block">مشرف جودة المصنع</span>
              <span className="text-xs text-blue-600 font-bold font-sans">{user.name}</span>
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
        
        {/* Supervisor Welcome banner */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900">التحقق وإصدار شهادات التطابق ومراقبة جودة الإنتاج 🏭</h2>
            <p className="text-xs text-zinc-550">يمكنك هنا مراجعة معالجة العيوب في خطوط التجميع وتوثيق تدقيق العمليات (Process QC) لغاز الشحن، الفوم، واللحام.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-center">
              <span className="block text-[10px] text-zinc-500 font-bold mb-1">بانتظار الاعتماد</span>
              <span className={`text-sm font-bold font-mono ${pendingLogs.length > 0 ? 'text-amber-600' : 'text-zinc-500'}`}>
                {pendingLogs.length} ثلاجات
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-200 gap-2">
          <button
            onClick={() => setActiveTab('PENDING_REPAIRS')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'PENDING_REPAIRS'
                ? 'border-blue-600 text-blue-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span>اتخاذ القرار بالمرفوضات ({pendingLogs.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('PROCESS_AUDIT')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'PROCESS_AUDIT'
                ? 'border-blue-600 text-blue-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>تسجيل تدقيق العمليات (Line Audit)</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT_HISTORY')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'AUDIT_HISTORY'
                ? 'border-blue-600 text-blue-605 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <History className="w-4 h-4" />
            <span>تاريخ ومحاضر تدقيق المعايير ({sortedAudits.length})</span>
          </button>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {auditSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl flex items-center gap-3 border shadow-sm ${
                auditSuccess.includes('خارج النطاقات')
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-250 text-emerald-800'
              }`}
            >
              {auditSuccess.includes('خارج النطاقات') ? (
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-xs block">تم توثيق فحص المعايير</span>
                <p className="text-[11px] mt-0.5">{auditSuccess}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Tab Panel Container */}
        {activeTab === 'PENDING_REPAIRS' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2 mb-2">
              <span className="w-2 h-4 bg-blue-600 rounded-sm block" />
              ثلاجات غير مطابقة بانتظار قرار إعادة الاعتماد أو التكهين (تخريد)
            </h3>

            {pendingLogs.length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-500 space-y-1 shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-605 mx-auto" />
                <h4 className="text-xs font-bold text-zinc-800 pt-1">خط تجميع الثلاجات نظيف 100%!</h4>
                <p className="text-[11px] text-zinc-400">لا توجد ثلاجات مرفوضة معلقة حاليًا بانتظار الاعتماد بعد الإصلاح.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingLogs.map((log) => {
                  const modelObj = REFRIGERATOR_MODELS.find((m) => m.id === log.modelId);
                  const lineObj = PRODUCTION_LINES.find((l) => l.id === log.lineId);
                  return (
                    <motion.div
                      layout
                      key={log.id}
                      className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3.5">
                        {/* Header card info */}
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded uppercase font-bold">
                              {lineObj ? lineObj.name.split(' ')[0] + ' ' + lineObj.name.split(' ')[1] : log.lineId}
                            </span>
                            <span className="font-mono text-xs font-bold block mt-1 text-zinc-900 tracking-wider">
                              SN: {log.serialNumber}
                            </span>
                          </div>
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            بانتظار التأكيد
                          </span>
                        </div>

                        {/* Model details */}
                        <div className="space-y-1 text-xs">
                          <label className="text-[10px] text-zinc-400 font-bold block">الموديل الفني والمواصفة</label>
                          <span className="font-bold text-zinc-800">{modelObj ? modelObj.name : log.modelId}</span>
                        </div>

                        {/* Defect details registered by tech */}
                        <div className="space-y-1 text-xs bg-red-50/30 p-3 rounded-xl border border-red-100">
                          <label className="text-[10px] text-red-700 font-bold flex items-center gap-1 mb-1.5">
                            📌 قائمة العيوب والعيّنات المرفوضة:
                          </label>
                          <ul className="space-y-1.5">
                            {log.defects.map((def, idx) => {
                              const defOpt = DEFECT_OPTIONS.find((d) => d.id === def.defectOptionId);
                              return (
                                <li key={idx} className="text-[11px] text-red-700 flex items-start gap-1">
                                  <span className="text-red-500 font-bold shrink-0">•</span>
                                  <div>
                                    <strong className="text-zinc-900">{defOpt ? defOpt.label : def.defectOptionId}</strong>
                                    {def.details && <p className="text-[10px] text-zinc-500 mt-0.5 font-bold">ملاحظات الفني: {def.details}</p>}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Submitter info */}
                        <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-100">
                          <span>الفاحص: <strong className="text-zinc-700">{log.inspectorName.split(' ')[0]}</strong></span>
                          <span>الوقت: <strong className="font-mono text-zinc-700">
                            {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          </strong></span>
                        </div>
                      </div>

                      {/* Decision CTA */}
                      <div className="pt-4 border-t border-zinc-150 space-y-2.5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveRepair(log.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>معتمد بعد الإصلاح</span>
                          </button>
                          
                          <button
                            onClick={() => handleScrapProduct(log.id)}
                            className="bg-zinc-100 hover:bg-red-50 hover:text-red-600 border border-zinc-250 hover:border-red-205 px-3 py-2 rounded-xl text-zinc-650 flex items-center justify-center transition-all shrink-0"
                            title="تكهين الثلاجة (تخريد)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'PROCESS_AUDIT' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left/Middle Column Form */}
            <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  تسجيل نموذج تدقيق الجودة للعمليات الفنية بالخط (Process QC)
                </h3>
              </div>

              <form onSubmit={handleProcessAuditSubmit} className="space-y-5">
                {/* Audit Line */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-550 font-bold mb-2">خط الإنتاج المستهدف بالتدقيق</label>
                    <select
                      value={auditLineId}
                      onChange={(e) => setAuditLineId(e.target.value as ProductionLineId)}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-850 outline-none transition-all"
                    >
                      {PRODUCTION_LINES.map(line => (
                        <option key={line.id} value={line.id}>
                          {line.name} ({line.supervisorName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-550 font-bold mb-2">اسم المشرف المدقق</label>
                    <input
                      type="text"
                      value={user.name}
                      disabled
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs text-zinc-500 font-bold"
                    />
                  </div>
                </div>

                {/* Audit Parameters sliders and manual entering inside tolerances limits */}
                <div className="space-y-4 pt-2 border-t border-zinc-150">
                  <span className="text-[11px] text-blue-600 font-bold block mb-1">
                    يرجى قراءة وتسجيل القيم الرقمية من شاشات التحكم بالمحطات:
                  </span>

                  {/* 1. Welding temperature */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-205 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                        درجة حرارة محطة لحام مواسير نحاس الكوندنسر والفلتر
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        weldingTemp >= 375 && weldingTemp <= 395 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {weldingTemp} °C (المعيار: 375 - 395 °C)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="360"
                        max="410"
                        value={weldingTemp}
                        onChange={(e) => setWeldingTemp(parseInt(e.target.value))}
                        className="flex-1 accent-orange-500 cursor-ew-resize"
                      />
                    </div>
                  </div>

                  {/* 2. Foaming Density */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-205 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                        كثافة مركب عزل الفوم بداخل جدران الهيكل الخارجي
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        foamingDensity >= 37 && foamingDensity <= 41 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {foamingDensity} kg/m³ (المعيار: 37 - 41 kg/m³)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="34"
                        max="44"
                        step="0.1"
                        value={foamingDensity}
                        onChange={(e) => setFoamingDensity(parseFloat(e.target.value))}
                        className="flex-1 accent-blue-550 cursor-ew-resize"
                      />
                    </div>
                  </div>

                  {/* 3. Gas Charging pressure */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-205 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-cyan-500" />
                        ضغط شحن غاز الفريون المبرد (R600a Engine)
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        gasPressure >= 2.2 && gasPressure <= 2.5 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {gasPressure} bar (المعيار: 2.2 - 2.5 bar)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="2.0"
                        max="2.8"
                        step="0.05"
                        value={gasPressure}
                        onChange={(e) => setGasPressure(parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-555 cursor-ew-resize"
                      />
                    </div>
                  </div>

                  {/* 4. Vacuum Speed Level */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-205 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-500" />
                        مستوى تفريغ الهواء بالأنابيب (Vacuum Level) قبل الشحن
                      </span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        vacuumLevel <= 0.06 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {vacuumLevel} mbar (المعيار: ≤ 0.06 mbar)
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0.01"
                        max="0.10"
                        step="0.005"
                        value={vacuumLevel}
                        onChange={(e) => setVacuumLevel(parseFloat(e.target.value))}
                        className="flex-1 accent-indigo-555 cursor-ew-resize"
                      />
                    </div>
                  </div>

                  {/* 5. Electricity Ground leakage calibrator */}
                  <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-205 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-805 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                      معايرة واختبار الأمان وجهاز تيار التسريب الأرضي (Calibration Ground Safety)
                    </span>
                    <button
                      type="button"
                      onClick={() => setGroundLeakageOK(!groundLeakageOK)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        groundLeakageOK 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-705' 
                          : 'bg-red-50 border-red-300 text-red-705'
                      }`}
                    >
                      {groundLeakageOK ? 'نشط ومعاير (Pass)' : 'فاشل المعايرة (Fail)'}
                    </button>
                  </div>
                </div>

                {/* Audit notes and Submit button */}
                <div className="space-y-3 pt-3">
                  <label className="block text-xs text-zinc-650 font-bold">ملاحظات التدقيق وحالة خط تجميع الثلاجات</label>
                  <textarea
                    rows={2}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="ملاحظات اختيارية عن استقرار المعايير أو أي أخطاء ميكانيكية بالخط..."
                    className="w-full bg-zinc-55/40 border border-zinc-200/90 focus:border-blue-500 focus:bg-white text-xs px-3.5 py-2.5 rounded-xl text-zinc-900 outline-none transition-all"
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>حفظ ونشر التقرير بالشبكة</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Right Instructions/Tolerances card */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <span className="text-xs font-mono text-blue-600 uppercase font-bold tracking-wider block">
                  دليل معايير الجودة للعمليات الفنية
                </span>
                <h4 className="text-sm font-bold text-zinc-900 pb-2 border-b border-zinc-150">
                  لوحة المراقبة المعيارية لمجموعات التبريد وعزل الثلاجة
                </h4>

                <div className="space-y-3.5 text-xs text-zinc-550 leading-relaxed">
                  <p>
                     يجب على المشرف القيام بهذا التدقيق مرة واحدة بكل نوبة عمل فنية على الأقل، للتأكد من المحافظة على الجودة العالية لنفس معايير مجموعة دوجان وتوشيبا وبناء الثلاجات.
                  </p>

                  <div className="space-y-2.5 pt-3">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mt-1 shrink-0" />
                      <div>
                        <strong className="text-zinc-800 block">درجة الحرارة المستهدفة للحام:</strong>
                        <span>380 درجة مئوية (المدى الآمن لفوهات غاز الأكسجين واللحامات للوصلات).</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <div>
                        <strong className="text-zinc-800 block">كثافة الفوم العازل:</strong>
                        <span>38-40 كجم/متر مكعب (لضمان كفاءة التبريد السريع وعدم تسريب الفريزر للرطوبة).</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1 shrink-0" />
                      <div>
                        <strong className="text-zinc-800 block">ضغط تعبئة الفريون R600a:</strong>
                        <span>2.3 بار (الوزن الدقيق لضاغط الثلاجات الحديثة).</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT_HISTORY' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              تاريخ ومحاضر تدقيق العمليات الفنية للخطوط
            </h3>

            {sortedAudits.length === 0 ? (
              <div className="text-center py-12 text-zinc-450 text-xs">
                لم يتم تسجيل أي محاضر تدقيق عمليات جودة فنية حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                      <th className="py-3 px-4">رقم المحضر</th>
                      <th className="py-3 px-4">خط الإنتاج</th>
                      <th className="py-3 px-4">المدقق</th>
                      <th className="py-3 px-4">درجة حرارة اللحام</th>
                      <th className="py-3 px-4">كثافة الفوم</th>
                      <th className="py-3 px-4">ضغط غاز المبرد</th>
                      <th className="py-3 px-4">سرعة التفريغ</th>
                      <th className="py-3 px-4 text-center">تيار التسريب</th>
                      <th className="py-3 px-4">الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {sortedAudits.map((item) => {
                      const lineObj = PRODUCTION_LINES.find(l => l.id === item.lineId);
                      const hasFailure = !item.weldingOK || !item.foamingOK || !item.gasChargingOK || !item.vacuumOK || !item.safetyGroundLeakageOK;
                      return (
                        <tr key={item.id} className={`hover:bg-zinc-55/30 transition-colors ${hasFailure ? 'bg-amber-50/60' : ''}`}>
                          <td className="py-3 px-4 font-mono font-bold text-zinc-500">
                            {item.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-800">
                            {lineObj ? lineObj.name.split(' ')[0] + ' ' + lineObj.name.split(' ')[1] : item.lineId}
                          </td>
                          <td className="py-3 px-4 text-zinc-650">
                            {item.auditorName.split(' ')[0]} {item.auditorName.split(' ')[1] || ''}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold ${item.weldingOK ? 'text-emerald-750' : 'text-red-750'}`}>
                            {item.weldingStationTemp} °C {!item.weldingOK && '⚠️'}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold ${item.foamingOK ? 'text-emerald-750' : 'text-red-750'}`}>
                            {item.foamingDensity} kg/m³ {!item.foamingOK && '⚠️'}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold ${item.gasChargingOK ? 'text-emerald-750' : 'text-red-750'}`}>
                            {item.gasChargingPressure} bar {!item.gasChargingOK && '⚠️'}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold ${item.vacuumOK ? 'text-emerald-750' : 'text-red-750'}`}>
                            {item.vacuumLevel} mbar {!item.vacuumOK && '⚠️'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold ${item.safetyGroundLeakageOK ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {item.safetyGroundLeakageOK ? 'معاير' : 'خارج النطاق'}
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
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-405 text-[11px]">
        <p>© شركة العربي للصناعات الهندسية • نظام توكيد جودة المنتجات المتقدم</p>
      </footer>
    </div>
  );
}
