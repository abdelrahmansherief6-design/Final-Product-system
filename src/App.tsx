/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog, UserRole, ManagedUser, RefrigeratorModel, NCRReport } from './types';
import { generateSeedData, REFRIGERATOR_MODELS } from './data';
import Login from './components/Login';
import TechnicianWorkspace from './components/TechnicianWorkspace';
import SupervisorWorkspace from './components/SupervisorWorkspace';
import ManagerWorkspace from './components/ManagerWorkspace';

export default function App() {
  // 1. Session Persistence state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Users directory state with default credentials
  const [users, setUsers] = useState<ManagedUser[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_users_list');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    const defaultUsers: ManagedUser[] = [
      { sapNumber: '40016452', name: 'عبد الرحمن شريف (مالك الموقع)', role: 'MANAGER', factoryId: 'ALL' },
      { sapNumber: '12345678', name: 'المدير العام', role: 'MANAGER', factoryId: 'ALL' },
      { sapNumber: '20114059', name: 'أحمد الشناوي', role: 'TECHNICIAN', factoryId: 'LINE_A' },
      { sapNumber: '30114059', name: 'م. هاني العشري', role: 'SUPERVISOR', factoryId: 'LINE_A' },
      { sapNumber: '20114092', name: 'محمود عبد السلام', role: 'TECHNICIAN', factoryId: 'LINE_B' },
      { sapNumber: '30114092', name: 'م. سعيد عبد الجواد', role: 'SUPERVISOR', factoryId: 'LINE_B' },
      { sapNumber: '20115011', name: 'مصطفى البحيري', role: 'TECHNICIAN', factoryId: 'LINE_C' },
      { sapNumber: '30115011', name: 'م. أشرف رسلان', role: 'SUPERVISOR', factoryId: 'LINE_C' },
      { sapNumber: '50114000', name: 'م. ممدوح الشريف', role: 'MANAGER', factoryId: 'ALL' }
    ];
    localStorage.setItem('elaraby_qa_users_list', JSON.stringify(defaultUsers));
    return defaultUsers;
  });

  // Refrigerator Models state with default catalog
  const [models, setModels] = useState<RefrigeratorModel[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_models_list');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    localStorage.setItem('elaraby_qa_models_list', JSON.stringify(REFRIGERATOR_MODELS));
    return REFRIGERATOR_MODELS;
  });

  // Keep localStorage sync'd
  useEffect(() => {
    localStorage.setItem('elaraby_qa_models_list', JSON.stringify(models));
  }, [models]);

  // 2. Hydrate Inspections and Process Audits state with LocalStorage or seed data
  const [inspections, setInspections] = useState<QualityInspectionLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_inspections');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse inspections from localStorage', e);
    }
    // No prior storage, generate rich weekly historical seed data!
    const seed = generateSeedData();
    localStorage.setItem('elaraby_qa_inspections', JSON.stringify(seed.inspections));
    localStorage.setItem('elaraby_qa_process_audits', JSON.stringify(seed.audits));
    return seed.inspections;
  });

  const [processAudits, setProcessAudits] = useState<ProcessAuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_process_audits');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse process audits from localStorage', e);
    }
    // Seed is generated above concurrently
    return [];
  });

  // Shared NCRs state
  const [ncrs, setNcrs] = useState<NCRReport[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_ncrs');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'NCR-1',
        lineId: 'LINE_A',
        shift: 'الاولى',
        date: '2026-07-13',
        time: '10:30',
        barcode: 'AR-A-450L-9284',
        modelId: 'MOD_450L',
        defectType: 'MAJOR_DEFECT',
        description: 'انكماش مادة الحقن العازل بجوانب الكابينة الخلفية',
        specification: 'سمك العزل لا يقل عن 40 مم وتوزيع منتظم للرغوة بجميع الزوايا',
        deviation: 'انكماش موضعي بسمك 25 مم بطول 15 سم بالجهة الخلفية اليسرى',
        rootCause: 'خلل مؤقت بنسبة خلط مادة البولي يوريثان البوليول والايزوسيانات مع انخفاض حرارة الحاقن',
        actionRequired: 'تعديل ومعايرة صمامات ماكينة الحقن الروتيني وضبط حرارة القالب الحاضن',
        severity: 'MAJOR',
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        qcOpinion: 'تم فحص الماكينات وضبط المعايرة فوراً مع التوصية بمتابعة قياس الحرارة كل ساعتين',
        productionOpinion: 'تم استلام التوجيهات وتعديل ضبط الماكينة ومتابعة الانتاج لضمان الجودة',
        finalDecision: 'اعتماد تشغيل الخط ومراقبة أول 10 ثلاجات بالكامل للتأكد من زوال الانكماش',
        decisionMaker: 'م. هاني العشري'
      }
    ];
  });

  const [activePrintNcr, setActivePrintNcr] = useState<NCRReport | null>(null);

  const handlePrintNCR = (ncr: NCRReport) => {
    setActivePrintNcr(ncr);
  };

  useEffect(() => {
    if (activePrintNcr) {
      const timer = setTimeout(() => {
        window.print();
        setActivePrintNcr(null);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activePrintNcr]);

  // Keep localStorage sync'd
  useEffect(() => {
    localStorage.setItem('elaraby_qa_inspections', JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_process_audits', JSON.stringify(processAudits));
  }, [processAudits]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_ncrs', JSON.stringify(ncrs));
  }, [ncrs]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('elaraby_qa_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('elaraby_qa_current_user');
    }
  }, [currentUser]);

  // Auth Operations
  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Inspections Operations
  const handleAddInspection = (log: QualityInspectionLog) => {
    setInspections((prev) => [log, ...prev]);
  };

  const handleDeleteInspection = (id: string) => {
    setInspections((prev) => prev.filter((log) => log.id !== id));
  };

  const handleUpdateInspection = (id: string, updates: Partial<QualityInspectionLog>) => {
    setInspections((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );
  };

  // Process Audits Operations
  const handleAddProcessAudit = (audit: ProcessAuditLog) => {
    setProcessAudits((prev) => [audit, ...prev]);
  };

  return (
    <div className="bg-neutral-50 min-h-screen text-zinc-800 selection:bg-red-500 selection:text-white antialiased">
      {currentUser === null ? (
        <Login onLogin={handleLogin} users={users} />
      ) : currentUser.role === 'TECHNICIAN' ? (
        <TechnicianWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          onAddInspection={handleAddInspection}
          onDeleteInspection={handleDeleteInspection}
          models={models}
          ncrs={ncrs}
          onUpdateNcrs={setNcrs}
          onPrintNCR={handlePrintNCR}
        />
      ) : currentUser.role === 'SUPERVISOR' ? (
        <SupervisorWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          onUpdateInspection={handleUpdateInspection}
          processAudits={processAudits}
          onAddProcessAudit={handleAddProcessAudit}
          models={models}
          ncrs={ncrs}
          onUpdateNcrs={setNcrs}
          onPrintNCR={handlePrintNCR}
        />
      ) : (
        <ManagerWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          processAudits={processAudits}
          users={users}
          onUpdateUsers={setUsers}
          models={models}
          onUpdateModels={setModels}
          ncrs={ncrs}
          onUpdateNcrs={setNcrs}
          onPrintNCR={handlePrintNCR}
        />
      )}

      {/* Print Area Section */}
      {activePrintNcr && (
        <div id="ncr-print-section" className="hidden print:block w-full text-black bg-white p-6 font-sans select-none" style={{ direction: 'rtl' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background-color: #fff !important;
                color: #000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: 'Inter', system-ui, sans-serif !important;
                direction: rtl !important;
              }
              #root > :not(#ncr-print-section) {
                display: none !important;
              }
              #ncr-print-section {
                display: block !important;
                width: 100% !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                background: white !important;
                box-sizing: border-box !important;
              }
            }
          `}} />
          
          {/* Outer Border */}
          <div className="border-4 border-sky-700 p-4 rounded-xl space-y-4" style={{ minHeight: '290mm' }}>
            
            {/* Header Grid */}
            <div className="grid grid-cols-3 items-center border-b-2 border-sky-700 pb-3 text-right">
              {/* Right Column */}
              <div className="space-y-1">
                <h2 className="text-sm font-extrabold text-sky-800">شركة العربي للصناعات الهندسية</h2>
                <p className="text-xs font-bold text-zinc-700">مصانع : الثلاجات</p>
              </div>
              
              {/* Center Column */}
              <div className="text-center space-y-1">
                <h1 className="text-xl font-black text-sky-900 tracking-wider">التغذيه العكسيه</h1>
                <h1 className="text-lg font-extrabold text-sky-800 tracking-widest font-mono">Feed BACK</h1>
              </div>
              
              {/* Left Column */}
              <div className="text-left space-y-1">
                <p className="text-xs font-bold text-zinc-700">نشاط : توكيد الجودة</p>
                <p className="text-xs font-bold text-zinc-700">الإدارة : توكيد جودة المنتج النهائي</p>
              </div>
            </div>

            {/* Subheader Metadata Row */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold bg-zinc-50 border border-zinc-200 py-2 rounded-lg">
              <div>
                <span className="text-zinc-500">الوردية: </span>
                <span className="text-black font-extrabold text-sm">{activePrintNcr.shift}</span>
              </div>
              <div>
                <span className="text-zinc-500">التاريخ: </span>
                <span className="text-black font-extrabold text-sm font-mono">{activePrintNcr.date}</span>
              </div>
              <div>
                <span className="text-zinc-500">الساعة: </span>
                <span className="text-black font-extrabold text-sm font-mono">{activePrintNcr.time}</span>
              </div>
            </div>

            {/* Inspections Table */}
            <div className="border border-sky-700 rounded-lg overflow-hidden">
              <div className="bg-sky-600 text-white text-center py-1 text-xs font-extrabold border-b border-sky-700">
                عملية الفحص
              </div>
              
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-sky-100 border-b border-sky-700 text-sky-900 font-extrabold">
                    <th className="border-r border-sky-700 py-1.5 w-[35%]">باركود الثلاجة</th>
                    <th className="border-r border-sky-700 py-1.5 w-[20%]">موديل الثلاجة</th>
                    <th className="border-r border-sky-700 py-1.5 w-[15%]">إختبار اداء</th>
                    <th className="border-r border-sky-700 py-1.5 w-[15%]">عمليات حرجة</th>
                    <th className="py-1.5 w-[15%]">عينات عشوائية</th>
                  </tr>
                  <tr className="bg-sky-50 border-b border-sky-700 text-[10px] text-zinc-700 font-bold">
                    <th className="border-r border-sky-700 py-1" colSpan={2}></th>
                    <th className="border-r border-sky-700 py-1" colSpan={2}></th>
                    <th className="py-1">
                      <div className="flex justify-around">
                        <span className="px-1 text-center w-full">عيب حرج</span>
                        <span className="px-1 text-center w-full border-r border-l border-sky-100">عيب رئيسي</span>
                        <span className="px-1 text-center w-full">عيب ثانوي</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold">
                    <td className="border-r border-sky-700 py-3 font-mono text-sm px-2 break-all">{activePrintNcr.barcode || '-'}</td>
                    <td className="border-r border-sky-700 py-3 px-1">{models.find(m => m.id === activePrintNcr.modelId)?.name || activePrintNcr.modelId}</td>
                    <td className="border-r border-sky-700 py-3 text-lg text-sky-800 font-black">
                      {activePrintNcr.defectType === 'PERFORMANCE_TEST' ? '✓' : ''}
                    </td>
                    <td className="border-r border-sky-700 py-3 text-lg text-sky-800 font-black">
                      {activePrintNcr.defectType === 'CRITICAL_OP' ? '✓' : ''}
                    </td>
                    <td className="py-3 border-sky-700 text-lg text-sky-800 font-black">
                      <div className="flex justify-around items-center">
                        <span className="w-full text-center">{activePrintNcr.defectType === 'CRITICAL_DEFECT' ? '✓' : ''}</span>
                        <span className="w-full text-center border-r border-l border-sky-100">{activePrintNcr.defectType === 'MAJOR_DEFECT' ? '✓' : ''}</span>
                        <span className="w-full text-center">{activePrintNcr.defectType === 'MINOR_DEFECT' ? '✓' : ''}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Feedback Details Rows */}
            <div className="space-y-4 pt-2">
              
              {/* وصف العيب Row */}
              <div className="flex border border-sky-700 rounded-lg overflow-hidden min-h-[4rem]">
                <div className="w-[15%] bg-sky-600 text-white font-extrabold flex items-center justify-center text-center p-2 border-l border-sky-700 text-xs">
                  وصف العيب
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.description}
                </div>
              </div>

              {/* المواصفة Row */}
              <div className="flex border border-sky-700 rounded-lg overflow-hidden min-h-[3rem]">
                <div className="w-[15%] bg-sky-600 text-white font-extrabold flex items-center justify-center text-center p-2 border-l border-sky-700 text-xs">
                  المواصفة
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.specification || '-'}
                </div>
              </div>

              {/* الحيود Row */}
              <div className="flex border border-sky-700 rounded-lg overflow-hidden min-h-[3rem]">
                <div className="w-[15%] bg-sky-600 text-white font-extrabold flex items-center justify-center text-center p-2 border-l border-sky-700 text-xs">
                  الحيود
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.deviation || '-'}
                </div>
              </div>

              {/* السبب الجذري Row */}
              <div className="flex border border-sky-700 rounded-lg overflow-hidden min-h-[4rem]">
                <div className="w-[15%] bg-sky-600 text-white font-extrabold flex items-center justify-center text-center p-2 border-l border-sky-700 text-xs">
                  السبب الجذري
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.rootCause || '-'}
                </div>
              </div>

              {/* الإجراء المتخذ Row */}
              <div className="flex border border-sky-700 rounded-lg overflow-hidden min-h-[4rem]">
                <div className="w-[15%] bg-sky-600 text-white font-extrabold flex items-center justify-center text-center p-2 border-l border-sky-700 text-xs">
                  الإجراء المتخذ
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.actionRequired}
                </div>
              </div>

              {/* رأي مراقبة الجودة */}
              <div className="flex border border-zinc-400 rounded-lg overflow-hidden min-h-[3.5rem]">
                <div className="w-[15%] bg-zinc-200 text-zinc-800 font-extrabold flex items-center justify-center text-center p-2 border-l border-zinc-300 text-xs">
                  رأي مراقبة الجودة
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.qcOpinion || '____________________________________________________________________'}
                </div>
              </div>

              {/* رأي القسم الإنتاجي */}
              <div className="flex border border-zinc-400 rounded-lg overflow-hidden min-h-[3.5rem]">
                <div className="w-[15%] bg-zinc-200 text-zinc-800 font-extrabold flex items-center justify-center text-center p-2 border-l border-zinc-300 text-xs">
                  رأي القسم الإنتاجي
                </div>
                <div className="w-[85%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                  {activePrintNcr.productionOpinion || '____________________________________________________________________'}
                </div>
              </div>

              {/* القرار النهائي والمسؤول */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex border border-zinc-400 rounded-lg overflow-hidden min-h-[3.5rem]">
                  <div className="w-[30%] bg-zinc-200 text-zinc-800 font-extrabold flex items-center justify-center text-center p-2 border-l border-zinc-300 text-xs">
                    القرار النهائي
                  </div>
                  <div className="w-[70%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                    {activePrintNcr.finalDecision || '______________________________'}
                  </div>
                </div>

                <div className="flex border border-zinc-400 rounded-lg overflow-hidden min-h-[3.5rem]">
                  <div className="w-[30%] bg-zinc-200 text-zinc-800 font-extrabold flex items-center justify-center text-center p-2 border-l border-zinc-300 text-xs">
                    المسؤول عن القرار
                  </div>
                  <div className="w-[70%] p-3 text-xs font-bold leading-relaxed bg-white text-zinc-800">
                    {activePrintNcr.decisionMaker || '______________________________'}
                  </div>
                </div>
              </div>

            </div>

            {/* Signature Footer Boxes */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs font-extrabold">
              <div className="space-y-4 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                <p className="text-sky-800">القسم الانتاجي</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-zinc-400">التوقيع: ___________________</p>
              </div>
              <div className="space-y-4 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                <p className="text-sky-800">مراقبة الجودة</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-zinc-400">التوقيع: ___________________</p>
              </div>
              <div className="space-y-4 border border-zinc-300 rounded-lg p-3 bg-zinc-50">
                <p className="text-sky-800">توكيد الجودة</p>
                <div className="h-8"></div>
                <p className="text-[10px] text-zinc-400">التوقيع: ___________________</p>
              </div>
            </div>

            {/* Footer info bar */}
            <div className="border-t border-sky-700 pt-3 text-[10px] font-bold text-zinc-500 flex justify-between items-center px-1">
              <span>كود النموذج: FRQ-QG-02</span>
              <span>تاريخ الإصدار: 25/02/2024</span>
              <span>رقم الإصدار: 1</span>
              <span>كود الوثيقة الحاكمة: WRQ-QG-01</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
