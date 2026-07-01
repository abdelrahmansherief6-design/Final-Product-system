import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Check, X, Printer, ArrowRight, RefreshCw, Sparkles, User, FileText, Activity, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DailyInspectionBProps {
  onBack: () => void;
  onSave: (log: any) => void;
  user: { name: string; sapNumber?: string };
}

export default function DailyInspectionFactoryB({ onBack, onSave, user }: DailyInspectionBProps) {
  // Basic Fields
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'الأولى' | 'الثانية' | 'الثالثة'>('الأولى');
  const [model, setModel] = useState<'48C/A/T' | '58C/A/T' | '480T/AT' | '580T/AT'>('48C/A/T');
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
  const [wavinessValue, setWavinessValue] = useState<string>(''); // <= 1mm
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
  const [elecStartCurrent, setElecStartCurrent] = useState<string>(''); // 0.10:30 A
  const [elecGroundRes, setElecGroundRes] = useState<string>(''); // 0:120 mOhm
  const [elecInsulRes, setElecInsulRes] = useState<string>(''); // 0:10 mOhm
  const [elecWithstandCurrent, setElecWithstandCurrent] = useState<string>(''); // 0:10 mA
  const [elecLeakageCurrent, setElecLeakageCurrent] = useState<string>(''); // 0:0.450 mA
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
  const [freezerControlMed, setFreezerControlMed] = useState<'OK' | 'NG'>('OK');
  const [cabinetControlMin, setCabinetControlMin] = useState<'OK' | 'NG'>('OK');
  const [siliconAppliedClean, setSiliconAppliedClean] = useState<'OK' | 'NG'>('OK');

  // Section 6
  const [shelfGapX, setShelfGapX] = useState<string>(''); // 3 <= x <= 8
  const [fUpperShelfOk, setFUpperShelfOk] = useState<'OK' | 'NG'>('OK');
  const [upperGGargR, setUpperGGargR] = useState<'OK' | 'NG'>('OK');
  const [lowerGGargR, setLowerGGargR] = useState<'OK' | 'NG'>('OK');
  const [gGargV, setGGargV] = useState<'OK' | 'NG'>('OK');

  // Section 7
  const [frDoorPocketTight, setFrDoorPocketTight] = useState<'OK' | 'NG'>('OK');
  const [rDoorPocketTight, setRDoorPocketTight] = useState<'OK' | 'NG'>('OK');
  const [utilityTight, setUtilityTight] = useState<'OK' | 'NG'>('OK');
  const [bottlePocketTight, setBottlePocketTight] = useState<'OK' | 'NG'>('OK');
  const [frDoorPocketTight2, setFrDoorPocketTight2] = useState<'OK' | 'NG'>('OK');

  // Section 8
  const [dimA, setDimA] = useState<string>('');
  const [dimB, setDimB] = useState<string>('');
  const [dimC, setDimC] = useState<string>('');
  const [dimL, setDimL] = useState<string>('');
  const [dimM, setDimM] = useState<string>('');
  const [dimN, setDimN] = useState<string>('');
  const [dimD, setDimD] = useState<string>('');
  const [dimE, setDimE] = useState<string>('');
  const [dimY, setDimY] = useState<string>(''); // 9.5:10.5
  const [dimZ, setDimZ] = useState<string>(''); // 9.5:10.5

  // Section 9
  const [selfCloseFreezer, setSelfCloseFreezer] = useState<string>(''); // >= 20mm
  const [selfCloseCabinet, setSelfCloseCabinet] = useState<string>(''); // >= 35mm
  const [gasketContactFreezer, setGasketContactFreezer] = useState<string>(''); // >= 7mm
  const [gasketContactCabinet, setGasketContactCabinet] = useState<string>(''); // >= 7mm
  const [doorPullForce, setDoorPullForce] = useState<string>(''); // <= 5Kgf
  // Top hinge torques (4.8:7.0 Nm)
  const [torqueA1, setTorqueA1] = useState<string>('');
  const [torqueA2, setTorqueA2] = useState<string>('');
  const [torqueA3, setTorqueA3] = useState<string>('');
  // Mid hinge torques (4.8:7.0 Nm)
  const [torqueB1, setTorqueB1] = useState<string>('');
  const [torqueB2, setTorqueB2] = useState<string>('');
  // Bottom hinge torques (4.8:7.0 Nm)
  const [torqueC1, setTorqueC1] = useState<string>('');
  const [torqueC2, setTorqueC2] = useState<string>('');
  const [torqueT1, setTorqueT1] = useState<string>(''); // <= 1.5mm
  const [torqueT2, setTorqueT2] = useState<string>(''); // <= 2mm

  // Section 10
  const [noAbnormalNoise, setNoAbnormalNoise] = useState<'OK' | 'NG'>('OK');
  const [coolingVerified, setCoolingVerified] = useState<'OK' | 'NG'>('OK');
  const [lampTurnsOff, setLampTurnsOff] = useState<'OK' | 'NG'>('OK'); // >= 25mm
  const [checkModeDigital, setCheckModeDigital] = useState<'OK' | 'NG'>('OK');

  // Calculated absolute difference |D-E|
  const diffDE = Math.abs((parseFloat(dimD) || 0) - (parseFloat(dimE) || 0));

  // Determine limits for Section 8 depending on the model
  const is480_580 = model === '480T/AT' || model === '580T/AT';
  const limitABC_LMN = is480_580 ? 2.5 : 1.5;

  // Real-time out-of-spec validations - ignore if empty
  const isWavinessInvalid = wavinessValue !== "" && (parseFloat(wavinessValue) || 0) > 1.0;
  
  const isElecStartCurrentInvalid = elecStartCurrent !== "" && ((parseFloat(elecStartCurrent) || 0) < 0.1 || (parseFloat(elecStartCurrent) || 0) > 30.0);
  const isElecGroundResInvalid = elecGroundRes !== "" && ((parseFloat(elecGroundRes) || 0) < 0 || (parseFloat(elecGroundRes) || 0) > 120);
  const isElecInsulResInvalid = elecInsulRes !== "" && ((parseFloat(elecInsulRes) || 0) < 0 || (parseFloat(elecInsulRes) || 0) > 10);
  const isElecWithstandCurrentInvalid = elecWithstandCurrent !== "" && ((parseFloat(elecWithstandCurrent) || 0) < 0 || (parseFloat(elecWithstandCurrent) || 0) > 10);
  const isElecLeakageCurrentInvalid = elecLeakageCurrent !== "" && ((parseFloat(elecLeakageCurrent) || 0) < 0 || (parseFloat(elecLeakageCurrent) || 0) > 0.450);

  const isShelfGapXInvalid = shelfGapX !== "" && ((parseFloat(shelfGapX) || 0) < 3 || (parseFloat(shelfGapX) || 0) > 8);

  const isDimAInvalid = dimA !== "" && ((parseFloat(dimA) || 0) < 0 || (parseFloat(dimA) || 0) > limitABC_LMN);
  const isDimBInvalid = dimB !== "" && ((parseFloat(dimB) || 0) < 0 || (parseFloat(dimB) || 0) > limitABC_LMN);
  const isDimCInvalid = dimC !== "" && ((parseFloat(dimC) || 0) < 0 || (parseFloat(dimC) || 0) > limitABC_LMN);
  const isDimLInvalid = dimL !== "" && ((parseFloat(dimL) || 0) < 0 || (parseFloat(dimL) || 0) > limitABC_LMN);
  const isDimMInvalid = dimM !== "" && ((parseFloat(dimM) || 0) < 0 || (parseFloat(dimM) || 0) > limitABC_LMN);
  const isDimNInvalid = dimN !== "" && ((parseFloat(dimN) || 0) < 0 || (parseFloat(dimN) || 0) > limitABC_LMN);
  const isDiffDEInvalid = dimD !== "" && dimE !== "" && diffDE > 2.0;
  const isDimYInvalid = dimY !== "" && ((parseFloat(dimY) || 0) < 9.5 || (parseFloat(dimY) || 0) > 10.5);
  const isDimZInvalid = dimZ !== "" && ((parseFloat(dimZ) || 0) < 9.5 || (parseFloat(dimZ) || 0) > 10.5);

  const isSelfCloseFreezerInvalid = selfCloseFreezer !== "" && (parseFloat(selfCloseFreezer) || 0) < 20;
  const isSelfCloseCabinetInvalid = selfCloseCabinet !== "" && (parseFloat(selfCloseCabinet) || 0) < 35;
  const isGasketContactFreezerInvalid = gasketContactFreezer !== "" && (parseFloat(gasketContactFreezer) || 0) < 7;
  const isGasketContactCabinetInvalid = gasketContactCabinet !== "" && (parseFloat(gasketContactCabinet) || 0) < 7;
  const isDoorPullForceInvalid = doorPullForce !== "" && (parseFloat(doorPullForce) || 0) > 5.0;

  const isTorqueA1Invalid = torqueA1 !== "" && ((parseFloat(torqueA1) || 0) < 4.8 || (parseFloat(torqueA1) || 0) > 7.0);
  const isTorqueA2Invalid = torqueA2 !== "" && ((parseFloat(torqueA2) || 0) < 4.8 || (parseFloat(torqueA2) || 0) > 7.0);
  const isTorqueA3Invalid = torqueA3 !== "" && ((parseFloat(torqueA3) || 0) < 4.8 || (parseFloat(torqueA3) || 0) > 7.0);
  const isTorqueB1Invalid = torqueB1 !== "" && ((parseFloat(torqueB1) || 0) < 4.8 || (parseFloat(torqueB1) || 0) > 7.0);
  const isTorqueB2Invalid = torqueB2 !== "" && ((parseFloat(torqueB2) || 0) < 4.8 || (parseFloat(torqueB2) || 0) > 7.0);
  const isTorqueC1Invalid = torqueC1 !== "" && ((parseFloat(torqueC1) || 0) < 4.8 || (parseFloat(torqueC1) || 0) > 7.0);
  const isTorqueC2Invalid = torqueC2 !== "" && ((parseFloat(torqueC2) || 0) < 4.8 || (parseFloat(torqueC2) || 0) > 7.0);
  const isTorqueT1Invalid = torqueT1 !== "" && (parseFloat(torqueT1) || 0) > 1.5;
  const isTorqueT2Invalid = torqueT2 !== "" && (parseFloat(torqueT2) || 0) > 2.0;

  // Compute Overall status
  const isFailed = 
    packagingOk === 'NG' || colorMatch === 'NG' || outerInjection === 'NG' || noScratchDents === 'NG' ||
    pcbCableFasten === 'NG' || pipeDistanceOk === 'NG' || printMatchesModel === 'NG' || chargePipeNoProtrude === 'NG' ||
    otherDefects === 'NG' || doorNoScratch === 'NG' || doorColorMatch === 'NG' || doorHandleOk === 'NG' ||
    doorNoNoise === 'NG' || doorGasketOk === 'NG' || badgeAssemblyOk === 'NG' || gasketNoClearance === 'NG' ||
    gasLeakTest === 'NG' || fanLouverOk === 'NG' || innerInjNoScratch === 'NG' || innerCleanliness === 'NG' ||
    innerPartsNoCrack === 'NG' || freshCaseMovement === 'NG' || innerTapeOk === 'NG' || centerPlateOk === 'NG' ||
    manualWarrantyOk === 'NG' || shelfRemovalOk === 'NG' || hingeVaselineOk === 'NG' || controlPanelButtonsOk === 'NG' ||
    freezerControlMed === 'NG' || cabinetControlMin === 'NG' || siliconAppliedClean === 'NG' || fUpperShelfOk === 'NG' ||
    upperGGargR === 'NG' || lowerGGargR === 'NG' || gGargV === 'NG' || frDoorPocketTight === 'NG' ||
    rDoorPocketTight === 'NG' || utilityTight === 'NG' || bottlePocketTight === 'NG' || frDoorPocketTight2 === 'NG' ||
    noAbnormalNoise === 'NG' || coolingVerified === 'NG' || lampTurnsOff === 'NG' || checkModeDigital === 'NG' ||
    isWavinessInvalid || isElecStartCurrentInvalid || isElecGroundResInvalid || isElecInsulResInvalid || 
    isElecWithstandCurrentInvalid || isElecLeakageCurrentInvalid || isShelfGapXInvalid || isDimAInvalid || 
    isDimBInvalid || isDimCInvalid || isDimLInvalid || isDimMInvalid || isDimNInvalid || isDiffDEInvalid || 
    isDimYInvalid || isDimZInvalid || isSelfCloseFreezerInvalid || isSelfCloseCabinetInvalid || 
    isGasketContactFreezerInvalid || isGasketContactCabinetInvalid || isDoorPullForceInvalid || 
    isTorqueA1Invalid || isTorqueA2Invalid || isTorqueA3Invalid || isTorqueB1Invalid || isTorqueB2Invalid || 
    isTorqueC1Invalid || isTorqueC2Invalid || isTorqueT1Invalid || isTorqueT2Invalid;

  const overallStatus = isFailed ? 'FAIL' : 'PASS';

  // Toggle Camera Scanner using html5-qrcode
  const startCameraScanner = async () => {
    setIsScanning(true);
    setScanError('');
    // Wait for the DOM element to render
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("reader");
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
          (errorMessage) => {
            // Quiet fail during scans
          }
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
    let code = 'REF-B-';
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

    const payload = {
      id: `DI-B-${Date.now()}`,
      lineId: 'LINE_B',
      tabId: 'daily_inspection_b',
      date,
      shift,
      model,
      barcode,
      inspectorName,
      registererName,
      overallStatus,
      timestamp: new Date().toISOString(),
      // store all inputs
      data: {
        packagingOk, colorMatch, outerInjection, noScratchDents, pcbCableFasten,
        pipeDistanceOk, printMatchesModel, chargePipeNoProtrude, wavinessValue, otherDefects,
        doorNoScratch, doorColorMatch, doorHandleOk, doorNoNoise, doorGasketOk, badgeAssemblyOk, gasketNoClearance,
        elecStartCurrent, elecGroundRes, elecInsulRes, elecWithstandCurrent, elecLeakageCurrent, gasLeakTest,
        fanLouverOk, innerInjNoScratch, innerCleanliness, innerPartsNoCrack, freshCaseMovement, innerTapeOk,
        centerPlateOk, manualWarrantyOk, shelfRemovalOk, hingeVaselineOk, controlPanelButtonsOk,
        freezerControlMed, cabinetControlMin, siliconAppliedClean, shelfGapX, fUpperShelfOk,
        upperGGargR, lowerGGargR, gGargV, frDoorPocketTight, rDoorPocketTight, utilityTight,
        bottlePocketTight, frDoorPocketTight2, dimA, dimB, dimC, dimL, dimM, dimN, dimD, dimE,
        dimY, dimZ, selfCloseFreezer, selfCloseCabinet, gasketContactFreezer, gasketContactCabinet,
        doorPullForce, torqueA1, torqueA2, torqueA3, torqueB1, torqueB2, torqueC1, torqueC2,
        torqueT1, torqueT2, noAbnormalNoise, coolingVerified, lampTurnsOff, checkModeDigital
      }
    };

    onSave(payload);

    // Trigger Google Sheets sync in background
    triggerGoogleSheetSend(payload);

    // Reset all numerical input states for the next recording
    setBarcode('');
    setWavinessValue('');
    setElecStartCurrent('');
    setElecGroundRes('');
    setElecInsulRes('');
    setElecWithstandCurrent('');
    setElecLeakageCurrent('');
    setShelfGapX('');
    setDimA('');
    setDimB('');
    setDimC('');
    setDimL('');
    setDimM('');
    setDimN('');
    setDimD('');
    setDimE('');
    setDimY('');
    setDimZ('');
    setSelfCloseFreezer('');
    setSelfCloseCabinet('');
    setGasketContactFreezer('');
    setGasketContactCabinet('');
    setDoorPullForce('');
    setTorqueA1('');
    setTorqueA2('');
    setTorqueA3('');
    setTorqueB1('');
    setTorqueB2('');
    setTorqueC1('');
    setTorqueC2('');
    setTorqueT1('');
    setTorqueT2('');

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
            tabId: 'daily_inspection_b',
            'التاريخ': payload.date || '',
            'الوردية': payload.shift || '',
            'الموديل': payload.model || '',
            'الباركود': payload.barcode || '',
            'اسم المفتش': payload.inspectorName || '',
            'مسجل البيانات': payload.registererName || '',
            'النتيجة العامة': payload.overallStatus === 'PASS' ? 'مطابق' : 'غير مطابق',
            'التاريخ والوقت': payload.timestamp || '',
            
            // Section 2
            'سلامة التغليف وتجميع الكرتونة وحواجز الفوم': payload.data.packagingOk || '',
            'عدم وجود اختلاف فى الالوان للاجزاء الخارجية': payload.data.colorMatch || '',
            'سلامة حقن الجزء الخارجى وعدم وجود تسريب فوم': payload.data.outerInjection || '',
            'عدم وجود خدوش او خبطات او انبعاجات بالكابينة': payload.data.noScratchDents || '',
            'تثبيت كارتة الشاشة والضفيرة وتجميعها بطريقة صحيحة': payload.data.pcbCableFasten || '',
            'المسافة بين الكندنسر والمواسير الكهربية والاجزاء الساخنة': payload.data.pipeDistanceOk || '',
            'مطبقة البيانات المطبوعة للموديل والمنشأ والباركود': payload.data.printMatchesModel || '',
            'عدم بروز ماسورة الشحن من قاعدة الكباس': payload.data.chargePipeNoProtrude || '',
            'درجة التموج بالكابينة الصاج (Waviness)': payload.data.wavinessValue || '',
            'سلامة الكابينة من العيوب الأخرى': payload.data.otherDefects || '',
            
            // Section 3
            'عدم وجود خدوش او اتساخات بباب الفريزر والباب الخارجى': payload.data.doorNoScratch || '',
            'عدم وجود اختلاف فى الالوان لباب الفريزر والباب الخارجى': payload.data.doorColorMatch || '',
            'سلامة تجميع المقبض للباب الخارجى وباب الفريزر ومطابقتة': payload.data.doorHandleOk || '',
            'عدم وجود صوت غير طبيعى عند فتح وغلق الابواب': payload.data.doorNoNoise || '',
            'سلامة جوان باب الفريزر وجوان الكابينة وعدم وجود ترحيل': payload.data.doorGasketOk || '',
            'سلامة تجميع البادج بالمكان المخصص لة': payload.data.badgeAssemblyOk || '',
            'عدم وجود خلوص بين الجوان والكابينة': payload.data.gasketNoClearance || '',
            
            // Section 4
            'تيار بدء التشغيل (A)': payload.data.elecStartCurrent || '',
            'مقاومة الارضى (mΩ)': payload.data.elecGroundRes || '',
            'مقاومة العزل (MΩ)': payload.data.elecInsulRes || '',
            'امبير جهد الصمود (mA)': payload.data.elecWithstandCurrent || '',
            'تيار التسريب الكهربى (mA)': payload.data.elecLeakageCurrent || '',
            'إختبار تسريب الغاز بجميع الوصلات واللحامات بدقة': payload.data.gasLeakTest || '',
            
            // Section 5
            'سلامة تجميع الجزء Fan Louver وتجميع السوفت بطريقة صحيحة': payload.data.fanLouverOk || '',
            'سلامة حقن الفريزر والكابينة من الداخل وعدم وجود خدوش': payload.data.innerInjNoScratch || '',
            'نظافة الفريزر والكابينة من الداخل وخلوها من الاتساخات': payload.data.innerCleanliness || '',
            'سلامة الاجزاء الداخلية البلاستيكية والزجاجية وعدم وجود شرخ': payload.data.innerPartsNoCrack || '',
            'سهولة حركة الادرج وحرية الحركة لغطاء درج الخضار': payload.data.freshCaseMovement || '',
            'التأكد من ازالة الشريط اللاصق الخاص بتثبيت الاجزاء الداخلية': payload.data.innerTapeOk || '',
            'سلامة تجميع وعزل ال Center Plate وتجميع السخان الداخلى': payload.data.centerPlateOk || '',
            'وجود كتاب التعليمات والضمان داخل الكابينة': payload.data.manualWarrantyOk || '',
            'سهولة خروج ودخول الارفف الزجاجية والادرج والرف السلك': payload.data.shelfRemovalOk || '',
            'وضع طبقة الفازلين على المحاور المعدنية للمفصلة': payload.data.hingeVaselineOk || '',
            'سلامة شاشة التحكم والتاكد من عمل جميع الازرار واللمبات': payload.data.controlPanelButtonsOk || '',
            'ضبط ثرموستات الفريزر على وضع MED': payload.data.freezerControlMed || '',
            'ضبط ثرموستات الكابينة على وضع MIN': payload.data.cabinetControlMin || '',
            'وضع السيلكون بطريقة نظيفة وصحيحة بالاماكن المحددة': payload.data.siliconAppliedClean || '',
            
            // Section 6
            'قياس خلوص الارفف مع جوانب الكابينة X (mm)': payload.data.shelfGapX || '',
            'سلامة تجميع ال F/ Upper Shelf': payload.data.fUpperShelfOk || '',
            'سلامة تجميع ال Upper G/Garg R': payload.data.upperGGargR || '',
            'سلامة تجميع ال Lower G/Garg R': payload.data.lowerGGargR || '',
            'سلامة تجميع ال G/Garg V': payload.data.gGargV || '',
            
            // Section 7
            'احكام تجميع ال FR Door Pocket': payload.data.frDoorPocketTight || '',
            'احكام تجميع ال R Door Pocket': payload.data.rDoorPocketTight || '',
            'احكام تجميع ال Utility Pocket': payload.data.utilityTight || '',
            'احكام تجميع ال Bottle Pocket': payload.data.bottlePocketTight || '',
            'احكام تجميع ال FR Door Pocket 2': payload.data.frDoorPocketTight2 || '',
            
            // Section 8
            'المقاس A (mm)': payload.data.dimA || '',
            'المقاس B (mm)': payload.data.dimB || '',
            'المقاس C (mm)': payload.data.dimC || '',
            'المقاس L (mm)': payload.data.dimL || '',
            'المقاس M (mm)': payload.data.dimM || '',
            'المقاس N (mm)': payload.data.dimN || '',
            'المقاس D (mm)': payload.data.dimD || '',
            'المقاس E (mm)': payload.data.dimE || '',
            'المقاس Y (mm)': payload.data.dimY || '',
            'المقاس Z (mm)': payload.data.dimZ || '',
            
            // Section 9
            'مسافة الغلق الذاتى لباب الفريزر (mm)': payload.data.selfCloseFreezer || '',
            'مسافة الغلق الذاتى لباب الكابينة (mm)': payload.data.selfCloseCabinet || '',
            'مسافة ملامسة جوان الفريزر (mm)': payload.data.gasketContactFreezer || '',
            'مسافة ملامسة جوان الكابينة (mm)': payload.data.gasketContactCabinet || '',
            'قوة فتح الباب (Kgf)': payload.data.doorPullForce || '',
            'عزم ربط مسمار المفصلة العلوية A1 (Nm)': payload.data.torqueA1 || '',
            'عزم ربط مسمار المفصلة العلوية A2 (Nm)': payload.data.torqueA2 || '',
            'عزم ربط مسمار المفصلة العلوية A3 (Nm)': payload.data.torqueA3 || '',
            'عزم ربط مسمار المفصلة الوسطى B1 (Nm)': payload.data.torqueB1 || '',
            'عزم ربط مسمار المفصلة الوسطى B2 (Nm)': payload.data.torqueB2 || '',
            'عزم ربط مسمار المفصلة السفلية C1 (Nm)': payload.data.torqueC1 || '',
            'عزم ربط مسمار المفصلة السفلية C2 (Nm)': payload.data.torqueC2 || '',
            'خلوص الباب العلوى T1 (mm)': payload.data.torqueT1 || '',
            'خلوص الباب السفلى T2 (mm)': payload.data.torqueT2 || '',
            
            // Section 10
            'عدم وجود صوت غير طبيعى عند تشغيل الكباس والمروحة': payload.data.noAbnormalNoise || '',
            'التأكد من التبريد وتدفق الهواء داخل الكابينة': payload.data.coolingVerified || '',
            'التأكد من اطفاء اللمبة تلقائيا عند غلق الباب': payload.data.lampTurnsOff || '',
            'سلامة تفعيل ال Check Mode بالشاشة الديجيتال': payload.data.checkModeDigital || ''
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

  // Trigger A4 Print Page
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header with Printable Style Injection */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        @media print {
          html, body {
            visibility: hidden !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Reset specific parent containers without breaking interior div layout */
          #root, main {
            visibility: hidden !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          #print-area, #print-area * {
            visibility: visible !important;
          }
          #print-area {
            display: block !important;
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            direction: rtl !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
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
            <h2 className="text-base font-black text-zinc-900">تسجيل الفحص اليومي للثلاجات - مصنع B</h2>
            <p className="text-xs text-zinc-500">مجموعة الموديلات: (48C-A-T & 58C-A-T)</p>
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
              <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-150 pb-2 flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-blue-500" />
                المعلمات الأساسية للعينة
              </h3>
              
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
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">الموديل المحدد</label>
                  <select 
                    value={model} 
                    onChange={(e) => setModel(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="48C/A/T">48C/A/T</option>
                    <option value="58C/A/T">58C/A/T</option>
                    <option value="480T/AT">480T/AT</option>
                    <option value="580T/AT">580T/AT</option>
                  </select>
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
                  <div id="reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-lg"></div>
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
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-600 mb-1.5">القائم بالتسجيل</label>
                  <input 
                    type="text" 
                    value={registererName} 
                    onChange={(e) => setRegistererName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 10 Sections Controls */}
            
            {/* Section 1 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                1. نتائج الفحص الظاهري لمجموعة التعبئة والتغليف للعينات
              </h4>
              <p className="text-[10px] text-zinc-400">التأكد من سلامة مكونات التعبئة والتغليف ومطابقتها للمواصفات والألوان وخلوها من العيوب</p>
              <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-150">
                <span className="text-xs font-bold text-zinc-700">سلامه اجزاء التغليف</span>
                <OkNgSwitch value={packagingOk} onChange={setPackagingOk} />
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                2. نتائج الفحص الظاهري للكابينة المحقونة من الخارج للعينات
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة درجة لون الثلاجه ومطابقتها للباركود</span>
                  <OkNgSwitch value={colorMatch} onChange={setColorMatch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة حقن الثلاجه من الخارج وعدم وجود نقص حقن</span>
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
                  <span className="text-xs text-zinc-700">المسافه بين المواسير وبعضها اكبر من 5MM</span>
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
                    <span className="text-xs text-zinc-700 font-bold block">تموج على جانبى الثلاجه الخارجي بالكابينه الصاج</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: ≤ 1.0 m.m.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      step="0.05"
                      value={wavinessValue} 
                      onChange={(e) => setWavinessValue(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isWavinessInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
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
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                3. نتائج فحص أبواب العينات
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">عدم وجود خبطات او خدوش او اعوجاج في الأبواب</span>
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
                  <span className="text-xs text-zinc-700">لا يوجد صوت احتكاك عند فتح وغلق الباب</span>
                  <OkNgSwitch value={doorNoNoise} onChange={setDoorNoNoise} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">التأكد من سلامة الجوان ونظافته</span>
                  <OkNgSwitch value={doorGasketOk} onChange={setDoorGasketOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">سلامة تجميع البادج واللوجو</span>
                  <OkNgSwitch value={badgeAssemblyOk} onChange={setBadgeAssemblyOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <span className="text-xs text-zinc-700">لا يوجد أي خلوص على محيط الجوان (تطابق تام)</span>
                  <OkNgSwitch value={gasketNoClearance} onChange={setGasketNoClearance} />
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                4. الاختبارات الكهربية
              </h4>
              <div className="space-y-2.5">
                {/* 4.1 Start current */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار بدء التشغيل 187V, 5s</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (0.10 : 30.0 A)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.1" value={elecStartCurrent} onChange={(e) => setElecStartCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecStartCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">A</span>
                  </div>
                </div>

                {/* 4.2 Ground resistance */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار الارضى 25A, 5s</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (0 : 120 mΩ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="1" value={elecGroundRes} onChange={(e) => setElecGroundRes(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecGroundResInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">mΩ</span>
                  </div>
                </div>

                {/* 4.3 Insulation Resistance */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار العزل الكهربي DC500V, 20MΩ, 30s</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (0 : 10 mΩ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.5" value={elecInsulRes} onChange={(e) => setElecInsulRes(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecInsulResInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">mΩ</span>
                  </div>
                </div>

                {/* 4.4 Withstand voltage */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">إخــتــبـار الصمود 1500V AC, 60s</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (0 : 10 mA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.5" value={elecWithstandCurrent} onChange={(e) => setElecWithstandCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecWithstandCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">mA</span>
                  </div>
                </div>

                {/* 4.5 Leakage current */}
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">اختبار تسريب الشحنه الكهربيه 220V, 120s</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (0 : 0.450 mA)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.005" value={elecLeakageCurrent} onChange={(e) => setElecLeakageCurrent(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isElecLeakageCurrentInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">mA</span>
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
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                5. الفحص الظاهرى الداخلى للثلاجه
              </h4>
              <div className="space-y-2 h-72 overflow-y-auto pr-1.5 scrollbar-thin">
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">سلامة تجميع ال fan louver</span>
                  <OkNgSwitch value={fanLouverOk} onChange={setFanLouverOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">سلامه الكابينة المحقونة من الداخل وخلوها من نقص الحقن</span>
                  <OkNgSwitch value={innerInjNoScratch} onChange={setInnerInjNoScratch} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">نظافة الكابينة و خلوها من العيوب</span>
                  <OkNgSwitch value={innerCleanliness} onChange={setInnerCleanliness} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">سلامة تجميع الاجزاء وعدم جود كسور او شروخ بها</span>
                  <OkNgSwitch value={innerPartsNoCrack} onChange={setInnerPartsNoCrack} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">سهولة حركة رف Fresh Case و بابه</span>
                  <OkNgSwitch value={freshCaseMovement} onChange={setFreshCaseMovement} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">تثبيت الاجزاء الداخلية باللاصق</span>
                  <OkNgSwitch value={innerTapeOk} onChange={setInnerTapeOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">فحص Centre plate المجمع</span>
                  <OkNgSwitch value={centerPlateOk} onChange={setCenterPlateOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">مطابقه دليل المالك وشهادة الضمان بالباركود</span>
                  <OkNgSwitch value={manualWarrantyOk} onChange={setManualWarrantyOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">سهولة خلع و تركيب الارفف المتحركه</span>
                  <OkNgSwitch value={shelfRemovalOk} onChange={setShelfRemovalOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">الفازلين على المفصلات و الاجزاء الداخلية</span>
                  <OkNgSwitch value={hingeVaselineOk} onChange={setHingeVaselineOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">مدى حركة لوحة التحكم (Min-Max) واختبار زراير الشاشة (3 / -18)</span>
                  <OkNgSwitch value={controlPanelButtonsOk} onChange={setControlPanelButtonsOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">ضبط لوحة تحكم الفريزر على الوضع Med</span>
                  <OkNgSwitch value={freezerControlMed} onChange={setFreezerControlMed} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">ضبط لوحة تحكم الكابينه على الوضع MIN</span>
                  <OkNgSwitch value={cabinetControlMin} onChange={setCabinetControlMin} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">وجود السيلكون فى الاماكن المحدده ونظيف</span>
                  <OkNgSwitch value={siliconAppliedClean} onChange={setSiliconAppliedClean} />
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                6. نتائج قياس الفراغ بين نهاية الارفف الداخلية و الجسم الداخلي للكابينة
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2.5 rounded-lg border border-zinc-150">
                  <div>
                    <span className="text-xs text-zinc-700 font-bold block">x (يقــــــــــــــــــــــــاس بالضبعة)</span>
                    <span className="text-[9px] text-zinc-400">المواصفة: (3 ≤ x ≤ 8)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" step="0.5" value={shelfGapX} onChange={(e) => setShelfGapX(e.target.value)}
                      className={`w-20 px-2 py-1 rounded text-xs font-bold text-center border outline-none ${
                        isShelfGapXInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'
                      }`}
                    />
                    <span className="text-[10px] font-bold text-zinc-500">مم</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">F-Upper Shelf</span>
                  <OkNgSwitch value={fUpperShelfOk} onChange={setFUpperShelfOk} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">Upper G Garg -R</span>
                  <OkNgSwitch value={upperGGargR} onChange={setUpperGGargR} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">Lower G Garg -R</span>
                  <OkNgSwitch value={lowerGGargR} onChange={setLowerGGargR} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">G Garg -V</span>
                  <OkNgSwitch value={gGargV} onChange={setGGargV} />
                </div>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                7. إختبار قوة تثبيت الاجزاء الداخلية عند تعرضها لقوة شد 5Kgf
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">F-R Door Pocket</span>
                  <OkNgSwitch value={frDoorPocketTight} onChange={setFrDoorPocketTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">R-Door Pocket</span>
                  <OkNgSwitch value={rDoorPocketTight} onChange={setRDoorPocketTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">Utility</span>
                  <OkNgSwitch value={utilityTight} onChange={setUtilityTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">Bottle Pocket</span>
                  <OkNgSwitch value={bottlePocketTight} onChange={setBottlePocketTight} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">F-R Door Pocket (Lower)</span>
                  <OkNgSwitch value={frDoorPocketTight2} onChange={setFrDoorPocketTight2} />
                </div>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-1.5">
                <h4 className="text-xs font-bold text-zinc-900">
                  8. نتائج قياسات العينات للثلاجة المجمعة (مم)
                </h4>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded">
                  المواصفة المطبقة: (0 : {limitABC_LMN}) مم
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">تتغير حدود المواصفة (A, B, C, L, M, N) تلقائياً طبقاً للموديل المختار.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">A (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimA} onChange={(e) => setDimA(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimAInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">B (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimB} onChange={(e) => setDimB(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimBInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">C (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimC} onChange={(e) => setDimC(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimCInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">L (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimL} onChange={(e) => setDimL(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimLInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">M (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimM} onChange={(e) => setDimM(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimMInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">N (0:{limitABC_LMN})</label>
                  <input type="number" step="0.1" value={dimN} onChange={(e) => setDimN(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimNInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">D (قيمة)</label>
                  <input type="number" step="0.1" value={dimD} onChange={(e) => setDimD(e.target.value)} className="w-full text-xs font-bold p-1 rounded text-center border border-zinc-200 bg-white" />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">E (قيمة)</label>
                  <input type="number" step="0.1" value={dimE} onChange={(e) => setDimE(e.target.value)} className="w-full text-xs font-bold p-1 rounded text-center border border-zinc-200 bg-white" />
                </div>
                <div className="bg-zinc-100 p-2 rounded-lg border border-zinc-150 flex flex-col justify-center items-center">
                  <span className="text-[9px] text-zinc-500 font-bold">|D-E| ≤ 2</span>
                  <span className={`text-xs font-extrabold ${isDiffDEInvalid ? 'text-red-650' : 'text-emerald-750'}`}>
                    {diffDE.toFixed(1)} {isDiffDEInvalid ? '⚠️' : '✓'}
                  </span>
                </div>

                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150 col-span-1">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">Y (9.5:10.5)</label>
                  <input type="number" step="0.1" value={dimY} onChange={(e) => setDimY(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimYInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-150 col-span-1">
                  <label className="block text-[10px] text-zinc-600 mb-1 font-bold">Z (9.5:10.5)</label>
                  <input type="number" step="0.1" value={dimZ} onChange={(e) => setDimZ(e.target.value)} 
                    className={`w-full text-xs font-bold p-1 rounded text-center border ${isDimZInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                9. نتائج قياس العزوم و خلوص C Part مع Food Liner
              </h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-700 block">غلق ذاتي فريزر</span>
                      <span className="text-[9px] text-zinc-400 font-bold">المواصفة: ≥ 20mm</span>
                    </div>
                    <input type="number" value={selfCloseFreezer} onChange={(e) => setSelfCloseFreezer(e.target.value)} 
                      className={`w-16 text-xs font-bold p-1 rounded text-center border ${isSelfCloseFreezerInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                  </div>

                  <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-700 block">غلق ذاتي كابينة</span>
                      <span className="text-[9px] text-zinc-400 font-bold">المواصفة: ≥ 35mm</span>
                    </div>
                    <input type="number" value={selfCloseCabinet} onChange={(e) => setSelfCloseCabinet(e.target.value)} 
                      className={`w-16 text-xs font-bold p-1 rounded text-center border ${isSelfCloseCabinetInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                  </div>

                  <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-700 block">تلامس جوان فريزر</span>
                      <span className="text-[9px] text-zinc-400 font-bold">المواصفة: ≥ 7mm</span>
                    </div>
                    <input type="number" value={gasketContactFreezer} onChange={(e) => setGasketContactFreezer(e.target.value)} 
                      className={`w-16 text-xs font-bold p-1 rounded text-center border ${isGasketContactFreezerInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                  </div>

                  <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-700 block">تلامس جوان كابينة</span>
                      <span className="text-[9px] text-zinc-400 font-bold">المواصفة: ≥ 7mm</span>
                    </div>
                    <input type="number" value={gasketContactCabinet} onChange={(e) => setGasketContactCabinet(e.target.value)} 
                      className={`w-16 text-xs font-bold p-1 rounded text-center border ${isGasketContactCabinetInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                  </div>

                  <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-150 flex items-center justify-between sm:col-span-2">
                    <div>
                      <span className="text-[11px] text-zinc-700 font-bold block">قوة شد فتح الباب</span>
                      <span className="text-[9px] text-zinc-400">المواصفة: ≤ 5.0 Kgf</span>
                    </div>
                    <input type="number" step="0.1" value={doorPullForce} onChange={(e) => setDoorPullForce(e.target.value)} 
                      className={`w-16 text-xs font-bold p-1 rounded text-center border ${isDoorPullForceInvalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                  </div>
                </div>

                {/* Torques values */}
                <div className="border-t border-zinc-150 pt-2 space-y-2">
                  <span className="text-[10px] font-black text-zinc-600 block">عزوم المسامير (المواصفة لجميع المفصلات: 4.8 : 7.0 N.m)</span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center">
                      <span className="text-[9px] block font-bold">علوية A1</span>
                      <input type="number" step="0.1" value={torqueA1} onChange={(e) => setTorqueA1(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueA1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center">
                      <span className="text-[9px] block font-bold">علوية A2</span>
                      <input type="number" step="0.1" value={torqueA2} onChange={(e) => setTorqueA2(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueA2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center">
                      <span className="text-[9px] block font-bold">علوية A3</span>
                      <input type="number" step="0.1" value={torqueA3} onChange={(e) => setTorqueA3(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueA3Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>

                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center">
                      <span className="text-[9px] block font-bold">وسطى B1</span>
                      <input type="number" step="0.1" value={torqueB1} onChange={(e) => setTorqueB1(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueB1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center col-span-2">
                      <span className="text-[9px] block font-bold">وسطى B2</span>
                      <input type="number" step="0.1" value={torqueB2} onChange={(e) => setTorqueB2(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueB2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>

                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center">
                      <span className="text-[9px] block font-bold">سفلية C1</span>
                      <input type="number" step="0.1" value={torqueC1} onChange={(e) => setTorqueC1(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueC1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                    <div className="bg-zinc-50 p-1.5 rounded border border-zinc-200 text-center col-span-2">
                      <span className="text-[9px] block font-bold">سفلية C2</span>
                      <input type="number" step="0.1" value={torqueC2} onChange={(e) => setTorqueC2(e.target.value)} 
                        className={`w-full text-xs font-bold p-0.5 rounded text-center border ${isTorqueC2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-zinc-50 p-2 rounded border border-zinc-200">
                      <label className="block text-[10px] text-zinc-600 mb-0.5">T1 (≤ 1.5mm)</label>
                      <input type="number" step="0.1" value={torqueT1} onChange={(e) => setTorqueT1(e.target.value)} 
                        className={`w-full text-xs font-bold p-1 rounded text-center border ${isTorqueT1Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                    <div className="bg-zinc-50 p-2 rounded border border-zinc-200">
                      <label className="block text-[10px] text-zinc-600 mb-0.5">T2 (≤ 2.0mm)</label>
                      <input type="number" step="0.1" value={torqueT2} onChange={(e) => setTorqueT2(e.target.value)} 
                        className={`w-full text-xs font-bold p-1 rounded text-center border ${isTorqueT2Invalid ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-zinc-200'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 10 */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 border-b border-zinc-150 pb-1.5">
                10. إختبار التبريد والأداء العام
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">عدم وجود صوت غير طبيعى للثلاجه اثناء التشغيل</span>
                  <OkNgSwitch value={noAbnormalNoise} onChange={setNoAbnormalNoise} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">التاكد من تحقق التبريد بالثلاجه بعد التشغيل</span>
                  <OkNgSwitch value={coolingVerified} onChange={setCoolingVerified} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">إختبار اللمبة تطفي عند مســافه ≥ 25mm</span>
                  <OkNgSwitch value={lampTurnsOff} onChange={setLampTurnsOff} />
                </div>
                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-150">
                  <span className="text-[11px] text-zinc-700">اختبار check mode للموديل الديجيتال</span>
                  <OkNgSwitch value={checkModeDigital} onChange={setCheckModeDigital} />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>حفظ وتوثيق فحص العينة</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Live Preview / Interactive Report View (Always visible in browser, optimized for A4 Printing on print request) */}
        <div id="print-area" className="xl:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4 print:p-0 print:border-none print:shadow-none">
          
          {/* Printable Header */}
          <div className="border-b border-zinc-300 pb-3 flex flex-col items-center text-center space-y-1.5">
            <div className="w-full flex justify-between text-[8px] text-zinc-500 font-mono">
              <div className="text-right">
                <p>كود النموذج: FRQ-OG-18</p>
                <p>تاريخ الإصدار: 25/02/2024</p>
              </div>
              <div className="text-left">
                <p>كود الوثيقة الحاكمة: WRQ-OG-01</p>
                <p>النشاط: توكيد الجودة</p>
              </div>
            </div>

            <div className="border-t border-b border-zinc-200 py-2 w-full mt-1.5">
              <h2 className="text-xs font-black text-zinc-900 leading-normal">
                التقرير اليومي لنتائج التفتيش للعينات العشوائيه
              </h2>
              <h3 className="text-[11px] font-bold text-zinc-800 tracking-tight leading-normal" dir="ltr">
                Q.A LAB DAILY REPORT for<br />
                (48C/A/T & 58C/A/T & 580/480A/T)
              </h3>
            </div>

            <div className="w-full text-[9px] font-bold text-zinc-700 text-right mt-1.5 flex justify-between items-center bg-zinc-50 px-2 py-1.5 rounded">
              <span>إدارة توكيد جودة المنتج النهائى</span>
              <span>مصنع الأجهزة المنزلية (B)</span>
            </div>
          </div>

          {/* Quick Summary Meta */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
            <div>
              <span className="text-zinc-550 block font-bold">التاريخ:</span>
              <span className="font-bold text-zinc-900">{date}</span>
            </div>
            <div>
              <span className="text-zinc-550 block font-bold">الوردية:</span>
              <span className="font-bold text-zinc-900">الوردية {shift}</span>
            </div>
            <div>
              <span className="text-zinc-550 block font-bold">الموديل:</span>
              <span className="font-bold text-zinc-900">{model}</span>
            </div>
            <div>
              <span className="text-zinc-550 block font-bold">الرقم العام (الباركود):</span>
              <span className="font-mono font-bold text-zinc-900 truncate block" title={barcode}>
                {barcode || 'معلق/لم يسجل بعد'}
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          <div className={`p-2.5 rounded-xl text-center border font-black text-xs ${
            overallStatus === 'PASS' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            الحالة العامة للمطابقة: {overallStatus === 'PASS' ? 'مقبول (PASS)' : 'مرفوض (FAIL)'}
          </div>

          {/* Inspection Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[9px] border-collapse border border-zinc-250">
              <thead>
                <tr className="bg-zinc-100 text-zinc-800 font-bold border-b border-zinc-250">
                  <th className="p-1 border-l border-zinc-250">البند وموضع الاختبار والقياس</th>
                  <th className="p-1 border-l border-zinc-250 text-center w-12">المواصفة</th>
                  <th className="p-1 text-center w-12">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {/* Sec 1 */}
                <tr className="bg-zinc-50/50">
                  <td className="p-1 border-l border-zinc-200 font-bold">1. سلامة مكونات التعبئة والتغليف ومطابقتها</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className={`p-1 text-center font-bold ${packagingOk === 'NG' ? 'text-red-650' : 'text-emerald-700'}`}>{packagingOk}</td>
                </tr>
                {/* Sec 2 */}
                <tr>
                  <td className="p-1 border-l border-zinc-200">2.1 تطابق درجة لون الثلاجة مع الباركود</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className={`p-1 text-center font-bold ${colorMatch === 'NG' ? 'text-red-650' : 'text-emerald-700'}`}>{colorMatch}</td>
                </tr>
                <tr>
                  <td className="p-1 border-l border-zinc-200">2.2 تموج جانبى الثلاجه الخارجى صاج</td>
                  <td className="p-1 border-l border-zinc-200 text-center">≤ 1.0mm</td>
                  <td className={`p-1 text-center font-bold ${isWavinessInvalid ? 'text-red-650' : 'text-emerald-700'}`}>{wavinessValue} mm</td>
                </tr>
                {/* Sec 3 */}
                <tr className="bg-zinc-50/50">
                  <td className="p-1 border-l border-zinc-200 font-bold">3. فحص الأبواب والجوان واللوجو واليد</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className={`p-1 text-center font-bold ${
                    (doorNoScratch==='NG'||doorColorMatch==='NG'||doorHandleOk==='NG'||doorNoNoise==='NG'||doorGasketOk==='NG'||badgeAssemblyOk==='NG'||gasketNoClearance==='NG')
                      ? 'text-red-650' : 'text-emerald-700'
                  }`}>
                    {(doorNoScratch==='NG'||doorColorMatch==='NG'||doorHandleOk==='NG'||doorNoNoise==='NG'||doorGasketOk==='NG'||badgeAssemblyOk==='NG'||gasketNoClearance==='NG') ? 'NG' : 'OK'}
                  </td>
                </tr>
                {/* Sec 4 */}
                <tr>
                  <td className="p-1 border-l border-zinc-200">4.1 اختبار بدء التشغيل 187V</td>
                  <td className="p-1 border-l border-zinc-200 text-center">0.1:30A</td>
                  <td className={`p-1 text-center font-bold ${isElecStartCurrentInvalid ? 'text-red-650' : 'text-emerald-700'}`}>{elecStartCurrent} A</td>
                </tr>
                <tr>
                  <td className="p-1 border-l border-zinc-200">4.2 اختبار الارضى 25A, 5s</td>
                  <td className="p-1 border-l border-zinc-200 text-center">≤ 120mΩ</td>
                  <td className={`p-1 text-center font-bold ${isElecGroundResInvalid ? 'text-red-650' : 'text-emerald-700'}`}>{elecGroundRes} mΩ</td>
                </tr>
                <tr>
                  <td className="p-1 border-l border-zinc-200">4.3 اختبار تسريب الفريون</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className={`p-1 text-center font-bold ${gasLeakTest === 'NG' ? 'text-red-650' : 'text-emerald-700'}`}>{gasLeakTest}</td>
                </tr>
                {/* Sec 5 */}
                <tr className="bg-zinc-50/50">
                  <td className="p-1 border-l border-zinc-200 font-bold">5. الفحص الظاهري الداخلي وضبط اللوحات</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className="p-1 text-center font-bold text-emerald-700">OK</td>
                </tr>
                {/* Sec 6 */}
                <tr>
                  <td className="p-1 border-l border-zinc-200">6. قياس الفراغ x بالضبعة</td>
                  <td className="p-1 border-l border-zinc-200 text-center">3 ≤ x ≤ 8</td>
                  <td className={`p-1 text-center font-bold ${isShelfGapXInvalid ? 'text-red-650' : 'text-emerald-700'}`}>{shelfGapX} mm</td>
                </tr>
                {/* Sec 8 */}
                <tr className="bg-zinc-50/50">
                  <td className="p-1 border-l border-zinc-200 font-bold">8. قياسات أبعاد الثلاجة المجمعة (A,B,C)</td>
                  <td className="p-1 border-l border-zinc-200 text-center">≤{limitABC_LMN}mm</td>
                  <td className={`p-1 text-center font-bold ${
                    (isDimAInvalid || isDimBInvalid || isDimCInvalid || isDimLInvalid || isDimMInvalid || isDimNInvalid || isDiffDEInvalid)
                      ? 'text-red-650' : 'text-emerald-700'
                  }`}>
                    A: {dimA} | B: {dimB} | C: {dimC}
                  </td>
                </tr>
                {/* Sec 9 */}
                <tr>
                  <td className="p-1 border-l border-zinc-200">9.1 مسافة الغلق الذاتي (فريزر/كابينة)</td>
                  <td className="p-1 border-l border-zinc-200 text-center">≥20 / ≥35</td>
                  <td className="p-1 text-center font-bold font-mono">
                    {selfCloseFreezer}/{selfCloseCabinet}
                  </td>
                </tr>
                <tr>
                  <td className="p-1 border-l border-zinc-200">9.2 عزوم ربط مسامير المفصلة العلوية</td>
                  <td className="p-1 border-l border-zinc-200 text-center">4.8:7.0 Nm</td>
                  <td className="p-1 text-center font-bold font-mono text-zinc-700">
                    {torqueA1} | {torqueA2} | {torqueA3}
                  </td>
                </tr>
                {/* Sec 10 */}
                <tr className="bg-zinc-50/50">
                  <td className="p-1 border-l border-zinc-200 font-bold">10. اختبارات التبريد والأصوات واللمبة</td>
                  <td className="p-1 border-l border-zinc-200 text-center">Ok/NG</td>
                  <td className={`p-1 text-center font-bold ${
                    (noAbnormalNoise === 'NG' || coolingVerified === 'NG' || lampTurnsOff === 'NG' || checkModeDigital === 'NG')
                      ? 'text-red-650' : 'text-emerald-700'
                  }`}>
                    {(noAbnormalNoise === 'NG' || coolingVerified === 'NG' || lampTurnsOff === 'NG' || checkModeDigital === 'NG') ? 'NG' : 'OK'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Printable Footer / Signatures */}
          <div className="border-t border-zinc-300 pt-4 mt-4 grid grid-cols-2 gap-4 text-[9px]">
            <div className="text-center space-y-3">
              <p className="font-bold text-zinc-700">توقيع القائم بالفحص (QA Inspector)</p>
              <div className="h-8 border-b border-dashed border-zinc-300 w-3/4 mx-auto"></div>
              <p className="font-mono text-zinc-500">{inspectorName || '___________'}</p>
            </div>
            <div className="text-center space-y-3">
              <p className="font-bold text-zinc-700">توقيع القائم بالتسجيل والتدقيق</p>
              <div className="h-8 border-b border-dashed border-zinc-300 w-3/4 mx-auto"></div>
              <p className="font-mono text-zinc-500">{registererName || '___________'}</p>
            </div>
          </div>

          <div className="text-[7.5px] text-zinc-400 font-mono text-center pt-2 border-t border-zinc-150">
            تم التوليد والتصدير الفوري بواسطة نظام توكيد جودة مصنع B - توشيبا العربي
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
