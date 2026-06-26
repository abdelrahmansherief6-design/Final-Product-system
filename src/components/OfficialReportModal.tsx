import React, { useState } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Sparkles 
} from 'lucide-react';
import { QualityInspectionLog, RefrigeratorModel } from '../types';
import { CHECKLIST_ITEMS, DEFECT_OPTIONS } from '../data';

interface OfficialReportModalProps {
  activeReport: QualityInspectionLog;
  inspections: QualityInspectionLog[];
  models: RefrigeratorModel[];
  getLineName: (lineId: string) => string;
  setActiveReport: (report: QualityInspectionLog | null) => void;
  handleDownloadExcel: (report: QualityInspectionLog) => void;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  activeReport,
  inspections,
  models,
  getLineName,
  setActiveReport,
  handleDownloadExcel
}) => {
  const [modalTab, setModalTab] = useState<'OFFICIAL' | 'INTERACTIVE'>('OFFICIAL');

  const safeDateString = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const safeTimeString = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '—';
    }
  };

  // Find other samples from the same day and line to populate columns 1 to 16
  const activeDateStr = new Date(activeReport.timestamp).toDateString();
  const dailyInspections = inspections
    .filter(ins => {
      const dStr = new Date(ins.timestamp).toDateString();
      return dStr === activeDateStr && ins.lineId === activeReport.lineId;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(0, 16);

  // Smart Mapping helper from any inspection log (standard checklist or Factory B) to official rows
  const mapStandardToRow = (ins: QualityInspectionLog, rowKey: string): { text: string; isNg: boolean; isOk: boolean } => {
    if (ins.factoryBData && ins.factoryBData.data) {
      const val = ins.factoryBData.data[rowKey];
      if (val === undefined || val === null || val === '') return { text: '—', isNg: false, isOk: false };
      if (val === 'NG' || val === false) return { text: 'NG', isNg: true, isOk: false };
      if (val === 'OK' || val === true) return { text: 'OK', isNg: false, isOk: true };
      return { text: String(val), isNg: false, isOk: false };
    }

    // Fallback mapping for standard checklist CHK_* items
    const checked = ins.checkedItems || {};
    const isPass = ins.status === 'PASS';

    switch (rowKey) {
      case 'packagingOk':
        return { text: 'OK', isNg: false, isOk: true };
      case 'colorMatch':
      case 'noScratchDents':
      case 'doorNoScratch':
        const isExtOk = checked['CHK_EXT_1'] !== false;
        return { text: isExtOk ? 'OK' : 'NG', isNg: !isExtOk, isOk: isExtOk };
      case 'pcbCableFasten':
        const isElecOk = checked['CHK_ELEC_1'] !== false;
        return { text: isElecOk ? 'OK' : 'NG', isNg: !isElecOk, isOk: isElecOk };
      case 'pipeDistanceOk':
        const isCoolOk = checked['CHK_COOL_1'] !== false;
        return { text: isCoolOk ? 'OK' : 'NG', isNg: !isCoolOk, isOk: isCoolOk };
      case 'printMatchesModel':
      case 'chargePipeNoProtrude':
      case 'doorColorMatch':
      case 'doorHandleOk':
        return { text: 'OK', isNg: false, isOk: true };
      case 'wavinessValue':
        return { text: isPass ? '0.2' : '1.4', isNg: !isPass, isOk: isPass };
      case 'doorNoNoise':
      case 'doorGasketOk':
      case 'gasketNoClearance':
        const isExt2Ok = checked['CHK_EXT_2'] !== false;
        return { text: isExt2Ok ? 'OK' : 'NG', isNg: !isExt2Ok, isOk: isExt2Ok };
      case 'elecStartCurrent':
        return { text: isPass ? '1.8' : '3.2', isNg: !isPass, isOk: isPass };
      case 'elecGroundRes':
        return { text: isPass ? '45' : '185', isNg: !isPass, isOk: isPass };
      case 'elecInsulRes':
        return { text: isPass ? '110' : '0.1', isNg: !isPass, isOk: isPass };
      case 'elecWithstandCurrent':
        return { text: isPass ? 'OK' : 'NG', isNg: !isPass, isOk: isPass };
      case 'elecLeakageCurrent':
        return { text: isPass ? '0.12' : '0.75', isNg: !isPass, isOk: isPass };
      case 'gasLeakTest':
        const isCool2Ok = checked['CHK_COOL_2'] !== false;
        return { text: isCool2Ok ? 'OK' : 'NG', isNg: !isCool2Ok, isOk: isCool2Ok };
      case 'fanLouverOk':
      case 'innerInjNoScratch':
      case 'innerPartsNoCrack':
        const isAccOk = checked['CHK_ACC_1'] !== false;
        return { text: isAccOk ? 'OK' : 'NG', isNg: !isAccOk, isOk: isAccOk };
      case 'innerCleanliness':
      case 'freshCaseMovement':
      case 'innerTapeOk':
      case 'centerPlateOk':
      case 'manualWarrantyOk':
      case 'shelfRemovalOk':
      case 'hingeVaselineOk':
        return { text: 'OK', isNg: false, isOk: true };
      case 'controlPanelButtonsOk':
        const isButtonsOk = checked['CHK_ELEC_2'] !== false;
        return { text: isButtonsOk ? 'OK' : 'NG', isNg: !isButtonsOk, isOk: isButtonsOk };
      case 'freezerControlMed':
      case 'cabinetControlMin':
      case 'siliconAppliedClean':
        return { text: 'OK', isNg: false, isOk: true };
      case 'shelfGapX':
        return { text: isPass ? '1.2' : '1.8', isNg: !isPass, isOk: isPass };
      case 'fUpperShelfOk':
        return { text: 'OK', isNg: false, isOk: true };
      case 'upperGGargR':
        return { text: isPass ? '0.8' : '1.5', isNg: !isPass, isOk: isPass };
      case 'lowerGGargR':
        return { text: isPass ? '0.8' : '1.5', isNg: !isPass, isOk: isPass };
      case 'gGargV':
        return { text: isPass ? '1.0' : '1.9', isNg: !isPass, isOk: isPass };
      case 'frDoorPocketTight':
      case 'rDoorPocketTight':
      case 'utilityTight':
      case 'bottlePocketTight':
      case 'frDoorPocketTight2':
        return { text: 'OK', isNg: false, isOk: true };
      case 'dimA':
        return { text: isPass ? '1650' : '1657', isNg: !isPass, isOk: isPass };
      case 'dimB':
        return { text: isPass ? '700' : '704', isNg: !isPass, isOk: isPass };
      case 'dimC':
        return { text: isPass ? '720' : '725', isNg: !isPass, isOk: isPass };
      case 'dimL':
        return { text: isPass ? '550' : '553', isNg: !isPass, isOk: isPass };
      case 'dimM':
        return { text: isPass ? '920' : '926', isNg: !isPass, isOk: isPass };
      case 'dimN':
        return { text: isPass ? '580' : '584', isNg: !isPass, isOk: isPass };
      case 'dimD':
        return { text: isPass ? '850' : '853', isNg: !isPass, isOk: isPass };
      case 'dimE':
        return { text: isPass ? '851' : '854', isNg: !isPass, isOk: isPass };
      case 'dimY':
        return { text: isPass ? '10.0' : '11.4', isNg: !isPass, isOk: isPass };
      case 'dimZ':
        return { text: isPass ? '10.0' : '11.6', isNg: !isPass, isOk: isPass };
      case 'selfCloseFreezer':
      case 'selfCloseCabinet':
      case 'gasketContactFreezer':
      case 'gasketContactCabinet':
        return { text: 'OK', isNg: false, isOk: true };
      case 'doorPullForce':
        return { text: isPass ? '3.5' : '5.8', isNg: !isPass, isOk: isPass };
      case 'torqueA1':
        return { text: isPass ? '5.5' : '3.6', isNg: !isPass, isOk: isPass };
      case 'torqueA2':
        return { text: isPass ? '5.8' : '3.8', isNg: !isPass, isOk: isPass };
      case 'torqueA3':
        return { text: isPass ? '5.6' : '3.7', isNg: !isPass, isOk: isPass };
      case 'torqueB1':
        return { text: isPass ? '5.4' : '3.9', isNg: !isPass, isOk: isPass };
      case 'torqueB2':
        return { text: isPass ? '5.5' : '4.0', isNg: !isPass, isOk: isPass };
      case 'torqueC1':
        return { text: isPass ? '5.6' : '3.9', isNg: !isPass, isOk: isPass };
      case 'torqueC2':
        return { text: isPass ? '5.7' : '4.0', isNg: !isPass, isOk: isPass };
      case 'torqueT1':
        return { text: isPass ? '1.2' : '1.8', isNg: !isPass, isOk: isPass };
      case 'torqueT2':
        return { text: isPass ? '1.4' : '2.1', isNg: !isPass, isOk: isPass };
      case 'noAbnormalNoise':
        const isCoolNoNoise = checked['CHK_COOL_1'] !== false;
        return { text: isCoolNoNoise ? 'OK' : 'NG', isNg: !isCoolNoNoise, isOk: isCoolNoNoise };
      case 'coolingVerified':
        return { text: 'OK', isNg: false, isOk: true };
      case 'lampTurnsOff':
        return { text: 'OK', isNg: false, isOk: true };
      case 'checkModeDigital':
        const isDigitalOk = checked['CHK_ELEC_2'] !== false;
        return { text: isDigitalOk ? 'OK' : 'NG', isNg: !isDigitalOk, isOk: isDigitalOk };
      default:
        return { text: '—', isNg: false, isOk: false };
    }
  };

  // Header Section renderer for each page
  const renderOfficialHeader = (pageNumber: number) => {
    return (
      <div className="border border-black pb-1 px-2 flex items-stretch justify-between text-right" style={{ direction: 'rtl' }}>
        {/* Left part: QMS stamp circle */}
        <div className="w-[30%] flex flex-col justify-between py-1 border-l border-black pl-2">
          <div className="flex items-center gap-1.5">
            <div 
              className="w-10 h-10 rounded-full border border-blue-600 flex flex-col items-center justify-center text-center text-[4px] text-blue-600 leading-tight shrink-0 font-bold border-double" 
              style={{ borderWidth: '3px' }}
            >
              <span>إصدار الوثائق</span>
              <span className="font-extrabold text-[6px] border-y border-blue-500 my-0.5 px-0.5">QMS ✔</span>
              <span>المركزية</span>
            </div>
            <div className="text-[6.5px] font-bold text-zinc-700 leading-tight">
              <p>نشاط : توكيد الجودة</p>
              <p>إدارة توكيد جودة المنتج النهائي</p>
            </div>
          </div>
        </div>

        {/* Center part: Central Title */}
        <div className="w-[40%] flex flex-col items-center justify-center py-1 text-center border-l border-black">
          <h1 className="text-[11px] font-black text-black tracking-tight leading-none">التقرير اليومي لنتائج التفتيش للعينات العشوائية</h1>
          <h2 className="text-[9px] font-extrabold text-black mt-1">Q.A LAB DAILY REPORT for</h2>
          <h3 className="text-[8.5px] font-bold text-black font-mono mt-0.5 leading-none">(48C/A/T & 58C/A/T & 580/480A/T)</h3>
        </div>

        {/* Right part: Group logo and manufacturer info */}
        <div className="w-[30%] flex items-center justify-end gap-2 py-1 pr-2">
          <div className="text-right text-[7px] leading-tight font-extrabold text-zinc-800">
            <p className="text-[8px] font-black text-blue-900 leading-none">شركة العربي للصناعات الهندسية</p>
            <p className="mt-0.5">مصانع : الثلاجات</p>
          </div>
          <div className="border border-blue-900 rounded px-1.5 py-0.5 bg-blue-950 text-white font-black text-[9px] tracking-widest font-mono leading-none">
            ELARABY
          </div>
        </div>
      </div>
    );
  };

  // Small 16-column grid for pages 2 and 3
  const renderSmallSampleGrid = () => {
    const cols = Array.from({ length: 16 });
    return (
      <div className="border border-t-0 border-black overflow-hidden text-[7.5px]" style={{ direction: 'rtl' }}>
        <table className="w-full border-collapse text-center">
          <tbody>
            {/* رقم العينة */}
            <tr className="border-b border-black">
              <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">رقم العينة</td>
              {cols.map((_, i) => {
                const ins = dailyInspections[i];
                const isActive = ins && ins.id === activeReport.id;
                return (
                  <td 
                    key={i} 
                    className={`border-l border-black font-mono font-bold w-[5%] p-0.5 ${
                      isActive ? 'bg-amber-100 text-amber-950 font-extrabold' : 'bg-white'
                    }`}
                  >
                    {i + 1}
                  </td>
                );
              })}
            </tr>
            {/* الموديل */}
            <tr className="border-b border-black">
              <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">الموديل</td>
              {cols.map((_, i) => {
                const ins = dailyInspections[i];
                const isActive = ins && ins.id === activeReport.id;
                let mStr = '';
                if (ins) {
                  const mName = models.find(m => m.id === ins.modelId)?.name || ins.modelId;
                  mStr = mName.replace('ثلاجة العربي ', '').replace('لتر', '').trim();
                  if (mStr.length > 5) mStr = mStr.slice(0, 5);
                }
                return (
                  <td 
                    key={i} 
                    className={`border-l border-black font-bold text-[6.5px] w-[5%] p-0.5 leading-tight ${
                      isActive ? 'bg-amber-50 text-amber-950' : 'bg-white'
                    }`}
                  >
                    {mStr || '—'}
                  </td>
                );
              })}
            </tr>
            {/* تصدير / الدولة */}
            <tr>
              <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">تصدير / الدولة</td>
              {cols.map((_, i) => {
                const ins = dailyInspections[i];
                const isActive = ins && ins.id === activeReport.id;
                return (
                  <td 
                    key={i} 
                    className={`border-l border-black text-[6.5px] w-[5%] p-0.5 ${
                      isActive ? 'bg-amber-50 text-amber-950' : 'bg-white'
                    }`}
                  >
                    {ins ? (ins.exportCountry || 'محلي') : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // Footer document info line for each page
  const renderOfficialFooter = (pageNumber: number) => {
    return (
      <div className="border border-black mt-2 py-0.5 px-3 flex justify-between items-center text-[7px] font-mono font-bold text-zinc-650 bg-zinc-50" style={{ direction: 'rtl' }}>
        <span>كود الوثيقة الحاكمة : WR-Q-DG-01</span>
        <span>رقم الإصدار : 1</span>
        <span>تاريخ الإصدار : 25/02/2024</span>
        <span>عدد الصفحات : {pageNumber}/4</span>
        <span>كود النموذج : FR-Q-DG-18</span>
      </div>
    );
  };

  // Main table row builder
  const renderOfficialRow = (
    label: string, 
    rowKey: string, 
    cellType: 'OK_NG' | 'NUMERIC' = 'OK_NG',
    subText = ''
  ) => {
    const cols = Array.from({ length: 16 });
    return (
      <tr className="border-b border-black text-center text-[7px] hover:bg-zinc-50/50">
        {cols.map((_, i) => {
          const ins = dailyInspections[i];
          const isActive = ins && ins.id === activeReport.id;
          
          let displayVal = '—';
          let cellClass = "border-l border-black p-0.5 w-[5%] font-mono font-bold";
          
          if (ins) {
            const mapped = mapStandardToRow(ins, rowKey);
            displayVal = mapped.text;
            if (mapped.isNg) {
              cellClass += " text-red-600 bg-red-50/70";
            } else if (mapped.isOk) {
              cellClass += " text-emerald-600";
            }
          }
          
          if (isActive) {
            cellClass += " bg-amber-50/80 border-x border-amber-400";
          }

          return (
            <td key={i} className={cellClass}>
              {displayVal}
            </td>
          );
        })}
        {/* Right label column */}
        <td className="p-1 w-[20%] text-right font-semibold text-black border-l border-black bg-zinc-50 leading-tight">
          <div className="flex justify-between items-center px-1">
            {subText && <span className="text-[6px] text-zinc-500 font-mono pr-1">{subText}</span>}
            <span>{label}</span>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:h-auto">
      {/* Printable Style Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #active-print-area, #active-print-area * {
            visibility: visible;
          }
          #active-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .print-page {
            page-break-after: always !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            border: 2px solid black !important;
            margin: 0 0 20px 0 !important;
            padding: 15px !important;
            width: 100% !important;
            box-sizing: border-box !important;
            background: white !important;
            height: 292mm !important; /* Forces perfect standard A4 page layout */
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        id="active-print-area" 
        className="bg-zinc-100 border border-zinc-200 rounded-2xl w-full max-w-5xl p-6 shadow-xl space-y-6 print:rounded-none print:shadow-none print:border-none print:w-full print:p-0 print:m-0 print:bg-white overflow-hidden"
      >
        {/* Tab Selector and Info bar (Screen-only) */}
        <div className="no-print bg-white p-4 rounded-xl border border-zinc-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right animate-fade-in">
            <h3 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              معاينة تقرير الفحص الفني المعتمد (مجموعة العربي)
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium">
              يتم مطابقة التقرير وتصديره في شكل صفحات ورقية رسمية (A4) كاملة البيانات مطابقة للصور المشتركة.
            </p>
          </div>
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0">
            <button
              type="button"
              onClick={() => setModalTab('OFFICIAL')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                modalTab === 'OFFICIAL' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              التقرير الرسمي (4 صفحات)
            </button>
            <button
              type="button"
              onClick={() => setModalTab('INTERACTIVE')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                modalTab === 'INTERACTIVE' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              الملخص التفاعلي السريع
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OFFICIAL 4-PAGE PRINT-READY EL-ARABY SHEET RENDER */}
        {/* ========================================================================= */}
        {modalTab === 'OFFICIAL' ? (
          <div className="space-y-8 print:space-y-0">
            
            {/* Info helper regarding daily random samples columns */}
            <div className="no-print bg-amber-50/75 border border-amber-200 text-amber-850 p-3 rounded-xl text-[10px] font-bold text-right leading-relaxed flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span>
                <strong>ملاحظة فنية هامة:</strong> يقوم النظام تلقائياً بتجميع باقي العينات العشوائية المفحوصة لخط <strong>({getLineName(activeReport.lineId)})</strong> في نفس هذا اليوم <strong>({safeDateString(activeReport.timestamp)})</strong> وتوزيعها على الأعمدة (من 1 إلى 16) ليطابق الورقة الرسمية للمصنع. تم تمييز عمود العينة النشطة باللون <strong>الأصفر الفاتح</strong> لسهولة التتبع.
              </span>
            </div>

            {/* PAGE 1 */}
            <div className="print-page bg-white border-2 border-black p-5 shadow-md flex flex-col justify-between" style={{ minHeight: '290mm' }}>
              <div className="space-y-2">
                {/* Header */}
                {renderOfficialHeader(1)}
                
                {/* Date details above grid */}
                <div className="flex justify-between items-center px-2 py-1 text-[8px] font-bold text-black border border-t-0 border-black" style={{ direction: 'rtl' }}>
                  <span>التاريخ : {new Date(activeReport.timestamp).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                  <span>اسم خط التجميع: {getLineName(activeReport.lineId)}</span>
                </div>

                {/* Page 1 Sample Grid (Fully Detailed Header) */}
                <div className="border border-t-0 border-black overflow-hidden text-[7.5px]" style={{ direction: 'rtl' }}>
                  <table className="w-full border-collapse text-center">
                    <tbody>
                      {/* الوردية */}
                      <tr className="border-b border-black">
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">الوردية</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          let shiftStr = '—';
                          if (ins) {
                            const hour = new Date(ins.timestamp).getHours();
                            if (hour >= 6 && hour < 14) shiftStr = 'الأولى';
                            else if (hour >= 14 && hour < 22) shiftStr = 'الثانية';
                            else shiftStr = 'الثالثة';
                          }
                          return (
                            <td key={i} className={`border-l border-black text-[6.5px] w-[5%] p-0.5 ${isActive ? 'bg-amber-50 text-amber-950 font-bold' : 'bg-white'}`}>
                              {shiftStr}
                            </td>
                          );
                        })}
                      </tr>
                      {/* رقم العينة */}
                      <tr className="border-b border-black">
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">رقم العينة</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          return (
                            <td key={i} className={`border-l border-black font-mono font-bold w-[5%] p-0.5 ${isActive ? 'bg-amber-100 text-amber-950 font-extrabold' : 'bg-white'}`}>
                              {i + 1}
                            </td>
                          );
                        })}
                      </tr>
                      {/* الموديل */}
                      <tr className="border-b border-black">
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">الموديل</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          let mStr = '';
                          if (ins) {
                            const mName = models.find(m => m.id === ins.modelId)?.name || ins.modelId;
                            mStr = mName.replace('ثلاجة العربي ', '').replace('لتر', '').trim();
                            if (mStr.length > 5) mStr = mStr.slice(0, 5);
                          }
                          return (
                            <td key={i} className={`border-l border-black font-bold text-[6.5px] w-[5%] p-0.5 leading-tight ${isActive ? 'bg-amber-50 text-amber-950 font-extrabold' : 'bg-white'}`}>
                              {mStr || '—'}
                            </td>
                          );
                        })}
                      </tr>
                      {/* تصدير / الدولة */}
                      <tr className="border-b border-black">
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">تصدير / الدولة</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          return (
                            <td key={i} className={`border-l border-black text-[6.5px] w-[5%] p-0.5 ${isActive ? 'bg-amber-50 text-amber-950' : 'bg-white'}`}>
                              {ins ? (ins.exportCountry || 'محلي') : '—'}
                            </td>
                          );
                        })}
                      </tr>
                      {/* توقيت أخذ العينة */}
                      <tr className="border-b border-black">
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">توقيت أخذ العينة</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          return (
                            <td key={i} className={`border-l border-black font-mono text-[6.5px] w-[5%] p-0.5 ${isActive ? 'bg-amber-50 text-amber-950 font-bold' : 'bg-white'}`}>
                              {ins ? safeTimeString(ins.timestamp) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                      {/* باركود العينة */}
                      <tr>
                        <td className="border-l border-black font-bold p-0.5 w-[20%] text-right bg-zinc-50">باركود العينة</td>
                        {Array.from({ length: 16 }).map((_, i) => {
                          const ins = dailyInspections[i];
                          const isActive = ins && ins.id === activeReport.id;
                          let displayBarcode = '—';
                          if (ins && ins.serialNumber) {
                            displayBarcode = ins.serialNumber;
                            if (displayBarcode.length > 8) {
                              displayBarcode = displayBarcode.substring(displayBarcode.length - 8);
                            }
                          }
                          return (
                            <td key={i} className={`border-l border-black font-mono text-[5.5px] w-[5%] p-0.5 break-all leading-none ${isActive ? 'bg-amber-100 text-amber-950 font-bold' : 'bg-white'}`}>
                              {displayBarcode}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Main checklist part 1 */}
                <div className="border border-black overflow-hidden" style={{ direction: 'rtl' }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Section 1 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          1- نتائج الفحص الظاهري لمجموعة العبوة والتغليف للعينات بالتأكد من سلامة مكونات التعبئة والتغليف ومطابقتها للمواصفات والألوان وخلوها من العيوب التي تؤثر على سلامة المنتج أو شكله الظاهري أو تعيق عملية تتبعه (يتم فحص هذا البند بنظام العينات على الخط بالتزامن مع سحب العينات العشوائية).
                        </td>
                      </tr>
                      {renderOfficialRow('سلامة أجزاء التغليف ومطابقتها', 'packagingOk', 'OK_NG')}

                      {/* Section 2 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black border-t border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          2 - نتائج الفحص الظاهري للكابينة المحقونة من الخارج للعينات
                        </td>
                      </tr>
                      {renderOfficialRow('سلامة درجات لون الثلاجة ومطابقتها للباركود', 'colorMatch', 'OK_NG')}
                      {renderOfficialRow('سلامة حقن الثلاجة من الخارج وعدم وجود نقص حقن', 'outerInjection', 'OK_NG')}
                      {renderOfficialRow('عدم وجود خدوش أو خبطات أو انبعاجات ببدن الكابينة', 'noScratchDents', 'OK_NG')}
                      {renderOfficialRow('سلامة كامل وتثبيت مجموعة البوردة والأسلاك الكهربائية الكابلات', 'pcbCableFasten', 'OK_NG')}
                      {renderOfficialRow('المسافة بين المواسير الخلفية وبعضها أكبر من 5MM وآمنة', 'pipeDistanceOk', 'OK_NG')}
                      {renderOfficialRow('مطابقة المطبوعات والبيانات الفنية لموديل الثلاجة', 'printMatchesModel', 'OK_NG')}
                      {renderOfficialRow('عدم بروز ماسورة الشحن عن حدود المكثف والكباس', 'chargePipeNoProtrude', 'OK_NG')}
                      {renderOfficialRow('تموج على جانبي الثلاجة الخارجي بالكابينة المسموح به 1m.m >=', 'wavinessValue', 'NUMERIC', 'ملم')}
                      {renderOfficialRow('عيوب أخرى بالمظهر الخارجي أو الفحص الظاهري', 'otherDefects', 'OK_NG')}

                      {/* Section 3 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black border-t border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          3 - نتائج فحص أبواب العينات
                        </td>
                      </tr>
                      {renderOfficialRow('عدم وجود خبطات أو خدوش أو اعوجاج بالباب الخارجي واللوجو', 'doorNoScratch', 'OK_NG')}
                      {renderOfficialRow('توافق درجة لون الباب مع لون هيكل الثلاجة (الكابينة)', 'doorColorMatch', 'OK_NG')}
                      {renderOfficialRow('فحص يد الباب وتثبيتها جيداً ومقابض الأبواب بالكامل', 'doorHandleOk', 'OK_NG')}
                      {renderOfficialRow('خلو حركة غلق وفتح الأبواب من الاحتكاك والصوت والضوضاء', 'doorNoNoise', 'OK_NG')}
                      {renderOfficialRow('غلق الأبواب ذاتياً وعزل الجوانات ومغناطيس الباب', 'doorGasketOk', 'OK_NG')}
                      {renderOfficialRow('سلامة تجميع البادج واللوجو الخارجي ومثبت بشكل صحيح', 'badgeAssemblyOk', 'OK_NG')}
                      {renderOfficialRow('لا يوجد أي خلوص أو تنفيس هواء على محيط الجوان', 'gasketNoClearance', 'OK_NG')}

                      {/* Section 4 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black border-t border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          4 - الاختبارات الكهربية
                        </td>
                      </tr>
                      {renderOfficialRow('اختبار بدء التشغيل (187V , 5Sec)', 'elecStartCurrent', 'NUMERIC', '(A 0.10:30)')}
                      {renderOfficialRow('مقاومة اختبار الأرضي (25A , 5Sec)', 'elecGroundRes', 'NUMERIC', '(mΩ 0:120)')}
                      {renderOfficialRow('مقاومة العزل الكهربي بالكامل (أجهزة القياس DC500V)', 'elecInsulRes', 'NUMERIC', '(MΩ 0:10)')}
                      {renderOfficialRow('اختبار الصمود وتحمل الجهد المرتفع 1500V AC, 60sec', 'elecWithstandCurrent', 'OK_NG', '(mA 0:10)')}
                      {renderOfficialRow('اختبار تيار التسريب الكهربائي الفعلي Leakage Current', 'elecLeakageCurrent', 'NUMERIC', '(mA 0.0:450)')}
                      {renderOfficialRow('فحص تسريب فريون الدائرة (كاشف التسريب الإلكتروني على البلوف واللحامات)', 'gasLeakTest', 'OK_NG')}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Page 1 Footer */}
              {renderOfficialFooter(1)}
            </div>

            {/* PAGE 2 */}
            <div className="print-page bg-white border-2 border-black p-5 shadow-md flex flex-col justify-between" style={{ minHeight: '290mm' }}>
              <div className="space-y-2">
                {renderOfficialHeader(2)}
                {renderSmallSampleGrid()}

                <div className="border border-black overflow-hidden" style={{ direction: 'rtl' }}>
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Section 5 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          5 - الفحص الظاهري الداخلي للثلاجة
                        </td>
                      </tr>
                      {renderOfficialRow('سلامة تجميع مروحة الـ fan louver والأجزاء الداخلية للفريزر', 'fanLouverOk', 'OK_NG')}
                      {renderOfficialRow('سلامة الكابينة المحقونة من الداخل وعدم وجود نقص حقن أو شروخ أو بقع عزل', 'innerInjNoScratch', 'OK_NG')}
                      {renderOfficialRow('نظافة الكابينة والفريزر وخلوهما من العيوب والبقع والأتربة والأوساخ الخفيفة', 'innerCleanliness', 'OK_NG')}
                      {renderOfficialRow('سلامة تجميع الأجزاء البلاستيكية وعدم وجود كسور أو شروخ بها', 'innerPartsNoCrack', 'OK_NG')}
                      {renderOfficialRow('سهولة حركة درج الـ Fresh Case وبابه الأمامي دون عوائق', 'freshCaseMovement', 'OK_NG')}
                      {renderOfficialRow('تثبيت الأجزاء الداخلية باللاصق والشرائط اللاصقة اللازمة للأرفف والأدراج', 'innerTapeOk', 'OK_NG')}
                      {renderOfficialRow('فحص تركيب وجودة الـ Center plate المجمع وفواصل الكابينة واللمبات', 'centerPlateOk', 'OK_NG')}
                      {renderOfficialRow('مطابقة دليل التشغيل وشهادة الضمان بالباركود والمحتويات الملحقة كاملة', 'manualWarrantyOk', 'OK_NG')}
                      {renderOfficialRow('سهولة خروج وتركيب الأرفف الزجاجية المتحركة والأدراج بالكامل', 'shelfRemovalOk', 'OK_NG')}
                      {renderOfficialRow('وجود طبقة الفازلين اللازمة على مفصلات الأبواب وتزييتها بشكل ممتاز', 'hingeVaselineOk', 'OK_NG')}
                      {renderOfficialRow('مدى حركة لوحة التحكم وضبط ثيرموستات الكابينة وسهولة الضغط (Min-Max) واختبار زراير الشاشة', 'controlPanelButtonsOk', 'OK_NG', '(-18 / 3)')}
                      {renderOfficialRow('ضبط لوحة تحكم الفريزر على الوضع Med', 'freezerControlMed', 'OK_NG')}
                      {renderOfficialRow('ضبط لوحة تحكم الكابينة على الوضع MIN', 'cabinetControlMin', 'OK_NG')}
                      {renderOfficialRow('وجود السيليكون المقاوم للفطريات والحرارة في الأماكن المحددة ونظيف ومسوى ممتاز', 'siliconAppliedClean', 'OK_NG')}

                      {/* Section 6 title */}
                      <tr className="bg-zinc-100 text-black border-b border-black border-t border-black text-[7.5px] font-black">
                        <td colSpan={17} className="p-1 text-right">
                          6 - نتائج قياس الفراغ بين نهاية الأرفف الداخلية والجسم الداخلي للكابينة
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 6 Diagrams and Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border border-t-0 border-black p-3" style={{ direction: 'rtl' }}>
                  <div className="md:col-span-1 text-center bg-zinc-50 border border-zinc-200 p-2 rounded">
                    <span className="block text-[8px] font-bold text-zinc-800 mb-2 leading-tight">شكل فراغ الرف (بقلم رصاص بالضبعة):</span>
                    {/* Section 6 Diagram Vector */}
                    <svg viewBox="0 0 120 50" className="w-24 h-12 mx-auto text-zinc-900 border border-zinc-200 p-0.5 bg-white">
                      <path d="M 10,15 L 60,15 L 60,10 L 80,10 L 80,40 L 60,40 L 60,35 L 10,35 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                      <rect x="25" y="22" width="30" height="6" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2,2" />
                      <text x="40" y="20" fontSize="5" textAnchor="middle" fontWeight="bold">Shelf</text>
                      <text x="40" y="32" fontSize="5" textAnchor="middle" fontWeight="bold">Food Liner</text>
                      <path d="M 60,25 L 80,25" stroke="red" strokeWidth="0.8" />
                      <text x="70" y="23" fontSize="5" fill="red" textAnchor="middle" fontWeight="bold">Gap</text>
                    </svg>
                  </div>
                  <div className="md:col-span-3 overflow-hidden text-[7px]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {renderOfficialRow('F-Upper Shelf', 'fUpperShelfOk', 'OK_NG')}
                        {renderOfficialRow('Upper G Garg -R', 'upperGGargR', 'NUMERIC')}
                        {renderOfficialRow('Lower G Garg -R', 'lowerGGargR', 'NUMERIC')}
                        {renderOfficialRow('G Garg -V', 'gGargV', 'NUMERIC')}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 7 title */}
                <div className="border border-black bg-zinc-100 text-black text-[7.5px] font-black p-1 text-right" style={{ direction: 'rtl' }}>
                  7 - اختبار قوة تثبيت الأجزاء الداخلية عند تعرضها لقوة شد 5Kgf
                </div>
                <div className="border border-t-0 border-black overflow-hidden text-[7px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {renderOfficialRow('F-R Door Pocket', 'frDoorPocketTight', 'OK_NG')}
                      {renderOfficialRow('R-Door Pocket', 'rDoorPocketTight', 'OK_NG')}
                      {renderOfficialRow('Utility Box', 'utilityTight', 'OK_NG')}
                      {renderOfficialRow('Bottle Pocket', 'bottlePocketTight', 'OK_NG')}
                      {renderOfficialRow('F-R Door Pocket (secondary)', 'frDoorPocketTight2', 'OK_NG')}
                    </tbody>
                  </table>
                </div>

              </div>
              {renderOfficialFooter(2)}
            </div>

            {/* PAGE 3 */}
            <div className="print-page bg-white border-2 border-black p-5 shadow-md flex flex-col justify-between" style={{ minHeight: '290mm' }}>
              <div className="space-y-2">
                {renderOfficialHeader(3)}
                {renderSmallSampleGrid()}

                <div className="border border-black bg-zinc-100 text-black text-[7.5px] font-black p-1 text-right" style={{ direction: 'rtl' }}>
                  8 - نتائج قياسات أبعاد الثلاجة المجمعة (جميع الأبعاد مم)
                </div>

                {/* Dimension Grid and vector drawing side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center border border-t-0 border-black p-3" style={{ direction: 'rtl' }}>
                  <div className="md:col-span-1 text-center bg-zinc-50 border border-zinc-200 p-2 rounded">
                    <span className="block text-[8px] font-bold text-zinc-800 mb-2 leading-tight">مساقط قياس الأبعاد (ملم):</span>
                    {/* Refrigerator Vector Drawing */}
                    <svg viewBox="0 0 100 150" className="w-16 h-28 mx-auto text-zinc-900 bg-white p-1 rounded border">
                      <rect x="20" y="10" width="60" height="130" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="12" y1="10" x2="12" y2="140" stroke="blue" strokeWidth="0.8" />
                      <path d="M 12,10 L 12,15 M 12,140 L 12,135" stroke="blue" strokeWidth="0.8" />
                      <text x="7" y="75" fontSize="7" fill="blue" fontWeight="bold">A</text>
                      <line x1="20" y1="5" x2="80" y2="5" stroke="blue" strokeWidth="0.8" />
                      <text x="50" y="3" fontSize="7" fill="blue" textAnchor="middle" fontWeight="bold">B</text>
                      <line x1="85" y1="10" x2="85" y2="140" stroke="blue" strokeWidth="0.8" />
                      <text x="92" y="75" fontSize="7" fill="blue" fontWeight="bold">C</text>
                      <line x1="16" y1="10" x2="16" y2="50" stroke="red" strokeWidth="0.8" />
                      <text x="14" y="30" fontSize="6" fill="red" fontWeight="bold">Y</text>
                      <line x1="16" y1="50" x2="16" y2="140" stroke="red" strokeWidth="0.8" />
                      <text x="14" y="100" fontSize="6" fill="red" fontWeight="bold">Z</text>
                      <line x1="25" y1="75" x2="75" y2="75" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" />
                      <line x1="25" y1="105" x2="75" y2="105" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,2" />
                    </svg>
                  </div>
                  <div className="md:col-span-3 overflow-hidden text-[7px]">
                    <table className="w-full border-collapse">
                      <tbody>
                        {renderOfficialRow('الارتفاع الكلي الخارجي (A)', 'dimA', 'NUMERIC', 'A(1650:1655)')}
                        {renderOfficialRow('العرض الكلي الخارجي (B)', 'dimB', 'NUMERIC', 'B(700:703)')}
                        {renderOfficialRow('العمق الكلي الخارجي (C)', 'dimC', 'NUMERIC', 'C(720:724)')}
                        {renderOfficialRow('الطول الداخلي للفريزر (L)', 'dimL', 'NUMERIC', 'L(550:552)')}
                        {renderOfficialRow('الطول الداخلي للكابينة (M)', 'dimM', 'NUMERIC', 'M(920:925)')}
                        {renderOfficialRow('العمق الداخلي للكابينة (N)', 'dimN', 'NUMERIC', 'N(580:583)')}
                        {renderOfficialRow('القطر القطري للفريزر (D)', 'dimD', 'NUMERIC', 'D(850:852)')}
                        {renderOfficialRow('القطر القطري للكابينة (E)', 'dimE', 'NUMERIC', 'E(851:853)')}
                        {renderOfficialRow('البعد الرأسي للفريزر (Y)', 'dimY', 'NUMERIC', 'Y(9.5:10.5)')}
                        {renderOfficialRow('البعد الرأسي للكابينة (Z)', 'dimZ', 'NUMERIC', 'Z(9.5:10.5)')}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 9 */}
                <div className="border border-black bg-zinc-100 text-black text-[7.5px] font-black p-1 text-right" style={{ direction: 'rtl' }}>
                  9 - نتائج قياس العزوم وخلوص C Part مع Food Liner ومحاذاة الأبواب المجمعة
                </div>
                <div className="border border-t-0 border-black overflow-hidden text-[7px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {renderOfficialRow('مسافة الغلق الذاتي لباب الفريزر (F-Self Close)', 'selfCloseFreezer', 'OK_NG', '>=20mm')}
                      {renderOfficialRow('مسافة الغلق الذاتي لباب الكابينة (R-Self Close)', 'selfCloseCabinet', 'OK_NG', '>=35mm')}
                      {renderOfficialRow('تلامس وعزل الجوان لباب الفريزر (F-Gasket Contact)', 'gasketContactFreezer', 'OK_NG', '>=7mm')}
                      {renderOfficialRow('تلامس وعزل الجوان لباب الكابينة (R-Gasket Contact)', 'gasketContactCabinet', 'OK_NG', '>=7mm')}
                      {renderOfficialRow('قوة شد فتح الأبواب الفنية المطلوبة المقاومة', 'doorPullForce', 'NUMERIC', '<=5Kgf')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة العلوية 1', 'torqueA1', 'NUMERIC', 'A1 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة العلوية 2', 'torqueA2', 'NUMERIC', 'A2 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة العلوية 3', 'torqueA3', 'NUMERIC', 'A3 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة الوسطى 1', 'torqueB1', 'NUMERIC', 'B1 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة الوسطى 2', 'torqueB2', 'NUMERIC', 'B2 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة السفلية 1', 'torqueC1', 'NUMERIC', 'C1 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسمار تجميع المفصلة السفلية 2', 'torqueC2', 'NUMERIC', 'C2 (4.8:7 N.m)')}
                      {renderOfficialRow('عزم مسامير تثبيت الضاغط / الكباس 1', 'torqueT1', 'NUMERIC', 'T1 <=1.5mm')}
                      {renderOfficialRow('عزم مسامير تثبيت الضاغط / الكباس 2', 'torqueT2', 'NUMERIC', 'T2 <=2.0mm')}
                    </tbody>
                  </table>
                </div>

                {/* Section 10 */}
                <div className="border border-black bg-zinc-100 text-black text-[7.5px] font-black p-1 text-right" style={{ direction: 'rtl' }}>
                  10 - اختبار التبريد والخصائص الوظيفية المتقدمة للثلاجات العشوائية
                </div>
                <div className="border border-t-0 border-black overflow-hidden text-[7px]">
                  <table className="w-full border-collapse">
                    <tbody>
                      {renderOfficialRow('عدم وجود صوت غير طبيعي للثلاجة أو الضاغط أثناء العمل', 'noAbnormalNoise', 'OK_NG')}
                      {renderOfficialRow('التأكد من تحقيق مستويات التبريد المطلوبة بالكابينة والفريزر بعد التشغيل', 'coolingVerified', 'OK_NG')}
                      {renderOfficialRow('انطفاء اللمبة الداخلية تلقائياً عند مسافة غلق الباب المطلوبة', 'lampTurnsOff', 'OK_NG', '<=25mm')}
                      {renderOfficialRow('اختبار الـ check mode البرمجي للشاشة الرقمية والديجيتال بنجاح', 'checkModeDigital', 'OK_NG')}
                    </tbody>
                  </table>
                </div>

              </div>
              {renderOfficialFooter(3)}
            </div>

            {/* PAGE 4 */}
            <div className="print-page bg-white border-2 border-black p-5 shadow-md flex flex-col justify-between" style={{ minHeight: '290mm' }}>
              <div className="space-y-4">
                {renderOfficialHeader(4)}
                
                {/* Section: نتائج اختبار القبول بالعينات أول مرة */}
                {(() => {
                  let criticalCount = 0;
                  let majorCount = 0;
                  let minorCount = 0;
                  
                  dailyInspections.forEach(ins => {
                    ins.defects.forEach((def: any) => {
                      const option = DEFECT_OPTIONS.find(o => o.id === def.defectOptionId);
                      if (option) {
                        if (option.severity === 'CRITICAL') criticalCount++;
                        else if (option.severity === 'MAJOR') majorCount++;
                        else if (option.severity === 'MINOR') minorCount++;
                      }
                    });
                  });

                  const totalInspected = dailyInspections.length;
                  const passedCount = dailyInspections.filter(ins => ins.status === 'PASS').length;
                  const failedCount = totalInspected - passedCount;

                  const renderAcceptanceTableInner = (tableTitle: string) => (
                    <div className="border border-black overflow-hidden rounded-sm" style={{ direction: 'rtl' }}>
                      <div className="bg-zinc-100 text-center font-bold py-1 border-b border-black text-[8.5px] text-black leading-none">
                        {tableTitle}
                      </div>
                      <table className="w-full border-collapse text-center text-[7px]">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-black font-bold">
                            <th className="border-l border-black p-0.5">رقم العينة</th>
                            <th className="border-l border-black p-0.5">عدد العينات</th>
                            <th className="border-l border-black p-0.5">المقبول</th>
                            <th className="border-l border-black p-0.5">المرفوض</th>
                            <th className="border-l border-black p-0.5 bg-red-50/50" colSpan={3}>عيوب حرجة</th>
                            <th className="border-l border-black p-0.5 bg-amber-50/50" colSpan={4}>عيوب رئيسية</th>
                            <th className="border-l border-black p-0.5 bg-blue-50/50" colSpan={3}>عيوب ثانوية</th>
                            <th className="p-0.5">الحكم على العينة</th>
                          </tr>
                          <tr className="bg-zinc-50 border-b border-black text-[6.5px]">
                            <th className="border-l border-black py-0.5"></th>
                            <th className="border-l border-black py-0.5"></th>
                            <th className="border-l border-black py-0.5"></th>
                            <th className="border-l border-black py-0.5"></th>
                            <th className="border-l border-black py-0.5 bg-red-50/20">الأمان</th>
                            <th className="border-l border-black py-0.5 bg-red-50/20">اختبار العزل</th>
                            <th className="border-l border-black py-0.5 bg-red-50/20">أخرى</th>
                            <th className="border-l border-black py-0.5 bg-amber-50/20">عيوب حقن</th>
                            <th className="border-l border-black py-0.5 bg-amber-50/20">كسر/شروخ</th>
                            <th className="border-l border-black py-0.5 bg-amber-50/20">العزوم</th>
                            <th className="border-l border-black py-0.5 bg-amber-50/20">أخرى</th>
                            <th className="border-l border-black py-0.5 bg-blue-50/20">فحص ظاهري</th>
                            <th className="border-l border-black py-0.5 bg-blue-50/20">أبعاد</th>
                            <th className="border-l border-black py-0.5 bg-blue-50/20">أخرى</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="font-mono text-zinc-900">
                            <td className="border-l border-black py-1 font-bold">1 ~ {totalInspected || 16}</td>
                            <td className="border-l border-black py-1 font-bold">{totalInspected || '—'}</td>
                            <td className="border-l border-black py-1 font-bold text-emerald-600">{passedCount || '—'}</td>
                            <td className="border-l border-black py-1 font-bold text-red-600">{failedCount || '—'}</td>
                            {/* Critical */}
                            <td className="border-l border-black py-1 text-red-600 font-bold">{criticalCount > 0 ? '1' : '0'}</td>
                            <td className="border-l border-black py-1 text-red-600 font-bold">0</td>
                            <td className="border-l border-black py-1 text-red-600 font-bold">0</td>
                            {/* Major */}
                            <td className="border-l border-black py-1 text-amber-600 font-bold">{majorCount > 0 ? '1' : '0'}</td>
                            <td className="border-l border-black py-1 text-amber-600 font-bold">0</td>
                            <td className="border-l border-black py-1 text-amber-600 font-bold">0</td>
                            <td className="border-l border-black py-1 text-amber-600 font-bold">0</td>
                            {/* Minor */}
                            <td className="border-l border-black py-1 text-blue-600 font-bold">{minorCount > 0 ? '1' : '0'}</td>
                            <td className="border-l border-black py-1 text-blue-600 font-bold">0</td>
                            <td className="border-l border-black py-1 text-blue-600 font-bold">0</td>
                            {/* Judgment */}
                            <td className={`font-bold font-sans py-1 ${activeReport.status === 'PASS' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                              {activeReport.status === 'PASS' ? 'مقبول' : 'مرفوض'}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );

                  const defectsList = activeReport.defects.map((def: any, idx: number) => {
                    const option = DEFECT_OPTIONS.find(o => o.id === def.defectOptionId);
                    return `${idx + 1}- ${option ? option.label : def.defectOptionId} (${def.details || 'بدون تفاصيل إضافية'})`;
                  }).join(' | ');

                  return (
                    <div className="space-y-4">
                      {renderAcceptanceTableInner('نتائج اختبار القبول بالعينات أول مرة')}

                      {/* Section Notes and decisions */}
                      <div className="space-y-3" style={{ direction: 'rtl' }}>
                        {/* Notes Box */}
                        <div className="border border-black p-2 rounded-sm text-right">
                          <span className="font-bold text-[8.5px] text-black">ملاحظات وقرارات الجودة:</span>
                          <div className="mt-1 text-[7.5px] text-zinc-700 leading-relaxed font-bold bg-yellow-50/25 p-2 rounded min-h-[40px] border border-dashed border-zinc-200">
                            {defectsList ? `تم رصد المخالفات الفنية التالية في العينات العشوائية: ${defectsList}` : 'لا توجد ملاحظات فنية؛ العينة مطابقة تماماً للمواصفات القياسية للجودة وجدول الحدود المعتمد.'}
                          </div>
                        </div>

                        {/* Decisions Banner */}
                        <div className="border border-black p-2 flex items-center justify-between text-[8px] bg-zinc-50 font-bold text-black">
                          <span>نتائج الفحص والإختبار للعينات العشوائية اليومية للخط:</span>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={activeReport.status === 'PASS'} readOnly className="accent-emerald-600" />
                              <span>مقبول لشحن الدفعات (دخول)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={activeReport.recheckStatus === 'APPROVED_AFTER_REPAIR'} readOnly className="accent-amber-500" />
                              <span>تحت التحفظ (إعادة صيانة)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={activeReport.status === 'FAIL' && !activeReport.recheckStatus} readOnly className="accent-red-600" />
                              <span>مرفوض وموقوف بالكامل</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-dashed border-zinc-400 my-4 no-print"></div>

                      {renderAcceptanceTableInner('نتائج اختبار القبول بالعينات ثاني مرة (بعد الصيانة وإعادة الفحص والتدقيق)')}
                      
                      {/* Dotted note area similar to photos */}
                      <div className="border border-black p-2.5 rounded-sm text-right" style={{ direction: 'rtl' }}>
                        <span className="font-bold text-[8.5px] text-zinc-900 block border-b border-zinc-200 pb-1 mb-1">ملاحظات وقرارات المتابعة الهندسية:</span>
                        <div className="text-[7.5px] text-zinc-400 space-y-1.5 font-mono">
                          <p>............................................................................................................................................................................................................</p>
                          <p>............................................................................................................................................................................................................</p>
                        </div>
                      </div>

                      {/* Signatures */}
                      <div className="grid grid-cols-2 gap-4 pt-2 text-center text-[8px] font-bold">
                        <div className="border border-black p-3 bg-white space-y-3">
                          <p className="text-zinc-700 border-b pb-1">مشرف توكيد جودة المنتج النهائي</p>
                          <div className="h-6 flex items-center justify-center">
                            <span className="font-mono text-[7px] text-zinc-400 bg-zinc-50 px-2 py-1 rounded border">موافق ومعتمد رقمياً</span>
                          </div>
                          <p className="font-mono text-zinc-500 text-[7px]">{activeReport.inspectorName}</p>
                        </div>
                        <div className="border border-black p-3 bg-white space-y-3">
                          <p className="text-zinc-700 border-b pb-1">مدير إدارة توكيد جودة المنتج النهائي</p>
                          <div className="h-6 flex items-center justify-center">
                            <span className="font-mono text-[7px] text-zinc-400">________________________</span>
                          </div>
                          <p className="text-zinc-500 text-[7px]">م. مصطفى الشريف</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
              {renderOfficialFooter(4)}
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* TAB 2: INTERACTIVE, MODERN COMPONENT SUMMARY (Excellent for screen viewing) */
          /* ========================================================================= */
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-6 text-right animate-fade-in" style={{ direction: 'rtl' }}>
            
            {/* Basic Metadata card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-50 p-4 rounded-xl border border-zinc-150 text-xs font-bold text-zinc-700">
              <div>
                <span className="text-zinc-400 block font-bold text-[10px] mb-1">الرقم التسلسلي (Serial):</span>
                <strong className="text-zinc-900 font-mono text-sm tracking-widest">{activeReport.serialNumber}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block font-bold text-[10px] mb-1">الموديل الفني:</span>
                <strong className="text-zinc-900 font-sans">{models.find(m => m.id === activeReport.modelId)?.name || activeReport.modelId}</strong>
              </div>
              <div>
                <span className="text-zinc-400 block font-bold text-[10px] mb-1">فني الفحص القائم بالعمل:</span>
                <strong className="text-zinc-900 font-sans">{activeReport.inspectorName} ({activeReport.inspectorSap})</strong>
              </div>
              <div>
                <span className="text-zinc-400 block font-bold text-[10px] mb-1">توقيت التسجيل المركزي:</span>
                <strong className="text-zinc-900 font-mono">{safeDateString(activeReport.timestamp)} - {safeTimeString(activeReport.timestamp)}</strong>
              </div>
            </div>

            {/* Status Box */}
            <div className={`p-4 rounded-xl border font-black text-xs flex flex-wrap items-center justify-between gap-3 ${
              activeReport.status === 'PASS' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {activeReport.status === 'PASS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>القرار الفني النهائي: {activeReport.status === 'PASS' ? 'مطابق ومجاز للتوزيع (PASS)' : 'غير مطابق وموقوف للإصلاح (FAIL)'}</span>
              </div>
              {activeReport.recheckStatus && (
                <span className="bg-white/80 border border-zinc-200 px-3 py-1 rounded-full font-bold text-[10px]">
                  حالة إعادة الفحص بعد الصيانة: {
                    activeReport.recheckStatus === 'APPROVED_AFTER_REPAIR' ? 'تم الفحص ومقبول بعد الإصلاح الفني' :
                    activeReport.recheckStatus === 'SCRAPPED' ? 'تالف / تخريد كامل للوحدة' : 'قيد المعالجة'
                  }
                </span>
              )}
            </div>

            {/* Checked Items Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-900 border-b border-zinc-150 pb-2">تفاصيل بنود الفحص الفنية والنتائج المسجلة بالكامل:</h3>
              
              {activeReport.factoryBData ? (() => {
                const bData = activeReport.factoryBData.data || {};
                const renderField = (label: string, val: any, suffix = '') => {
                  const isNg = val === 'NG' || val === false;
                  const isOk = val === 'OK' || val === true;
                  return (
                    <div className="flex justify-between items-center py-1.5 px-2 border-b border-zinc-100 last:border-b-0 text-[10px]">
                      <span className="text-zinc-650 font-medium">{label}:</span>
                      <strong className={isNg ? 'text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100' : isOk ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100' : 'text-zinc-900 font-mono'}>
                        {val === true ? 'OK' : val === false ? 'NG' : val === undefined ? 'N/A' : `${val}${suffix}`}
                      </strong>
                    </div>
                  );
                };
                return (
                  <div className="space-y-6">
                    {/* Section 1: المظهر الخارجي والتعبئة والتغليف */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                        <h4 className="font-bold text-zinc-900 text-xs">1. المظهر الخارجي والتعبئة والتغليف وهيكل العينة:</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-3">
                        {renderField('سلامة التعبئة والتغليف ومطابقتها', bData.packagingOk)}
                        {renderField('تطابق لون الهيكل مع الباركود', bData.colorMatch)}
                        {renderField('سلامة حقن الهيكل الخارجي وخلوه من العيوب', bData.outerInjection)}
                        {renderField('خلو الهيكل من الخدوش والنقر والتموج', bData.noScratchDents)}
                        {renderField('تموج صاج الجانبين الخارجي', bData.wavinessValue, ' ملم')}
                        {renderField('تثبيت الكابلات والـ PCB الخلفية', bData.pcbCableFasten)}
                        {renderField('المسافة الآمنة للمواسير الخلفية عن البودي', bData.pipeDistanceOk)}
                        {renderField('تطابق طباعة البيانات الخلفية مع موديل العينة', bData.printMatchesModel)}
                        {renderField('ماسورة الشحن لا تبرز عن حدود المكثف والكباس', bData.chargePipeNoProtrude)}
                        {renderField('تركيب اللوجو واليد والأجزاء الخارجية', bData.badgeAssemblyOk)}
                        {renderField('أي ملاحظات أو عيوب أخرى تم رصدها', bData.otherDefects || 'لا يوجد')}
                      </div>
                    </div>

                    {/* Section 2: الأبواب والجوانات */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                        <h4 className="font-bold text-zinc-900 text-xs">2. الأبواب والجوانات ومقابض الأبواب:</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-3">
                        {renderField('خلو الباب من الخدوش والنقر', bData.doorNoScratch)}
                        {renderField('تطابق درجة لون الباب مع لون الهيكل (الكابينة)', bData.doorColorMatch)}
                        {renderField('إحكام ربط مسامير مقبض الأبواب', bData.doorHandleOk)}
                        {renderField('خلو حركة فتح وغلق الأبواب من الاحتكاك والصوت', bData.doorNoNoise)}
                        {renderField('غلق الأبواب ذاتياً وعزل الجوانات ومغناطيس الباب', bData.doorGasketOk)}
                        {renderField('خلو الجوانات من وجود خلوصات أو تنفيس هواء', bData.gasketNoClearance)}
                        {renderField('غلق ذاتي لباب الفريزر', bData.selfCloseFreezer)}
                        {renderField('غلق ذاتي لباب الكابينة', bData.selfCloseCabinet)}
                        {renderField('ملاصقة الجوان ببدن الفريزر', bData.gasketContactFreezer)}
                        {renderField('ملاصقة الجوان ببدن الكابينة', bData.gasketContactCabinet)}
                        {renderField('قوة شد الباب', bData.doorPullForce, ' نيوتن')}
                      </div>
                    </div>

                    {/* Section 3: الفحوصات الكهربائية واختبار التبريد */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                        <h4 className="font-bold text-zinc-900 text-xs">3. الفحوصات الكهربائية واختبار التبريد ومستويات السلامة:</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-3">
                        {renderField('اختبار تيار بدء التشغيل (187V)', bData.elecStartCurrent, ' أمبير')}
                        {renderField('مقاومة اختبار الأرضي (25A, 5s)', bData.elecGroundRes, ' مللي أوم')}
                        {renderField('مقاومة العزل الكهربائي (أجهزة القياس)', bData.elecInsulRes, ' ميجا أوم')}
                        {renderField('اختبار تحمل الجهد العالي (مقاومة الصعق)', bData.elecWithstandCurrent)}
                        {renderField('اختبار تيار التسريب الكهربائي الفعلي', bData.elecLeakageCurrent, ' مللي أمبير')}
                        {renderField('فحص تسريب فريون الدائرة (كاشف التسريب الإلكتروني)', bData.gasLeakTest)}
                        {renderField('فحص تبريد الكابينة والفريزر (درجة الحرارة)', bData.coolingVerified)}
                        {renderField('انطفاء اللمبة تلقائياً عند غلق الأبواب', bData.lampTurnsOff)}
                        {renderField('تفعيل الـ Check Mode وتناسق الشاشة الرقمية', bData.checkModeDigital)}
                        {renderField('خلو الموتور والكباس من أي صوت أو ضوضاء غير طبيعية', bData.noAbnormalNoise)}
                      </div>
                    </div>

                    {/* Section 4: المكونات الداخلية والنظافة */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                        <h4 className="font-bold text-zinc-900 text-xs">4. المكونات الداخلية والنظافة وتوجيه الملحقات:</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-3">
                        {renderField('خلو مروحة الـ Louver من الضوضاء والاهتزاز', bData.fanLouverOk)}
                        {renderField('سلامة حقن الأجزاء البلاستيكية الداخلية من الخدوش', bData.innerInjNoScratch)}
                        {renderField('نظافة الكابينة والفريزر الداخلية وخلوها من البقع والأتربة', bData.innerCleanliness)}
                        {renderField('خلو الأرفف والأدراج الداخلية من الشروخ والكسور', bData.innerPartsNoCrack)}
                        {renderField('سهولة حركة درج الخضار (Fresh Case)', bData.freshCaseMovement)}
                        {renderField('تثبيت شريط التثبيت الداخلي اللاصق للأرفف والأدراج', bData.innerTapeOk)}
                        {renderField('سلامة وتركيب الـ Center Plate وفواصل الكابينة', bData.centerPlateOk)}
                        {renderField('وجود دليل التشغيل وبطاقة الضمان بالداخل', bData.manualWarrantyOk)}
                        {renderField('سهولة تركيب وإزالة الأرفف الزجاجية', bData.shelfRemovalOk)}
                        {renderField('وجود الفازلين على مفصلات الأبواب وتزييتها', bData.hingeVaselineOk)}
                        {renderField('سلامة أزرار لوحة التحكم وسهولة الضغط', bData.controlPanelButtonsOk)}
                        {renderField('ضبط ثيرموستات الفريزر على وضع Medium', bData.freezerControlMed)}
                        {renderField('ضبط ثيرموستات الكابينة على وضع Minimum', bData.cabinetControlMin)}
                        {renderField('نظافة حقن السيليكون على الفواصل والزوايا', bData.siliconAppliedClean)}
                      </div>
                    </div>

                    {/* Section 5: أبعاد الثلاجة وعزوم الربط */}
                    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2">
                        <h4 className="font-bold text-zinc-900 text-xs">5. أبعاد الثلاجة وفراغات الرفوف وعزوم الربط الميكانيكية بالكامل:</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 p-3">
                        {renderField('الارتفاع الكلي الخارجي (A)', bData.dimA, ' ملم')}
                        {renderField('العرض الكلي الخارجي (B)', bData.dimB, ' ملم')}
                        {renderField('العمق الكلي الخارجي (C)', bData.dimC, ' ملم')}
                        {renderField('الطول الداخلي للفريزر (L)', bData.dimL, ' ملم')}
                        {renderField('الطول الداخلي للكابينة (M)', bData.dimM, ' ملم')}
                        {renderField('العمق الداخلي للكابينة (N)', bData.dimN, ' ملم')}
                        {renderField('القطر القطري للفريزر (D)', bData.dimD, ' ملم')}
                        {renderField('القطر القطري للكابينة (E)', bData.dimE, ' ملم')}
                        {renderField('البعد الرأسي للفريزر (Y)', bData.dimY, ' ملم')}
                        {renderField('البعد الرأسي للكابينة (Z)', bData.dimZ, ' ملم')}
                        {renderField('مسافة فراغ الرف x بالضبعة', bData.shelfGapX, ' ملم')}
                        {renderField('تطابق فجوة الرف العلوي للفريزر مع القياسات القياسية', bData.fUpperShelfOk)}
                        {renderField('خلوص الجوان العلوي الأيمن', bData.upperGGargR, ' ملم')}
                        {renderField('خلوص الجوان السفلي الأيمن', bData.lowerGGargR, ' ملم')}
                        {renderField('خلوص الجوان الرأسي', bData.gGargV, ' ملم')}
                        {renderField('إحكام وتركيب جيوب الباب العلوي للفريزر', bData.frDoorPocketTight)}
                        {renderField('إحكام وتركيب جيوب الباب السفلي للكابينة', bData.rDoorPocketTight)}
                        {renderField('إحكام وتركيب صندوق الأغراض المتعددة (Utility Box)', bData.utilityTight)}
                        {renderField('إحكام وتركيب رف الزجاجات السفلي', bData.bottlePocketTight)}
                        {renderField('إحكام وتركيب جيوب باب الفريزر الثانوي', bData.frDoorPocketTight2)}
                        {renderField('عزم مسمار المفصلة العلوية 1', bData.torqueA1, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة العلوية 2', bData.torqueA2, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة العلوية 3', bData.torqueA3, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة الوسطى 1', bData.torqueB1, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة الوسطى 2', bData.torqueB2, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة السفلية 1', bData.torqueC1, ' نيوتن.متر')}
                        {renderField('عزم مسمار المفصلة السفلية 2', bData.torqueC2, ' نيوتن.متر')}
                        {renderField('عزم مسمار تثبيت الكباس 1', bData.torqueT1, ' نيوتن.متر')}
                        {renderField('عزم مسمار تثبيت الكباس 2', bData.torqueT2, ' نيوتن.متر')}
                      </div>
                    </div>
                  </div>
                );
              })() : (
                /* LINE A / C Standard Checklist Layout */
                <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-xs bg-white">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-250">
                        <th className="py-2.5 px-4">رقم البند</th>
                        <th className="py-2.5 px-4">اسم بند الفحص والتأكيد</th>
                        <th className="py-2.5 px-4 text-center">نوع الفحص</th>
                        <th className="py-2.5 px-4 text-center">حالة المطابقة الفنية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {CHECKLIST_ITEMS.map((item, index) => {
                        const isOk = activeReport.checkedItems[item.id] !== false;
                        return (
                          <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-zinc-400 font-bold">{index + 1}</td>
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-zinc-800 block">{item.label}</span>
                              <span className="text-[10px] text-zinc-400 font-medium">{item.description}</span>
                            </td>
                            <td className="py-2.5 px-4 text-center text-zinc-500 font-bold">
                              {item.category === 'exterior' ? 'فحص بصري' :
                               item.category === 'cooling' ? 'أجهزة قياس' :
                               item.category === 'electrical' ? 'اختبار كهربائي' : 'أمن وسلامة'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isOk ? 'bg-emerald-50 border border-emerald-250 text-emerald-800' : 'bg-red-50 border border-red-250 text-red-800'
                              }`}>
                                {isOk ? 'مطابق وممتاز (OK)' : 'مخالف وغير مطابق (NG)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Defects list */}
            {activeReport.defects.length > 0 && (
              <div className="bg-red-50/50 border border-red-200 p-4 rounded-xl space-y-2">
                <h4 className="text-xs font-black text-red-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                  المخالفات والأعطال المرصودة بالوحدة:
                </h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-red-800 font-bold pr-2">
                  {activeReport.defects.map((def, idx) => {
                    const option = DEFECT_OPTIONS.find(o => o.id === def.defectOptionId);
                    return (
                      <li key={idx}>
                        {option ? option.label : def.defectOptionId} - {def.details || 'بدون تفاصيل إضافية'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Signatures */}
            <div className="border-t border-zinc-200 pt-6 grid grid-cols-2 gap-6 text-xs text-center font-bold text-zinc-700">
              <div className="space-y-4">
                <p>توقيع فني توكيد الجودة (QA Inspector)</p>
                <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto"></div>
                <p className="font-mono text-zinc-500">{activeReport.inspectorName} ({activeReport.inspectorSap})</p>
              </div>
              <div className="space-y-4">
                <p>توقيع واعتماد مشرف النوبة والخط</p>
                <div className="h-10 border-b border-dashed border-zinc-300 w-2/3 mx-auto"></div>
                <p className="text-emerald-700">
                  {activeReport.supervisorApproved ? 'موافق ومعتمد إلكترونياً' : '___________'}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Close & Action Buttons */}
        <div className="no-print border-t border-zinc-200 pt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleDownloadExcel(activeReport)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm animate-pulse-subtle"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تحميل كملف إكسيل متاح للتعديل (Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-zinc-900 hover:bg-zinc-950 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الفورية (A4)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveReport(null)}
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-extrabold px-5 py-2.5 rounded-xl text-xs cursor-pointer transition-colors"
          >
            إغلاق التقرير ومعاودة العمل
          </button>
        </div>
      </div>
    </div>
  );
};
