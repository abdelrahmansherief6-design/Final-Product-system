/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, QualityInspectionLog, ProductionLineId } from '../types';
import { REFRIGERATOR_MODELS, PRODUCTION_LINES, CHECKLIST_ITEMS, DEFECT_OPTIONS, generateSerialNumber } from '../data';
import { Play, Sparkles, Send, CheckCircle2, XCircle, AlertTriangle, ListChecks, History, LogOut, Check, BadgeAlert } from 'lucide-react';

interface TechnicianWorkspaceProps {
  user: User;
  onLogout: () => void;
  inspections: QualityInspectionLog[];
  onAddInspection: (log: QualityInspectionLog) => void;
}

export default function TechnicianWorkspace({ user, onLogout, inspections, onAddInspection }: TechnicianWorkspaceProps) {
  // Form states
  const [lineId, setLineId] = useState<ProductionLineId>(() => {
    if (user.factoryId && user.factoryId !== 'ALL') {
      return user.factoryId;
    }
    return 'LINE_A';
  });
  const [modelId, setModelId] = useState(REFRIGERATOR_MODELS[0].id);
  const [serialNumber, setSerialNumber] = useState('');
  
  // Checklist states: checklistItemId -> boolean (default true for standard pass)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CHECKLIST_ITEMS.forEach(it => {
      initial[it.id] = true;
    });
    return initial;
  });

  // Chosen defect option IDs
  const [selectedDefects, setSelectedDefects] = useState<string[]>([]);
  const [defectNotes, setDefectNotes] = useState<Record<string, string>>({});

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'NEW_CHECK' | 'MY_HISTORY'>('NEW_CHECK');

  // Generate a premium random serial number in one click
  const handleAutoGenerateSerial = () => {
    const generated = generateSerialNumber(lineId, modelId);
    setSerialNumber(generated);
  };

  // Toggle single checklist check
  const handleToggleChecklist = (id: string, isPassed: boolean) => {
    setChecklist(prev => {
      const next = { ...prev, [id]: isPassed };
      
      // If setting to fail, let's auto-select related defect options to make it smart!
      if (!isPassed) {
        const item = CHECKLIST_ITEMS.find(c => c.id === id);
        if (item) {
          // Find standard matches
          const defaultDefect = DEFECT_OPTIONS.find(d => d.category === item.category);
          if (defaultDefect && !selectedDefects.includes(defaultDefect.id)) {
            setSelectedDefects(curr => [...curr, defaultDefect.id]);
          }
        }
      } else {
        // If restoring to pass, let's see if we should remove isPassed defects
        const item = CHECKLIST_ITEMS.find(c => c.id === id);
        if (item) {
          const defaultDefect = DEFECT_OPTIONS.find(d => d.category === item.category);
          if (defaultDefect) {
            // Check if other checklist items of same category are also failed
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

  // Toggle custom defect checkboxes
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      alert('يرجى تحديد أو توليد الرقم التسلسلي للثلاجة أولاً.');
      return;
    }

    // Check if overall status is pass or fail
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
      supervisorApproved: undefined, // Freshly submitted, awaiting supervisor response if FAIL
      recheckStatus: overallPass ? undefined : 'PENDING'
    };

    onAddInspection(newLog);
    setSuccessMsg(`تم بنجاح تسجيل فحص الثلاجات بالخط! الرقم التسلسلي: ${serialNumber}`);
    handleResetForm();

    setTimeout(() => {
      setSuccessMsg('');
    }, 5000);
  };

  // Filter inspections performed by this technician
  const myInspections = inspections
    .filter(log => log.inspectorSap === user.sapNumber)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Count summary for simple tech dashboard
  const myPassCount = myInspections.filter(log => log.status === 'PASS').length;
  const myTotalCount = myInspections.length;

  return (
    <div className="min-h-screen bg-neutral-50 text-zinc-800 flex flex-col font-sans" dir="rtl">
      {/* Top Bar Navigation */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-zinc-900">بوابة الفنيين الرقمية</h1>
                <span className="font-mono bg-blue-50 text-blue-600 border border-blue-105 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">
                  مصنع الثلاجات
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">توكيد جودة وتفتيش المنتج النهائي بمجموعة العربي</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-left">
              <span className="text-[10px] text-zinc-400 font-bold block">المستفسر النشط</span>
              <span className="text-xs text-blue-600 font-bold font-sans">{user.name}</span>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded ml-2">
                SAP: {user.sapNumber}
              </span>
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
        
        {/* Subheader and Mini statistics for the current user */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-zinc-900">مرحبًا بك يا {user.name.split(' ')[0]} 👋</h2>
            <p className="text-xs text-zinc-500">يمكنك تسجيل فحوصات الثلاجات الجاهزة والتحقق من توافقها مع معايير جودة توشيبا والعربي الفنية.</p>
          </div>
          
          <div className="flex items-center gap-4 border-r md:border-r border-zinc-100 pr-0 md:pr-6">
            <div className="bg-zinc-50 border border-zinc-200/65 px-4 py-2 rounded-xl text-center min-w-24">
              <span className="text-[10px] text-zinc-500 font-bold block mb-1">إجمالي الفحوصات</span>
              <span className="text-lg font-bold text-zinc-900 font-mono">{myTotalCount}</span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200/65 px-4 py-2 rounded-xl text-center min-w-24">
              <span className="text-[10px] text-emerald-650 font-bold block mb-1">المطابقة (Pass)</span>
              <span className="text-lg font-bold text-emerald-600 font-mono">{myPassCount}</span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200/65 px-4 py-2 rounded-xl text-center min-w-24">
              <span className="text-[10px] text-red-650 font-bold block mb-1">المرفوضة (Fail)</span>
              <span className="text-lg font-bold text-red-600 font-mono">{myTotalCount - myPassCount}</span>
            </div>
          </div>
        </div>

        {/* Tab Switching Menu */}
        <div className="flex border-b border-zinc-200 gap-2">
          <button
            onClick={() => setActiveTab('NEW_CHECK')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'NEW_CHECK'
                ? 'border-blue-600 text-blue-650 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>تسجيل فحص ثلاجة جديدة</span>
          </button>
          <button
            onClick={() => setActiveTab('MY_HISTORY')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              activeTab === 'MY_HISTORY'
                ? 'border-blue-600 text-blue-650 bg-white shadow-sm rounded-t-xl border-t border-x border-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-850'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل فحوصاتي الأخيرة ({myInspections.length})</span>
          </button>
        </div>

        {/* App Status Panel Feedback Alerts */}
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
                <span className="font-bold text-xs block">تم تسجيل التقرير في النظام بنجاح</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">{successMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace Tab Contents */}
        {activeTab === 'NEW_CHECK' ? (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Metadata Inputs */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-full block" />
                    بيانات خط الإنتاج والموديل
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-[10px] text-zinc-400 hover:text-red-600 font-bold transition-all"
                  >
                    تفريغ الاستمارة
                  </button>
                </div>

                {/* Line ID Selector */}
                <div>
                  <label className="block text-xs text-zinc-550 font-bold mb-2">خط الإنتاج الحالي</label>
                  {user.factoryId && user.factoryId !== 'ALL' ? (
                    <div className="w-full bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold font-sans">
                      {PRODUCTION_LINES.find(l => l.id === user.factoryId)?.name || user.factoryId}
                    </div>
                  ) : (
                    <select
                      value={lineId}
                      onChange={(e) => setLineId(e.target.value as ProductionLineId)}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-zinc-800 outline-none transition-all"
                    >
                      {PRODUCTION_LINES.map(line => (
                        <option key={line.id} value={line.id}>
                          {line.name} ({line.supervisorName})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Refrigerator Model Selector */}
                <div>
                  <label className="block text-xs text-zinc-550 font-bold mb-2">موديل الثلاجة المراد فحصها</label>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2.5 text-xs text-zinc-805 outline-none transition-all"
                  >
                    {REFRIGERATOR_MODELS.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - ({model.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refrigerator Serial Number Field */}
                <div>
                  <label className="block text-xs text-zinc-550 font-bold mb-2">الرقم التسلسلي للثلاجة (Barcode / Serial)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="أدخل الرمز أو انقر توليد تلقائي"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                      className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-center font-mono font-bold tracking-wider uppercase text-zinc-900 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleAutoGenerateSerial}
                      className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 px-3 py-2 rounded-xl text-zinc-750 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                      title="توليد رقم سيريال عشوائي للتجربة"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>توليد</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2">
                     * يمكنك مسح الباركود الملصق على هيكل الثلاجة الداخلي أو توليده عشوائيًا للمحاكاة الفورية.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Technical Checklist */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Checklist details card */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-full block" />
                    المواصفات الفنية والفحص البصري للمنتج النهائي
                  </h3>
                  <span className="text-[11px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    فحص تطابق 100%
                  </span>
                </div>

                {/* Standard quality checklist items */}
                <div className="space-y-2.5">
                  {CHECKLIST_ITEMS.map((item, idx) => {
                    const isItemPassed = checklist[item.id] !== false;
                    return (
                      <div 
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                          isItemPassed
                            ? 'bg-zinc-50/50 border-zinc-200 hover:border-zinc-300'
                            : 'bg-red-50/40 border-red-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-zinc-100 text-zinc-650 border border-zinc-200">
                              {item.category === 'exterior' && 'مظهر خارجي'}
                              {item.category === 'cooling' && 'دائرة التبريد'}
                              {item.category === 'electrical' && 'توصيل كهربي'}
                              {item.category === 'safety' && 'أمان عزل'}
                              {item.category === 'accessories' && 'ملحقات وأرفف'}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">#{idx + 1}</span>
                          </div>
                          <h4 className="text-xs font-bold text-zinc-800">{item.label}</h4>
                          <p className="text-[10px] text-zinc-500 leading-relaxed">{item.description}</p>
                        </div>

                        {/* Status Toggle Switcher Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(item.id, true)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              isItemPassed
                                ? 'bg-emerald-50 border-emerald-305 text-emerald-700 shadow-sm'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>مطابق (Pass)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleChecklist(item.id, false)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              !isItemPassed
                                ? 'bg-red-50 border-red-305 text-red-700 shadow-sm'
                                : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                            }`}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>مرفوض (Fail)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submitting defects container - show if any item failed */}
                {selectedDefects.length > 0 && (
                  <div className="bg-red-50/40 border border-red-200/80 rounded-xl p-4.5 space-y-4">
                    <div className="flex items-center gap-2 text-red-700 border-b border-red-200/50 pb-2">
                      <BadgeAlert className="w-4 h-4" />
                      <span className="text-xs font-bold">تسجيل رموز وأعطال المرفوضات (Defect Logging)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {DEFECT_OPTIONS.map((def) => {
                        const isChosen = selectedDefects.includes(def.id);
                        return (
                          <div 
                            key={def.id}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isChosen 
                                ? 'bg-red-50 border-red-300 text-red-800' 
                                : 'bg-zinc-50/60 border-zinc-200 text-zinc-650 hover:border-zinc-300'
                            }`}
                            onClick={() => handleToggleDefect(def.id)}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChosen}
                                onChange={() => {}} // handled by div click
                                className="mt-0.5 rounded border-zinc-300 text-red-600 focus:ring-red-500 shrink-0"
                              />
                              <div className="space-y-1">
                                <span className="text-xs font-bold block leading-snug">{def.label}</span>
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className={`font-bold px-1 py-0.2 rounded ${
                                    def.severity === 'CRITICAL' 
                                      ? 'bg-red-100 text-red-700' 
                                      : def.severity === 'MAJOR' 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-zinc-100 text-zinc-600'
                                  }`}>
                                    {def.severity === 'CRITICAL' ? 'حرج' : def.severity === 'MAJOR' ? 'كبير' : 'بسيط'}
                                  </span>
                                  <span className="text-zinc-400">• {def.category}</span>
                                </div>
                              </div>
                            </div>

                            {isChosen && (
                              <input
                                type="text"
                                placeholder="ملاحظات توضيحية للفني (اختياري)..."
                                value={defectNotes[def.id] || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleDefectDetailsChange(def.id, e.target.value)}
                                className="w-full mt-2 bg-white border border-red-200 text-xs px-2.5 py-1.5 focus:outline-none focus:border-red-550 text-zinc-800 rounded outline-none transition-all"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Action Submit Button */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {Object.values(checklist).every(x => x === true) && selectedDefects.length === 0 ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        المنتج مطابق بنسبة 100% (Pass)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-700 font-bold bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        المنتج مرفوض وبه عيوب مسجلة (Fail)
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-xs font-bold text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span>إرسال تقرير فحص الثلاجة</span>
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>

            </div>
          </form>
        ) : (
          /* Tab Components: MY_HISTORY */
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              سجل فحوصاتي خلال هذه النوبة الفنية
            </h3>

            {myInspections.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl space-y-2">
                <p className="text-xs text-zinc-550">لم تقم بتسجيل أي فحوصات ثلاجات حتى الآن في هذه الجلسة.</p>
                <button
                  onClick={() => setActiveTab('NEW_CHECK')}
                  className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  ابدأ فحص أول ثلاجة الآن
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-550 uppercase tracking-wider text-[10px] font-bold bg-zinc-50">
                      <th className="py-3 px-4">رقم السيريال (Serial)</th>
                      <th className="py-3 px-4">الموديل (Model / Specification)</th>
                      <th className="py-3 px-4">خط التجميع</th>
                      <th className="py-3 px-4">وقت الفحص</th>
                      <th className="py-3 px-4 text-center">حالة الفحص المبكر</th>
                      <th className="py-3 px-4 text-center">قرار المشرف الفني</th>
                      <th className="py-3 px-4">المخالفات المرصودة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {myInspections.map((log) => {
                      const modelObj = REFRIGERATOR_MODELS.find(m => m.id === log.modelId);
                      const lineObj = PRODUCTION_LINES.find(l => l.id === log.lineId);
                      return (
                        <tr key={log.id} className="hover:bg-zinc-50/55 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-zinc-950 tracking-wider">
                            {log.serialNumber}
                          </td>
                          <td className="py-3 px-4 text-zinc-800">
                            {modelObj ? modelObj.name : log.modelId}
                          </td>
                          <td className="py-3 px-4 text-zinc-650 font-bold">
                            {lineObj ? lineObj.name.split(' ')[0] + ' ' + lineObj.name.split(' ')[1] : log.lineId}
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })} ({new Date(log.timestamp).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })})
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              log.status === 'PASS'
                                ? 'bg-emerald-50 border-emerald-250 text-emerald-750'
                                : 'bg-red-50 border-red-250 text-red-750'
                            }`}>
                              {log.status === 'PASS' ? 'مطابق' : 'به عيوب'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.status === 'PASS' ? (
                              <span className="text-zinc-400 text-[11px]">- (معتمد تلقائيًا) -</span>
                            ) : log.recheckStatus === 'APPROVED_AFTER_REPAIR' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-cyan-50 border-cyan-200 text-cyan-700">
                                معتمد بعد الإصلاح
                              </span>
                            ) : log.recheckStatus === 'SCRAPPED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-zinc-100 border-zinc-200 text-zinc-500">
                                تم تخريبه / خردة
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 border-amber-250 text-amber-700 animate-pulse">
                                قيد المعالجة والإصلاح
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-500 font-sans max-w-xs truncate">
                            {log.defects.length === 0 ? (
                              <span className="text-emerald-600 text-[10px] font-bold">• خالي من العيوب</span>
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
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-12 text-center text-zinc-400 text-[11px]">
        <p>© شركة العربي للصناعات الهندسية • نظام توكيد الجودة المتنقل</p>
        <p className="mt-1">يتم مزامنة كافة الفحوصات مباشرة مع قواعد بيانات ساب المركزية وقسم تدقيق المشرفين.</p>
      </footer>
    </div>
  );
}
