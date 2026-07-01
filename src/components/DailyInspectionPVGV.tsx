import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Check, X, Printer, ArrowRight, RefreshCw, Sparkles, User, FileText, Activity, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DailyInspectionPVGVProps {
  onBack: () => void;
  onSave: (log: any) => void;
  user: { name: string; sapNumber?: string };
}

export default function DailyInspectionPVGV({ onBack, onSave, user }: DailyInspectionPVGVProps) {
  // Basic Fields
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'الأولى' | 'الثانية' | 'الثالثة'>('الأولى');
  const [model, setModel] = useState('SJ-PV'); // Technician will type the model name
  const [modelProfile, setModelProfile] = useState<'GV58A' | 'GV_PV'>('GV_PV'); // Determines Section 8 limits
  const [barcode, setBarcode] = useState('');
  
  // Handlers for physical barcode scanners
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Inspector & Registerer names
  const [inspectorName, setInspectorName] = useState(user.name || '');
  const [registererName, setRegistererName] = useState('عبد الرحمن شريف');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Form check fields state (Ok/NG or numerical values)
  // Section 1
  const [packagingOk, setPackagingOk] = useState<'OK' | 'NG'>('OK');

  // Section 2
  const [colorMatch, setColorMatch] = useState<'OK' | 'NG'>('OK');
  const [outerInjection, setOuterInjection] = useState<'OK' | 'NG'>('OK');
  const [noScratchDents, setNoScratchDents] = useState<'OK' | 'NG'>('OK');
  const [pcbCableFasten, setPcbCableFasten] = useState<'OK' | 'NG'>('OK');
  const [pipeDistanceOk, setPipeDistanceOk] = useState<'OK' | 'NG'>('OK');
  const [printMatchesModel, setPrintMatchesModel] = useState<'OK' | 'NG'>('OK');
  const [chargePipeNoProtrude, setChargePipeNoProtrude] = useState<'OK' | 'NG'>('OK');
  const [wavinessValue, setWavinessValue] = useState<string>('0.5'); // <= 1mm
  const [otherDefects, setOtherDefects] = useState<'OK' | 'NG'>('OK');

  // Section 3
  const [doorNoScratch, setDoorNoScratch] = useState<'OK' | 'NG'>('OK');
  const [doorColorMatch, setDoorColorMatch] = useState<'OK' | 'NG'>('OK');
  const [doorHandleOk, setDoorHandleOk] = useState<'OK' | 'NG'>('OK');
  const [doorNoNoise, setDoorNoNoise] = useState<'OK' | 'NG'>('OK');
  const [doorGasketOk, setDoorGasketOk] = useState<'OK' | 'NG'>('OK');
  const [badgeAssemblyOk, setBadgeAssemblyOk] = useState<'OK' | 'NG'>('OK');
  const [gasketNoClearance, setGasketNoClearance] = useState<'OK' | 'NG'>('OK');

  // Section 4
  const [elecStartCurrent, setElecStartCurrent] = useState<string>('15.0'); // 0.10:30 A
  const [elecGroundRes, setElecGroundRes] = useState<string>('60'); // 0:120 mOhm
  const [elecInsulRes, setElecInsulRes] = useState<string>('5.0'); // 0:10 mOhm
  const [elecWithstandCurrent, setElecWithstandCurrent] = useState<string>('4.0'); // 0:10 mA
  const [elecLeakageCurrent, setElecLeakageCurrent] = useState<string>('0.250'); // 0:1.500 mA
  const [gasLeakTest, setGasLeakTest] = useState<'OK' | 'NG'>('OK');

  // Section 5
  const [fanLouverOk, setFanLouverOk] = useState<'OK' | 'NG'>('OK');
  const [innerInjNoScratch, setInnerInjNoScratch] = useState<'OK' | 'NG'>('OK');
  const [innerCleanliness, setInnerCleanliness] = useState<'OK' | 'NG'>('OK');
  const [innerPartsNoCrack, setInnerPartsNoCrack] = useState<'OK' | 'NG'>('OK');
  const [freshCaseMovement, setFreshCaseMovement] = useState<'OK' | 'NG'>('OK');
  const [innerTapeOk, setInnerTapeOk] = useState<'OK' | 'NG'>('OK');
  const [centerPlateOk, setCenterPlateOk] = useState<'OK' | 'NG'>('OK');
  const [manualWarrantyOk, setManualWarrantyOk] = useState<'OK' | 'NG'>('OK');
  const [shelfRemovalOk, setShelfRemovalOk] = useState<'OK' | 'NG'>('OK');
  const [hingeVaselineOk, setHingeVaselineOk] = useState<'OK' | 'NG'>('OK');
  const [controlPanelButtonsOk, setControlPanelButtonsOk] = useState<'OK' | 'NG'>('OK');
  const [controlPanelR5F18, setControlPanelR5F18] = useState<'OK' | 'NG'>('OK'); // ضبط شاشة التحكم على {R/5 & F/-18}
  const [siliconAppliedClean, setSiliconAppliedClean] = useState<'OK' | 'NG'>('OK');

  // Section 6
  const [shelfGapX, setShelfGapX] = useState<string>('5.0'); // 3 <= x <= 8
  const [fUpperShelfOk, setFUpperShelfOk] = useState<'OK' | 'NG'>('OK');
  const [upperGGargR, setUpperGGargR] = useState<'OK' | 'NG'>('OK');
  const [lowerGGargR, setLowerGGargR] = useState<'OK' | 'NG'>('OK');
  const [gGargV, setGGargV] = useState<'OK' | 'NG'>('OK');

  // Section 7
  const [frDoorPocketTight, setFrDoorPocketTight] = useState<'OK' | 'NG'>('OK');
  const [rDoorPocketTightB, setRDoorPocketTightB] = useState<'OK' | 'NG'>('OK');
  const [rDoorPocketTightC, setRDoorPocketTightC] = useState<'OK' | 'NG'>('OK');
  const [bottlePocketTight, setBottlePocketTight] = useState<'OK' | 'NG'>('OK');
  const [frDoorPocketTight2, setFrDoorPocketTight2] = useState<'OK' | 'NG'>('OK');

  // Section 8 (All Dimensions in mm)
  // Defaults set close to typical specs
  const [dimA, setDimA] = useState<string>('0.5');
  const [dimB, setDimB] = useState<string>('0.5');
  const [dimC, setDimC] = useState<string>('0.5');
  const [dimL, setDimL] = useState<string>('3.0');
  const [dimM, setDimM] = useState<string>('3.0');
  const [dimN, setDimN] = useState<string>('3.0');
  const [dimD, setDimD] = useState<string>('12.5');
  const [dimE, setDimE] = useState<string>('12.0');
  const [dimY, setDimY] = useState<string>('10.0'); // 9.5:10.5
  const [dimZ, setDimZ] = useState<string>('10.0'); // 9.5:10.5

  // Section 9
  const [selfCloseFreezer, setSelfCloseFreezer] = useState<string>('25'); // >= 20mm
  const [selfCloseCabinet, setSelfCloseCabinet] = useState<string>('40'); // >= 35mm
  const [gasketContactFreezer, setGasketContactFreezer] = useState<string>('8'); // >= 7mm
  const [gasketContactCabinet, setGasketContactCabinet] = useState<string>('8'); // >= 7mm
  const [doorPullForce, setDoorPullForce] = useState<string>('4.2'); // <= 5Kgf
  // Top hinge torques (4.8:7.0 Nm)
  const [torqueA1, setTorqueA1] = useState<string>('5.5');
  const [torqueA2, setTorqueA2] = useState<string>('5.8');
  const [torqueA3, setTorqueA3] = useState<string>('6.0');
  // Mid hinge torques (4.8:7.0 Nm)
  const [torqueB1, setTorqueB1] = useState<string>('5.5');
  const [torqueB2, setTorqueB2] = useState<string>('5.6');
  // Bottom hinge torques (4.8:7.0 Nm)
  const [torqueC1, setTorqueC1] = useState<string>('5.8');
  const [torqueC2, setTorqueC2] = useState<string>('5.9');
  // Clearance gaps
  const [torqueT1, setTorqueT1] = useState<string>('1.1'); // <= 1.5mm
  const [torqueT2, setTorqueT2] = useState<string>('1.4'); // <= 2mm

  // Section 10
  const [noAbnormalNoise, setNoAbnormalNoise] = useState<'OK' | 'NG'>('OK');
  const [coolingVerified, setCoolingVerified] = useState<'OK' | 'NG'>('OK');
  const [lampTurnsOff, setLampTurnsOff] = useState<'OK' | 'NG'>('OK'); // <= 60mm
  const [checkModeDigital, setCheckModeDigital] = useState<'OK' | 'NG'>('OK');

  // Auto adjusting defaults based on profile toggle
  useEffect(() => {
    if (modelProfile === 'GV58A') {
      setDimA('0.8');
      setDimB('0.8');
      setDimC('0.8');
      setDimL('0.8');
      setDimM('0.8');
      setDimN('0.8');
    } else {
      setDimA('-0.5');
      setDimB('-0.5');
      setDimC('-0.8');
      setDimL('3.2');
      setDimM('3.5');
      setDimN('3.4');
    }
  }, [modelProfile]);

  // Real-time validations
  const isWavinessInvalid = (parseFloat(wavinessValue) || 0) > 1.0;
  
  const isElecStartCurrentInvalid = (parseFloat(elecStartCurrent) || 0) < 0.1 || (parseFloat(elecStartCurrent) || 0) > 30.0;
  const isElecGroundResInvalid = (parseFloat(elecGroundRes) || 0) < 0 || (parseFloat(elecGroundRes) || 0) > 120;
  const isElecInsulResInvalid = (parseFloat(elecInsulRes) || 0) < 0 || (parseFloat(elecInsulRes) || 0) > 10;
  const isElecWithstandCurrentInvalid = (parseFloat(elecWithstandCurrent) || 0) < 0 || (parseFloat(elecWithstandCurrent) || 0) > 10;
  const isElecLeakageCurrentInvalid = (parseFloat(elecLeakageCurrent) || 0) < 0 || (parseFloat(elecLeakageCurrent) || 0) > 1.500;

  const isShelfGapXInvalid = (parseFloat(shelfGapX) || 0) < 3 || (parseFloat(shelfGapX) || 0) > 8;

  const valA = parseFloat(dimA) || 0;
  const valB = parseFloat(dimB) || 0;
  const valC = parseFloat(dimC) || 0;
  const valL = parseFloat(dimL) || 0;
  const valM = parseFloat(dimM) || 0;
  const valN = parseFloat(dimN) || 0;
  const valD = parseFloat(dimD) || 0;
  const valE = parseFloat(dimE) || 0;
  const valY = parseFloat(dimY) || 0;
  const valZ = parseFloat(dimZ) || 0;
  const diffDE = Math.abs(valD - valE);

  let isDimAInvalid = false;
  let isDimBInvalid = false;
  let isDimCInvalid = false;
  let isDimLInvalid = false;
  let isDimMInvalid = false;
  let isDimNInvalid = false;
  let isDiffDEInvalid = false;

  if (modelProfile === 'GV58A') {
    isDimAInvalid = valA < 0 || valA > 1.5;
    isDimBInvalid = valB < 0 || valB > 1.5;
    isDimCInvalid = valC < 0 || valC > 1.5;
    isDimLInvalid = valL < 0 || valL > 1.5;
    isDimMInvalid = valM < 0 || valM > 1.5;
    isDimNInvalid = valN < 0 || valN > 1.5;
    isDiffDEInvalid = diffDE > 2.0;
  } else {
    isDimAInvalid = valA < -1 || valA > 0;
    isDimBInvalid = valB < -1 || valB > 0;
    isDimCInvalid = valC < -2 || valC > 0;
    isDimLInvalid = valL < 2.5 || valL > 4.5;
    isDimMInvalid = valM < 2.5 || valM > 4.5;
    isDimNInvalid = valN < 2.5 || valN > 4.5;
    isDiffDEInvalid = diffDE > 1.0;
  }

  const isDimYInvalid = valY < 9.5 || valY > 10.5;
  const isDimZInvalid = valZ < 9.5 || valZ > 10.5;

  const isSelfCloseFreezerInvalid = (parseFloat(selfCloseFreezer) || 0) < 20;
  const isSelfCloseCabinetInvalid = (parseFloat(selfCloseCabinet) || 0) < 35;
  const isGasketContactFreezerInvalid = (parseFloat(gasketContactFreezer) || 0) < 7;
  const isGasketContactCabinetInvalid = (parseFloat(gasketContactCabinet) || 0) < 7;
  const isDoorPullForceInvalid = (parseFloat(doorPullForce) || 0) > 5.0;

  const isTorqueA1Invalid = (parseFloat(torqueA1) || 0) < 4.8 || (parseFloat(torqueA1) || 0) > 7.0;
  const isTorqueA2Invalid = (parseFloat(torqueA2) || 0) < 4.8 || (parseFloat(torqueA2) || 0) > 7.0;
  const isTorqueA3Invalid = (parseFloat(torqueA3) || 0) < 4.8 || (parseFloat(torqueA3) || 0) > 7.0;
  const isTorqueB1Invalid = (parseFloat(torqueB1) || 0) < 4.8 || (parseFloat(torqueB1) || 0) > 7.0;
  const isTorqueB2Invalid = (parseFloat(torqueB2) || 0) < 4.8 || (parseFloat(torqueB2) || 0) > 7.0;
  const isTorqueC1Invalid = (parseFloat(torqueC1) || 0) < 4.8 || (parseFloat(torqueC1) || 0) > 7.0;
  const isTorqueC2Invalid = (parseFloat(torqueC2) || 0) < 4.8 || (parseFloat(torqueC2) || 0) > 7.0;
  const isTorqueT1Invalid = (parseFloat(torqueT1) || 0) > 1.5;
  const isTorqueT2Invalid = (parseFloat(torqueT2) || 0) > 2.0;

  // Compute Overall status
  const isFailed = 
    packagingOk === 'NG' || colorMatch === 'NG' || outerInjection === 'NG' || noScratchDents === 'NG' ||
    pcbCableFasten === 'NG' || pipeDistanceOk === 'NG' || printMatchesModel === 'NG' || chargePipeNoProtrude === 'NG' ||
    otherDefects === 'NG' || doorNoScratch === 'NG' || doorColorMatch === 'NG' || doorHandleOk === 'NG' ||
    doorNoNoise === 'NG' || doorGasketOk === 'NG' || badgeAssemblyOk === 'NG' || gasketNoClearance === 'NG' ||
    gasLeakTest === 'NG' || fanLouverOk === 'NG' || innerInjNoScratch === 'NG' || innerCleanliness === 'NG' ||
    innerPartsNoCrack === 'NG' || freshCaseMovement === 'NG' || innerTapeOk === 'NG' || centerPlateOk === 'NG' ||
    manualWarrantyOk === 'NG' || shelfRemovalOk === 'NG' || hingeVaselineOk === 'NG' || controlPanelButtonsOk === 'NG' ||
    controlPanelR5F18 === 'NG' || siliconAppliedClean === 'NG' || fUpperShelfOk === 'NG' ||
    upperGGargR === 'NG' || lowerGGargR === 'NG' || gGargV === 'NG' || frDoorPocketTight === 'NG' ||
    rDoorPocketTightB === 'NG' || rDoorPocketTightC === 'NG' || bottlePocketTight === 'NG' || frDoorPocketTight2 === 'NG' ||
    noAbnormalNoise === 'NG' || coolingVerified === 'NG' || lampTurnsOff === 'NG' || checkModeDigital === 'NG' ||
    isWavinessInvalid || isElecStartCurrentInvalid || isElecGroundResInvalid || isElecInsulResInvalid || 
    isElecWithstandCurrentInvalid || isElecLeakageCurrentInvalid || isShelfGapXInvalid || isDimAInvalid || 
    isDimBInvalid || isDimCInvalid || isDimLInvalid || isDimMInvalid || isDimNInvalid || isDiffDEInvalid || 
    isDimYInvalid || isDimZInvalid || isSelfCloseFreezerInvalid || isSelfCloseCabinetInvalid || 
    isGasketContactFreezerInvalid || isGasketContactCabinetInvalid || isDoorPullForceInvalid || 
    isTorqueA1Invalid || isTorqueA2Invalid || isTorqueA3Invalid || isTorqueB1Invalid || isTorqueB2Invalid || 
    isTorqueC1Invalid || isTorqueC2Invalid || isTorqueT1Invalid || isTorqueT2Invalid;

  const overallStatus = isFailed ? 'FAIL' : 'PASS';

  // Camera scanner handlers
  const startCameraScanner = async () => {
    setIsScanning(true);
    setScanError('');
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader-pvgv");
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              return { width: Math.min(width, 250), height: Math.min(height, 120) };
            }
          },
          (decodedText) => {
            setBarcode(decodedText);
            stopCameraScanner();
          },
          (errorMessage) => {}
        );
      } catch (err: any) {
        console.error(err);
        setScanError('تعذر تشغيل الكاميرا. تأكد من إعطاء الصلاحية.');
      }
    }, 300);
  };

  const stopCameraScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
      } catch (e) {
        console.error(e);
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleRandomBarcode = () => {
    const chars = '0123456789';
    let code = 'REF-PVGV-';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setBarcode(code);
  };

  // Submit and save
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      alert('يرجى كتابة أو مسح باركود العينة أولاً.');
      return;
    }
    if (!model.trim()) {
      alert('يرجى كتابة الموديل أولاً.');
      return;
    }

    const payload = {
      id: `DI-PVGV-${Date.now()}`,
      lineId: 'LINE_B',
      tabId: 'daily_inspection_pvgv',
      date,
      shift,
      model,
      modelProfile,
      barcode,
      inspectorName,
      registererName,
      overallStatus,
      timestamp: new Date().toISOString(),
      data: {
        packagingOk, colorMatch, outerInjection, noScratchDents, pcbCableFasten,
        pipeDistanceOk, printMatchesModel, chargePipeNoProtrude, wavinessValue, otherDefects,
        doorNoScratch, doorColorMatch, doorHandleOk, doorNoNoise, doorGasketOk, badgeAssemblyOk, gasketNoClearance,
        elecStartCurrent, elecGroundRes, elecInsulRes, elecWithstandCurrent, elecLeakageCurrent, gasLeakTest,
        fanLouverOk, innerInjNoScratch, innerCleanliness, innerPartsNoCrack, freshCaseMovement, innerTapeOk,
        centerPlateOk, manualWarrantyOk, shelfRemovalOk, hingeVaselineOk, controlPanelButtonsOk,
        controlPanelR5F18, siliconAppliedClean, shelfGapX, fUpperShelfOk,
        upperGGargR, lowerGGargR, gGargV, frDoorPocketTight, rDoorPocketTightB, rDoorPocketTightC,
        bottlePocketTight, frDoorPocketTight2, dimA, dimB, dimC, dimL, dimM, dimN, dimD, dimE,
        dimY, dimZ, selfCloseFreezer, selfCloseCabinet, gasketContactFreezer, gasketContactCabinet,
        doorPullForce, torqueA1, torqueA2, torqueA3, torqueB1, torqueB2, torqueC1, torqueC2,
        torqueT1, torqueT2, noAbnormalNoise, coolingVerified, lampTurnsOff, checkModeDigital
      }
    };

    onSave(payload);
    
    // Explicit upload trigger to simulate sending to Google Sheets since the URL is defined in TechnicianWorkspace
    triggerGoogleSheetSend(payload);
    
    alert(`تم حفظ تقرير فحص العينة بنجاح! النتيجة العامة: ${overallStatus === 'PASS' ? 'مطابق' : 'غير مطابق'} وتمت جدولة إرسالها إلى Google Sheets.`);
  };

  // Trigger Google Sheet sending if available in localStorage config
  const triggerGoogleSheetSend = (payload: any) => {
    try {
      const stored = localStorage.getItem('elaraby_qa_sheet_urls');
      if (stored) {
        const sheetUrls = JSON.parse(stored);
        const lineConfig = sheetUrls['LINE_B'];
        if (lineConfig && lineConfig.submission_url) {
          const formattedPayload = {
            tabId: 'daily_inspection_pvgv',
            'التاريخ': payload.date,
            'الوردية': payload.shift,
            'الموديل': payload.model,
            'الباركود': payload.barcode,
            'القائم بالفحص': payload.inspectorName,
            'الحالة العامة': payload.overallStatus === 'PASS' ? 'مطابق' : 'غير مطابق',
            'بيانات تفصيلية': JSON.stringify(payload.data)
          };
          fetch(lineConfig.submission_url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedPayload)
          }).catch(err => console.error("Sheets sync background error:", err));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Printable Style Injection */}
      <style>{`
        @media print {
          html, body {
            visibility: hidden !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          /* Reset parent containers so they do not hide or clip the printable area */
          #root, main, .fixed, .absolute, .relative, div {
            overflow: visible !important;
            position: static !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            direction: rtl !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-200 pb-4 gap-4 no-print">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onBack}
            className="bg-zinc-100 hover:bg-zinc-200 p-2 rounded-xl text-zinc-650 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-zinc-900">تسجيل الفحص اليومي للثلاجات (PV & GV) - مصنع B</h2>
            <p className="text-xs text-zinc-505 font-bold">نموذج الفحص النهائي: Final Inspection Sheet PV & GV</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الفوري (PDF)</span>
          </button>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Input Fields Form (no-print) */}
        <div className="xl:col-span-2 space-y-6 no-print">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Base Parameters Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-blue-500" />
                  المعلمات الأساسية للعينة (PV / GV)
                </h3>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                  مصنع B - فني
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">التاريخ</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">الوردية</label>
                  <select 
                    value={shift} 
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="الأولى">الوردية الأولى</option>
                    <option value="الثانية">الوردية الثانية</option>
                    <option value="الثالثة">الوردية الثالثة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">كتابة اسم الموديل</label>
                  <input 
                    type="text" 
                    value={model} 
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="مثال: GV58A أو PV48"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">فئة مواصفات قياس الأبعاد (القسم 8)</label>
                  <div className="flex gap-2 bg-zinc-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setModelProfile('GV_PV')}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                        modelProfile === 'GV_PV' ? 'bg-white text-blue-600 shadow-xs' : 'text-zinc-550 hover:bg-zinc-50'
                      }`}
                    >
                      موديلات GV / PV العامة
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelProfile('GV58A')}
                      className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                        modelProfile === 'GV58A' ? 'bg-white text-blue-600 shadow-xs' : 'text-zinc-550 hover:bg-zinc-50'
                      }`}
                    >
                      موديل مخصص GV58A
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">باركود العينة (مسح أو كتابة)</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      ref={barcodeInputRef}
                      value={barcode} 
                      onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                      placeholder="امسح الباركود بالمسدس أو الهاتف"
                      className="flex-1 bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-center font-mono font-bold tracking-widest text-zinc-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                      title="تشغيل الكاميرا للمسح"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>كاميرا</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRandomBarcode}
                      className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-650 px-2 rounded-xl text-xs font-bold flex items-center"
                      title="توليد رقم عشوائي للتجربة"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Camera Scanner Container */}
              {isScanning && (
                <div className="border border-blue-200 rounded-xl p-3 bg-zinc-900 text-white space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                      جاري المسح عبر كاميرا الهاتف...
                    </span>
                    <button 
                      type="button" 
                      onClick={stopCameraScanner}
                      className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                  <div id="reader-pvgv" className="w-full max-w-sm mx-auto overflow-hidden rounded-lg"></div>
                  {scanError && <p className="text-red-400 text-[10px] text-center font-bold">{scanError}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">القائم بالفحص</label>
                  <input 
                    type="text" 
                    value={inspectorName} 
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">القائم بالتسجيل</label>
                  <input 
                    type="text" 
                    value={registererName} 
                    onChange={(e) => setRegistererName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white text-right"
                  />
                </div>
              </div>
            </div>

            {/* 10 Sections Controls */}
            
            {/* Section 1 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">١</span>
                نتائج الفحص الظاهري لمجموعة التعبئة والتغليف للعينات
              </h4>
              <p className="text-[10px] text-zinc-550 leading-relaxed bg-zinc-50 p-2.5 rounded-xl border border-zinc-150 italic font-medium text-right">
                التأكد من سلامة مكونات التعبئة والتغليف ومطابقتها للمواصفات والألوان وخلوها من العيوب التي تؤثر على سلامة المنتج أو شكله الظاهري أو تعيق عملية تتبعه (يتم فحص هذا البند بنظام العينات على الخط بالتزامن مع سحب العينات العشوائية).
              </p>
              <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                <span className="text-xs font-bold text-zinc-700">سلامه أجزاء التغليف</span>
                <OkNgSwitch value={packagingOk} onChange={setPackagingOk} />
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٢</span>
                نتائج الفحص الظاهري للكابينة المحقونة من الخارج للعينات
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة درجة لون الثلاجه ومطابقتها للباركود</span>
                  <OkNgSwitch value={colorMatch} onChange={setColorMatch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة حقن الثلاجه من الخارج وعدم وجود نقـص حقن أو عدم إلتصاق</span>
                  <OkNgSwitch value={outerInjection} onChange={setOuterInjection} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عدم وجود خدوش او خبطات او انبعاجات</span>
                  <OkNgSwitch value={noScratchDents} onChange={setNoScratchDents} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة كابل وتثبيت مجموعة البورده</span>
                  <OkNgSwitch value={pcbCableFasten} onChange={setPcbCableFasten} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">المسافه بين المواسير وبعضها اكبر من 5MM وعدم ملامستها الحوض او البورده</span>
                  <OkNgSwitch value={pipeDistanceOk} onChange={setPipeDistanceOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">مطابقة المطبوعات لموديل الثلاجة</span>
                  <OkNgSwitch value={printMatchesModel} onChange={setPrintMatchesModel} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عدم بروز ماسورة الشحن</span>
                  <OkNgSwitch value={chargePipeNoProtrude} onChange={setChargePipeNoProtrude} />
                </div>
                
                {/* Numeric value for Waviness */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">تموج على جانبى الثلاجه الخارجى بالكابينه الصاج</span>
                    <span className="text-[9px] text-zinc-400 font-bold text-blue-600">المواصفة: ≤ 1.0 m.m.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.05"
                      value={wavinessValue} 
                      onChange={(e) => setWavinessValue(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isWavinessInvalid ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">مم</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عيوب اخرى</span>
                  <OkNgSwitch value={otherDefects} onChange={setOtherDefects} />
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٣</span>
                نتائج فحص أبواب العينات
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عدم وجود خبطات او خدوش او انعوجاج</span>
                  <OkNgSwitch value={doorNoScratch} onChange={setDoorNoScratch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">توافق درجة لون الباب و الكابينة</span>
                  <OkNgSwitch value={doorColorMatch} onChange={setDoorColorMatch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">فحص يد الباب وتثبيتهــا جيـداً</span>
                  <OkNgSwitch value={doorHandleOk} onChange={setDoorHandleOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">لا يوجد صوت عند فتح وغلق الباب</span>
                  <OkNgSwitch value={doorNoNoise} onChange={setDoorNoNoise} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">التأكد من سلامة الجوان</span>
                  <OkNgSwitch value={doorGasketOk} onChange={setDoorGasketOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة تجمع البادج</span>
                  <OkNgSwitch value={badgeAssemblyOk} onChange={setBadgeAssemblyOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">لا يوجد أي خلوص على محيط الجوان</span>
                  <OkNgSwitch value={gasketNoClearance} onChange={setGasketNoClearance} />
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٤</span>
                الاختبارات الكهربية
              </h4>
              <div className="space-y-2.5">
                {/* 4.1 Start current */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار بدء التشغيل 187v , 5 sec</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (0.10 : 30.0 A)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.1" value={elecStartCurrent} onChange={(e) => setElecStartCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecStartCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-550">A</span>
                  </div>
                </div>

                {/* 4.2 Ground resistance */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار الارضى 25A , 5 sec</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (0 : 120 mΩ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="1" value={elecGroundRes} onChange={(e) => setElecGroundRes(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecGroundResInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-550">mΩ</span>
                  </div>
                </div>

                {/* 4.3 Insulation Resistance */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">العزل الكهربي DC500V,20MΩ ,30sec</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (0 : 10 mΩ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.5" value={elecInsulRes} onChange={(e) => setElecInsulRes(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecInsulResInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-550">mΩ</span>
                  </div>
                </div>

                {/* 4.4 Withstand voltage */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">الصمود 1500V AC, 60 sec</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (0 : 10 mA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.5" value={elecWithstandCurrent} onChange={(e) => setElecWithstandCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecWithstandCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-550">mA</span>
                  </div>
                </div>

                {/* 4.5 Leakage current */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">اختبار تسريب الشحنه الكهربيه Leakage Current 220V,120sec</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة لـ PV&GV: (0 : 1.500 mA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.005" value={elecLeakageCurrent} onChange={(e) => setElecLeakageCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecLeakageCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-550">mA</span>
                  </div>
                </div>

                {/* 4.6 Freon Leak */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">اختبار تسريب الفريون</span>
                  <OkNgSwitch value={gasLeakTest} onChange={setGasLeakTest} />
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٥</span>
                الفحص الظاهرى الداخلى للثلاجه
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة تجميع ال fan louver</span>
                  <OkNgSwitch value={fanLouverOk} onChange={setFanLouverOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامه الكابينة المحقونة من الداخل وعدم وجود نقص حقن اوخبطات او خدوش</span>
                  <OkNgSwitch value={innerInjNoScratch} onChange={setInnerInjNoScratch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">نظافة الكابينة و خلوها من العيوب</span>
                  <OkNgSwitch value={innerCleanliness} onChange={setInnerCleanliness} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة تجميع الاجزاء وعدم جود كسور او شروخ بها</span>
                  <OkNgSwitch value={innerPartsNoCrack} onChange={setInnerPartsNoCrack} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سهولة حركة رف Fresh Case و بابه</span>
                  <OkNgSwitch value={freshCaseMovement} onChange={setFreshCaseMovement} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">تثبيت الاجزاء الداخلية باللاصق</span>
                  <OkNgSwitch value={innerTapeOk} onChange={setInnerTapeOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">فحص Centre plate المجمع</span>
                  <OkNgSwitch value={centerPlateOk} onChange={setCenterPlateOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">مطابقه دليل المالك وشهادة الضمان بالباركود</span>
                  <OkNgSwitch value={manualWarrantyOk} onChange={setManualWarrantyOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سهولة خلع و تركيب الارفف المتحركه</span>
                  <OkNgSwitch value={shelfRemovalOk} onChange={setShelfRemovalOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">الفازلين على المفصلات و الاجزاء الداخلية</span>
                  <OkNgSwitch value={hingeVaselineOk} onChange={setHingeVaselineOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامه شاشه التحكم وعدم وجود مشاكل بها</span>
                  <OkNgSwitch value={controlPanelButtonsOk} onChange={setControlPanelButtonsOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700 font-bold text-zinc-800">ضبط شاشه التحكم على وضع {`{R / 5 & F / -18}`}</span>
                  <OkNgSwitch value={controlPanelR5F18} onChange={setControlPanelR5F18} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">وجود السيلكون فى الاماكن المحدده ونظيف</span>
                  <OkNgSwitch value={siliconAppliedClean} onChange={setSiliconAppliedClean} />
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٦</span>
                نتائج قياس الفراغ بين نهاية الارفف الداخلية و الجسم الداخلي للكابينة
              </h4>
              
              <div className="bg-zinc-100 p-3 rounded-xl border border-zinc-200 mb-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-zinc-700 font-bold block">الفراغ المقاس بالضبعة X</span>
                  <span className="text-[10px] text-blue-600 font-bold">المواصفة المطلوبة: 3 ≤ x ≤ 8 (يقاس بالضبعة)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1" value={shelfGapX} onChange={(e) => setShelfGapX(e.target.value)}
                    className={`w-24 px-2.5 py-1 text-xs text-center border font-bold rounded-lg outline-none ${
                      isShelfGapXInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="text-xs font-bold text-zinc-500">مم</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-[10px] text-zinc-500 font-bold text-right mb-1">حدد حالة مطابقة النقاط بناءً على فحص الضبعة:</p>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">F-Upper Shelf</span>
                  <OkNgSwitch value={fUpperShelfOk} onChange={setFUpperShelfOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">Upper G Garg -R</span>
                  <OkNgSwitch value={upperGGargR} onChange={setUpperGGargR} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">Lower G Garg -R</span>
                  <OkNgSwitch value={lowerGGargR} onChange={setLowerGGargR} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">G Garg -V</span>
                  <OkNgSwitch value={gGargV} onChange={setGGargV} />
                </div>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٧</span>
                إختبار قوة تثبيت الاجزاء الداخلية عند تعرضها لقوة شد 5Kgf
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">F - R Door Pocket</span>
                  <OkNgSwitch value={frDoorPocketTight} onChange={setFrDoorPocketTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">R -Door Pocket .B</span>
                  <OkNgSwitch value={rDoorPocketTightB} onChange={setRDoorPocketTightB} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">R-Door Pocket .C</span>
                  <OkNgSwitch value={rDoorPocketTightC} onChange={setRDoorPocketTightC} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">Bottle Pocket</span>
                  <OkNgSwitch value={bottlePocketTight} onChange={setBottlePocketTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">F-R Door Pocket</span>
                  <OkNgSwitch value={frDoorPocketTight2} onChange={setFrDoorPocketTight2} />
                </div>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-zinc-150 pb-2 flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-blue-900 flex items-center gap-1">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٨</span>
                  نتائج قياسات العينات للثلاجة المجمعة (جميع الابعاد ب مم)
                </h4>
                <span className="text-[10px] font-black bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                  الفئة النشطة: {modelProfile === 'GV58A' ? 'GV58A' : 'Tornado GV / PV'}
                </span>
              </div>

              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-right space-y-1">
                <p className="text-[10px] text-blue-805 font-bold">💡 تظهر المواصفة الفنية تلقائياً بناءً على فئة الموديل المحددة:</p>
                {modelProfile === 'GV58A' ? (
                  <p className="text-[9px] text-zinc-550">
                    A, B, C, L, M, N: <strong className="text-blue-700">0 : 1.5 مم</strong> | التموج الأقصى |D-E|: <strong className="text-blue-700">≤ 2 مم</strong> | محوري Y, Z: <strong className="text-blue-700">9.5 : 10.5 مم</strong>
                  </p>
                ) : (
                  <p className="text-[9px] text-zinc-550">
                    A, B: <strong className="text-blue-700">-1 : 0 مم</strong> | C: <strong className="text-blue-700">-2 : 0 مم</strong> | L, M, N: <strong className="text-blue-700">2.5 : 4.5 مم</strong> | التموج الأقصى |D-E|: <strong className="text-blue-700">≤ 1 مم</strong> | محوري Y, Z: <strong className="text-blue-700">9.5 : 10.5 مم</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Dim A */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">A</label>
                  <input 
                    type="number" step="0.1" value={dimA} onChange={(e) => setDimA(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimAInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '0:-1'}</span>
                </div>

                {/* Dim B */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">B</label>
                  <input 
                    type="number" step="0.1" value={dimB} onChange={(e) => setDimB(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimBInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '0:-1'}</span>
                </div>

                {/* Dim C */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">C</label>
                  <input 
                    type="number" step="0.1" value={dimC} onChange={(e) => setDimC(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimCInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '0:-2'}</span>
                </div>

                {/* Dim L */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">L</label>
                  <input 
                    type="number" step="0.1" value={dimL} onChange={(e) => setDimL(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimLInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '2.5:4.5'}</span>
                </div>

                {/* Dim M */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">M</label>
                  <input 
                    type="number" step="0.1" value={dimM} onChange={(e) => setDimM(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimMInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '2.5:4.5'}</span>
                </div>

                {/* Dim N */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">N</label>
                  <input 
                    type="number" step="0.1" value={dimN} onChange={(e) => setDimN(e.target.value)}
                    className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                      isDimNInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                    }`}
                  />
                  <span className="block text-center text-[9px] text-zinc-400 mt-1">المواصفة: {modelProfile === 'GV58A' ? '0:1.5' : '2.5:4.5'}</span>
                </div>

                {/* Dim D */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">D (القائم الأيمن)</label>
                  <input 
                    type="number" step="0.1" value={dimD} onChange={(e) => setDimD(e.target.value)}
                    className="w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none bg-white border-zinc-200"
                  />
                  <span className="block text-center text-[9px] text-zinc-450 mt-1">قياس الضبعة</span>
                </div>

                {/* Dim E */}
                <div className="p-2 bg-zinc-50 rounded-xl border border-zinc-150">
                  <label className="block text-[10px] font-bold text-zinc-650 mb-1">E (القائم الأيسر)</label>
                  <input 
                    type="number" step="0.1" value={dimE} onChange={(e) => setDimE(e.target.value)}
                    className="w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none bg-white border-zinc-200"
                  />
                  <span className="block text-center text-[9px] text-zinc-450 mt-1">قياس الضبعة</span>
                </div>
              </div>

              {/* Dynamic Absolute difference D-E calculation */}
              <div className="flex items-center justify-between p-3 bg-zinc-100 rounded-xl border border-zinc-200">
                <div className="text-right">
                  <span className="text-xs font-bold text-zinc-750 block">فرق استواء القائمين |D-E|:</span>
                  <span className="text-[10px] font-bold text-blue-600">
                    المواصفة القصوى المتاحة: {modelProfile === 'GV58A' ? '≤ 2.0 مم' : '≤ 1.0 مم'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-sm font-black px-3 py-1 rounded-lg border ${
                    isDiffDEInvalid ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    {diffDE.toFixed(1)} مم
                  </span>
                  {isDiffDEInvalid ? (
                    <span className="text-[10px] text-red-600 font-bold">خارج المواصفة ⚠️</span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold">مطابق ✓</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Dim Y */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-150 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">موقع البادج Y (اليمين)</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (9.5 : 10.5 مم)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" step="0.1" value={dimY} onChange={(e) => setDimY(e.target.value)}
                      className={`w-20 px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                        isDimYInvalid ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">مم</span>
                  </div>
                </div>

                {/* Dim Z */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-150 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">موقع البادج Z (اليسار)</span>
                    <span className="text-[9px] text-blue-600 font-bold">المواصفة: (9.5 : 10.5 مم)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number" step="0.1" value={dimZ} onChange={(e) => setDimZ(e.target.value)}
                      className={`w-20 px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                        isDimZInvalid ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">مم</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">٩</span>
                نتائج قياس العزوم و خلوص C Part مع Food Liner
              </h4>

              <div className="space-y-3">
                
                {/* 1. Self Closing & Contact Limits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                  
                  {/* selfCloseFreezer */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-200 last:border-b-0 md:border-b-0">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-700">مسافة الغلق الذاتي لباب الفريزر</span>
                      <span className="text-[9px] text-blue-605 block font-bold">المواصفة: ≥ 20mm</span>
                    </div>
                    <input 
                      type="number" value={selfCloseFreezer} onChange={(e) => setSelfCloseFreezer(e.target.value)}
                      className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded ${
                        isSelfCloseFreezerInvalid ? 'bg-red-50 border-red-300 text-red-700 font-black' : 'bg-white border-zinc-250'
                      }`}
                    />
                  </div>

                  {/* selfCloseCabinet */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-700">مسافة الغلق الذاتي لباب الكابينة</span>
                      <span className="text-[9px] text-blue-605 block font-bold">المواصفة: ≥ 35mm</span>
                    </div>
                    <input 
                      type="number" value={selfCloseCabinet} onChange={(e) => setSelfCloseCabinet(e.target.value)}
                      className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded ${
                        isSelfCloseCabinetInvalid ? 'bg-red-50 border-red-300 text-red-700 font-black' : 'bg-white border-zinc-250'
                      }`}
                    />
                  </div>

                  {/* gasketContactFreezer */}
                  <div className="flex items-center justify-between py-1 border-t border-zinc-200 pt-2">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-700">مسافة التلامس الجوان لباب الفريزر</span>
                      <span className="text-[9px] text-blue-605 block font-bold">المواصفة: ≥ 7mm</span>
                    </div>
                    <input 
                      type="number" value={gasketContactFreezer} onChange={(e) => setGasketContactFreezer(e.target.value)}
                      className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded ${
                        isGasketContactFreezerInvalid ? 'bg-red-50 border-red-300 text-red-700 font-black' : 'bg-white border-zinc-250'
                      }`}
                    />
                  </div>

                  {/* gasketContactCabinet */}
                  <div className="flex items-center justify-between py-1 border-t border-zinc-200 pt-2">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-700">مسافة التلامس الجوان لباب الكابينة</span>
                      <span className="text-[9px] text-blue-605 block font-bold">المواصفة: ≥ 7mm</span>
                    </div>
                    <input 
                      type="number" value={gasketContactCabinet} onChange={(e) => setGasketContactCabinet(e.target.value)}
                      className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded ${
                        isGasketContactCabinetInvalid ? 'bg-red-50 border-red-300 text-red-700 font-black' : 'bg-white border-zinc-250'
                      }`}
                    />
                  </div>

                  {/* doorPullForce */}
                  <div className="flex items-center justify-between py-1 border-t border-zinc-200 pt-2 md:col-span-2">
                    <div>
                      <span className="text-[11px] font-bold text-zinc-700">قوة شــد فتح الباب</span>
                      <span className="text-[9px] text-blue-605 block font-bold">المواصفة: ≤ 5Kgf</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" step="0.1" value={doorPullForce} onChange={(e) => setDoorPullForce(e.target.value)}
                        className={`w-16 px-2 py-1 text-center text-xs font-bold border rounded ${
                          isDoorPullForceInvalid ? 'bg-red-50 border-red-300 text-red-700 font-black' : 'bg-white border-zinc-250'
                        }`}
                      />
                      <span className="text-[10px] font-bold text-zinc-550">Kgf</span>
                    </div>
                  </div>
                </div>

                {/* 2. Hinge Torques (عزوم ربط مسامير المفصلات) */}
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-150 space-y-3">
                  <span className="block text-[11px] font-bold text-zinc-800 border-b border-zinc-200 pb-1">عزوم ربط مسامير تثبيت المفصلات (المواصفة لكل المسامير: 4.8 : 7.0 N.m):</span>
                  
                  {/* Top Hinge */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3">
                      <span className="text-[10px] font-bold text-zinc-600 block">المفصلة العلوية (A1, A2, A3)</span>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">A1</label>
                      <input 
                        type="number" step="0.1" value={torqueA1} onChange={(e) => setTorqueA1(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueA1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">A2</label>
                      <input 
                        type="number" step="0.1" value={torqueA2} onChange={(e) => setTorqueA2(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueA2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">A3</label>
                      <input 
                        type="number" step="0.1" value={torqueA3} onChange={(e) => setTorqueA3(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueA3Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Mid Hinge */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-zinc-600 block">المفصلة الوسطى (B1, B2)</span>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">B1</label>
                      <input 
                        type="number" step="0.1" value={torqueB1} onChange={(e) => setTorqueB1(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueB1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">B2</label>
                      <input 
                        type="number" step="0.1" value={torqueB2} onChange={(e) => setTorqueB2(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueB2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Bottom Hinge */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200">
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-zinc-600 block">المفصلة السفلية (C1, C2)</span>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">C1</label>
                      <input 
                        type="number" step="0.1" value={torqueC1} onChange={(e) => setTorqueC1(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueC1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-zinc-550 text-center mb-0.5">C2</label>
                      <input 
                        type="number" step="0.1" value={torqueC2} onChange={(e) => setTorqueC2(e.target.value)}
                        className={`w-full px-1.5 py-0.5 text-center text-xs font-bold border rounded ${
                          isTorqueC2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. T1, T2 Clearance fields */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-zinc-700">T1</span>
                      <span className="text-[9px] text-blue-600 font-bold">المواصفة: ≤ 1.5 mm</span>
                    </div>
                    <input 
                      type="number" step="0.1" value={torqueT1} onChange={(e) => setTorqueT1(e.target.value)}
                      className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                        isTorqueT1Invalid ? 'bg-red-50 border-red-300 text-red-700 font-black animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-bold text-zinc-700">T2</span>
                      <span className="text-[9px] text-blue-600 font-bold">المواصفة: ≤ 2 mm</span>
                    </div>
                    <input 
                      type="number" step="0.1" value={torqueT2} onChange={(e) => setTorqueT2(e.target.value)}
                      className={`w-full px-2 py-1 text-center font-bold text-xs border rounded-lg outline-none ${
                        isTorqueT2Invalid ? 'bg-red-50 border-red-300 text-red-700 font-black animate-pulse' : 'bg-white border-zinc-200'
                      }`}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Section 10 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-extrabold text-blue-900 border-b border-zinc-150 pb-2 flex items-center gap-1">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">١٠</span>
                إختبار التبريد
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عدم وجود صوت غير طبيعى للثلاجه اثناء التشغيل</span>
                  <OkNgSwitch value={noAbnormalNoise} onChange={setNoAbnormalNoise} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">التاكد من تحقق التبريد بالثلاجه بعد التشغيل</span>
                  <OkNgSwitch value={coolingVerified} onChange={setCoolingVerified} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">اللمبة تنطفئ عند مســافه ≤ 60مم</span>
                  <OkNgSwitch value={lampTurnsOff} onChange={setLampTurnsOff} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">اختبار check mode للموديل الديجيتال</span>
                  <OkNgSwitch value={checkModeDigital} onChange={setCheckModeDigital} />
                </div>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-750 font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء والعودة للوحة التحكم
              </button>
              <button
                type="submit"
                className={`flex-1 font-bold py-3 px-4 rounded-xl text-xs text-white transition-all cursor-pointer shadow-sm ${
                  overallStatus === 'PASS' 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' 
                    : 'bg-red-600 hover:bg-red-750 shadow-red-105 animate-pulse'
                }`}
              >
                {overallStatus === 'PASS' ? 'حفظ وإرسال التقرير (مطابق)' : 'حفظ وإرسال التقرير كـ (غير مطابق ⚠️)'}
              </button>
            </div>

          </form>

        </div>

        {/* Right Printable Preview Column */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-4 text-right">
            <h3 className="text-xs font-black text-zinc-900 border-b border-zinc-150 pb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              حالة المطابقة الفورية
            </h3>

            <div className="p-4 rounded-xl text-center space-y-2 border" style={{
              backgroundColor: overallStatus === 'PASS' ? '#f0fdf4' : '#fef2f2',
              borderColor: overallStatus === 'PASS' ? '#bbf7d0' : '#fecaca'
            }}>
              <span className={`text-xs font-black block ${overallStatus === 'PASS' ? 'text-emerald-700' : 'text-red-700'}`}>
                {overallStatus === 'PASS' ? 'العينة مطابقة تماماً للمواصفات الفنية' : 'العينة غير مطابقة للمواصفات الفنية!'}
              </span>
              <p className="text-[10px] text-zinc-500 font-medium">
                {overallStatus === 'PASS' 
                  ? 'تم فحص جميع البنود وتأكيد القيم الرقمية في عزوم الربط والأبعاد ضمن المدى القياسي المسموح به.' 
                  : 'توجد نقاط مسجلة بـ NG أو قيم رقمية خارج الحدود المسموح بها في المخطط الفني لـ (PV & GV).'}
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-black text-zinc-500">إرشادات هامة للفني القائم بالفحص:</h4>
              <ul className="text-[10px] text-zinc-500 space-y-1.5 list-disc list-inside">
                <li>استخدم الضبعة لجميع قياسات الرفوف والأبعاد في المظهر الخارجي.</li>
                <li>تأكد من معايرة مفتاح العزم الإلكتروني قبل تسجيل قراءات المسامير.</li>
                <li>يتم رفع التقرير فورياً ومزامنته مع Google Sheets بعد الضغط على زر الحفظ.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Printable Clean Page (A4 Portrait Report) */}
      <div id="print-area" className="hidden print:block bg-white p-6 text-black" style={{ fontFamily: 'sans-serif' }}>
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
          <div className="text-right">
            <h1 className="text-xl font-bold">شركة العربي للصناعات الهندسية</h1>
            <h2 className="text-lg font-bold">تقرير الفحص النهائي للثلاجة المجمعة PV & GV</h2>
            <p className="text-xs font-bold mt-1">كود النموذج: FRQ-OG-20</p>
          </div>
          <div className="border p-2 border-black text-center rounded">
            <span className="text-sm font-extrabold block">رقم العينة: {barcode || '—'}</span>
            <span className="text-xs font-bold block mt-0.5">الموديل: {model} ({modelProfile})</span>
          </div>
        </div>

        <table className="w-full text-xs text-right border-collapse border border-black mb-4">
          <thead>
            <tr className="bg-zinc-100 border border-black font-bold">
              <th className="border border-black p-1">البند الفني للفحص</th>
              <th className="border border-black p-1 text-center w-28">المواصفة الفنية</th>
              <th className="border border-black p-1 text-center w-24">النتيجة المسجلة</th>
              <th className="border border-black p-1 text-center w-20">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {/* Section 1 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">1. نتائج الفحص الظاهري لمجموعة التعبئة والتغليف للعينات</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">سلامه أجزاء التغليف ومطابقتها لمواصفة الخط</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{packagingOk}</td>
              <td className="p-1 border border-black text-center font-bold">{packagingOk}</td>
            </tr>

            {/* Section 2 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">2. نتائج الفحص الظاهري للكابينة المحقونة من الخارج للعينات</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">سلامة درجة لون الثلاجه ومطابقتها للباركود</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{colorMatch}</td>
              <td className="p-1 border border-black text-center font-bold">{colorMatch}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">سلامة حقن الثلاجه من الخارج وخلوها من نقص الحقن</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{outerInjection}</td>
              <td className="p-1 border border-black text-center font-bold">{outerInjection}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">خلو الهيكل الخارجي من الخدوش أو الخبطات أو الانبعاجات</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{noScratchDents}</td>
              <td className="p-1 border border-black text-center font-bold">{noScratchDents}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">تموج صاج جوانب الثلاجة الخارجي</td>
              <td className="p-1 border border-black text-center">≤ 1.0 mm</td>
              <td className="p-1 border border-black text-center">{wavinessValue} mm</td>
              <td className="p-1 border border-black text-center font-bold">{isWavinessInvalid ? 'NG' : 'OK'}</td>
            </tr>

            {/* Section 3 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">3. نتائج فحص أبواب العينات</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">خلو الأبواب واليد من وجود خبطات أو انعوجاج</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{doorNoScratch}</td>
              <td className="p-1 border border-black text-center font-bold">{doorNoScratch}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">توافق درجة لون الباب و الكابينة</td>
              <td className="p-1 border border-black text-center">OK</td>
              <td className="p-1 border border-black text-center">{doorColorMatch}</td>
              <td className="p-1 border border-black text-center font-bold">{doorColorMatch}</td>
            </tr>

            {/* Section 4 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">4. الاختبارات الكهربية للفحص</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">إخــتــبـار بدء التشغيل 187V, 5s</td>
              <td className="p-1 border border-black text-center">0.10 : 30.0 A</td>
              <td className="p-1 border border-black text-center">{elecStartCurrent} A</td>
              <td className="p-1 border border-black text-center font-bold">{isElecStartCurrentInvalid ? 'NG' : 'OK'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">إخــتــبـار الارضى 25A, 5s</td>
              <td className="p-1 border border-black text-center">0 : 120 mΩ</td>
              <td className="p-1 border border-black text-center">{elecGroundRes} mΩ</td>
              <td className="p-1 border border-black text-center font-bold">{isElecGroundResInvalid ? 'NG' : 'OK'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">اختبار تسريب الشحنه الكهربيه Leakage Current</td>
              <td className="p-1 border border-black text-center">0 : 1.500 mA</td>
              <td className="p-1 border border-black text-center">{elecLeakageCurrent} mA</td>
              <td className="p-1 border border-black text-center font-bold">{isElecLeakageCurrentInvalid ? 'NG' : 'OK'}</td>
            </tr>

            {/* Section 8 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">8. نتائج قياسات العينات المجمعة للثلاجة (جميع الابعاد ب مم)</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">القياسات A, B, C</td>
              <td className="p-1 border border-black text-center">{modelProfile === 'GV58A' ? '0 : 1.5' : '-1 : 0 / -2 : 0'}</td>
              <td className="p-1 border border-black text-center">A:{dimA} | B:{dimB} | C:{dimC}</td>
              <td className="p-1 border border-black text-center font-bold">{(isDimAInvalid || isDimBInvalid || isDimCInvalid) ? 'NG' : 'OK'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">القياسات L, M, N</td>
              <td className="p-1 border border-black text-center">{modelProfile === 'GV58A' ? '0 : 1.5' : '2.5 : 4.5'}</td>
              <td className="p-1 border border-black text-center">L:{dimL} | M:{dimM} | N:{dimN}</td>
              <td className="p-1 border border-black text-center font-bold">{(isDimLInvalid || isDimMInvalid || isDimNInvalid) ? 'NG' : 'OK'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">استواء القائمين |D-E| والرموز Y, Z</td>
              <td className="p-1 border border-black text-center">{modelProfile === 'GV58A' ? '≤ 2.0' : '≤ 1.0'} (Y,Z: 9.5:10.5)</td>
              <td className="p-1 border border-black text-center">|D-E|:{diffDE.toFixed(1)} | Y:{dimY} | Z:{dimZ}</td>
              <td className="p-1 border border-black text-center font-bold">{(isDiffDEInvalid || isDimYInvalid || isDimZInvalid) ? 'NG' : 'OK'}</td>
            </tr>

            {/* Section 9 */}
            <tr className="bg-zinc-50 font-bold border-b border-black">
              <td colSpan={4} className="p-1 border border-black">9. نتائج قياس العزوم وخلوص الأبواب</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">مسافة الغلق الذاتي (الفريزر / الكابينة)</td>
              <td className="p-1 border border-black text-center">≥ 20mm / ≥ 35mm</td>
              <td className="p-1 border border-black text-center">F:{selfCloseFreezer} | R:{selfCloseCabinet}</td>
              <td className="p-1 border border-black text-center font-bold">{(isSelfCloseFreezerInvalid || isSelfCloseCabinetInvalid) ? 'NG' : 'OK'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-1 border border-black">عزوم تثبيت المفصلات العلوية والوسطى والسفلية</td>
              <td className="p-1 border border-black text-center">4.8 : 7.0 N.m</td>
              <td className="p-1 border border-black text-center">A:{torqueA1},{torqueA2},{torqueA3} | B:{torqueB1},{torqueB2} | C:{torqueC1},{torqueC2}</td>
              <td className="p-1 border border-black text-center font-bold">{(isTorqueA1Invalid || isTorqueA2Invalid || isTorqueA3Invalid || isTorqueB1Invalid || isTorqueB2Invalid || isTorqueC1Invalid || isTorqueC2Invalid) ? 'NG' : 'OK'}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center text-xs mt-12 border-t pt-4 border-black">
          <div>
            <span>تاريخ الفحص والاعتماد: {date}</span>
          </div>
          <div className="text-center">
            <span>الفني المسؤول عن الفحص: __________________</span>
          </div>
          <div className="text-left">
            <span>الاعتماد والمطابقة: <strong className="font-extrabold">{overallStatus === 'PASS' ? 'مطابق ومجاز ✓' : 'غير مطابق ⚠️'}</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
}

// Reuseable mini components
interface OkNgSwitchProps {
  value: 'OK' | 'NG';
  onChange: (val: 'OK' | 'NG') => void;
}

function OkNgSwitch({ value, onChange }: OkNgSwitchProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-200 font-bold text-[10px]">
      <button
        type="button"
        onClick={() => onChange('OK')}
        className={`px-3 py-1.5 transition-all cursor-pointer ${
          value === 'OK' ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-650 hover:bg-zinc-50'
        }`}
      >
        OK
      </button>
      <button
        type="button"
        onClick={() => onChange('NG')}
        className={`px-3 py-1.5 transition-all cursor-pointer ${
          value === 'NG' ? 'bg-red-600 text-white' : 'bg-white text-zinc-650 hover:bg-zinc-50'
        }`}
      >
        NG
      </button>
    </div>
  );
}
