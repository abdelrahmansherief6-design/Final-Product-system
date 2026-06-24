/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefrigeratorModel, ProductionLine, ChecklistItem, DefectOption, QualityInspectionLog, ProcessAuditLog } from './types';

export const REFRIGERATOR_MODELS: RefrigeratorModel[] = [
  { id: 'MOD_450L', name: 'ثلاجة العربي توشيبا 450 لتر نوفروست', type: 'No Frost', factoryId: 'LINE_A' },
  { id: 'MOD_340L', name: 'ثلاجة العربي شارب 340 لتر ديفروست', type: 'Defrost', factoryId: 'LINE_B' },
  { id: 'MOD_520L_DIG', name: 'ثلاجة العربي تورنيدو 520 لتر ديجيتال', type: 'No Frost', factoryId: 'LINE_C' },
  { id: 'MOD_600L_SMART', name: 'ثلاجة العربي الذكية 600 لتر 4 أبواب', type: 'No Frost', factoryId: 'LINE_A' },
];

export const PRODUCTION_LINES: ProductionLine[] = [
  { id: 'LINE_A', name: 'مصنع A', supervisorName: 'م. هاني العشري' },
  { id: 'LINE_B', name: 'مصنع B', supervisorName: 'م. سعيد عبد الجواد' },
  { id: 'LINE_C', name: 'مصنع C', supervisorName: 'م. أشرف رسلان' },
];

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'CHK_EXT_1', label: 'سلامة الهيكل الخارجي والصاج (خلوه من الخدوش والنقر)', category: 'exterior', description: 'فحص البودي الخارجي بالكامل والباب' },
  { id: 'CHK_EXT_2', label: 'تطابق محاذاة الأبواب وإحكام إغلاق المغناطيس', category: 'exterior', description: 'تأكيد عدم وجود فجوات في الجواكت' },
  { id: 'CHK_COOL_1', label: 'ضغط واهتزاز دائرة التبريد (الضاغط والردياتير)', category: 'cooling', description: 'معدل الاهتزاز والضوضاء الطبيعية' },
  { id: 'CHK_COOL_2', label: 'خلو الدائرة من تسريبات غاز آر-600أ', category: 'cooling', description: 'استخدام جهاز كاشف التسريب الإلكتروني على البلوف' },
  { id: 'CHK_ELEC_1', label: 'سلامة ضفيرة التوصيلات الكهربائية الأرضية والعامة', category: 'electrical', description: 'سلامة الترامل والعزل' },
  { id: 'CHK_ELEC_2', label: 'عمل شاشة الديجيتال ومستشعرات ضبط الحرارة واللمس', category: 'electrical', description: 'اختبار الاستجابة وتثبيت السوفت وير' },
  { id: 'CHK_SAFE_1', label: 'اختبار العزل الكهربائي للأجزاء المعدنية (Leakage Test)', category: 'safety', description: 'اختبار الجهد المرتفع للامان الصناعي' },
  { id: 'CHK_ACC_1', label: 'سلامة الإضاءة الداخلية وتركيب كامل الأدراج والرفوف', category: 'accessories', description: 'جودة البلاستيك وسلامة الرفوف من الكسور' },
];

export const DEFECT_OPTIONS: DefectOption[] = [
  { id: 'DEF_BODY_SCRATCH', label: 'خدش أو نقر في المظهر الخارجي أو الباب', category: 'exterior', severity: 'MINOR' },
  { id: 'DEF_GASKET_GAP', label: 'تسريب هواء / عدم إطباق كاوتش الباب (الجواكت)', category: 'exterior', severity: 'MAJOR' },
  { id: 'DEF_GAS_LEAK', label: 'وجود تنفيس / تسريب في غاز التبريد R600a', category: 'cooling', severity: 'CRITICAL' },
  { id: 'DEF_COMPRESSOR_NOISE', label: 'ضوضاء مرتفعة أو اهتزاز غير طبيعي بالضاغط', category: 'cooling', severity: 'MAJOR' },
  { id: 'DEF_WIRE_DISCONNECT', label: 'قطع أو فصل جزئي في التوصيلات أو كابل الأرضي', category: 'electrical', severity: 'CRITICAL' },
  { id: 'DEF_DIGITAL_FAULT', label: 'عدم استجابة شاشة التحكم أو قراءة خاطئة للسينسور', category: 'electrical', severity: 'MAJOR' },
  { id: 'DEF_SHELF_CRACK', label: 'كسر أو شرخ في الأرفف الداخلية أو درج الخضروات', category: 'accessories', severity: 'MINOR' },
  { id: 'DEF_GROUND_LEAK', label: 'فشل اختبار تيار التسريب الأرضي (ماس كهربائي)', category: 'safety', severity: 'CRITICAL' },
];

// Helper to generate dynamic serial numbers
export function generateSerialNumber(lineId: string, modelId: string): string {
  const lineLetter = lineId.split('_')[1];
  const modelCode = modelId.split('_')[1];
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `AR-${lineLetter}-${modelCode}-${rand}`;
}

// Generate realistic dummy history for the last 7 days
export function generateSeedData(): { inspections: QualityInspectionLog[], audits: ProcessAuditLog[] } {
  const logs: QualityInspectionLog[] = [];
  const audits: ProcessAuditLog[] = [];
  
  const technicians = [
    { sap: '20114059', name: 'أحمد الشناوي - فني جودة' },
    { sap: '20114092', name: 'محمود عبد السلام - فني جودة' },
    { sap: '20115011', name: 'مصطفى البحيري - فني جودة' },
  ];

  const supervisors = [
    { id: 'SUP_HANI', name: 'م. هاني العشري' },
    { id: 'SUP_SAEED', name: 'م. سعيد عبد الجواد' },
    { id: 'SUP_ASHRAF', name: 'م. أشرف رسلان' },
  ];

  const now = new Date();
  
  // Historical inspections over 7 days
  for (let d = 7; d >= 0; d--) {
    const dayDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    
    // Number of refrigerators produced each day (e.g. 15 to 25 logs)
    const count = d === 0 ? 6 : Math.floor(Math.random() * 8) + 14; 
    
    for (let c = 0; c < count; c++) {
      const line = PRODUCTION_LINES[c % PRODUCTION_LINES.length];
      const model = REFRIGERATOR_MODELS[Math.floor(Math.random() * REFRIGERATOR_MODELS.length)];
      const tech = technicians[Math.floor(Math.random() * technicians.length)];
      
      const serial = `AR-${line.id.substring(5)}-${model.id.substring(4)}-${Math.floor(Math.random() * 9000) + 1000}`;
      
      // Hourly timestamp spread
      const timestamp = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60)).toISOString();
      
      // Let's make an 85% pass rate (healthy, but with real failure spots for analytics)
      const isPass = Math.random() > 0.15;
      
      const checkedItems: Record<string, boolean> = {};
      CHECKLIST_ITEMS.forEach(item => {
        checkedItems[item.id] = isPass ? true : (Math.random() > 0.08); // 8% chance of failure per item if overall failed
      });
      
      // Ensure if failed, at least one item is false, and add defects
      const defects: { defectOptionId: string; details?: string; }[] = [];
      if (!isPass) {
        CHECKLIST_ITEMS.forEach(item => {
          if (!checkedItems[item.id]) {
            // Find appropriate defect option to map
            const matchedDefect = DEFECT_OPTIONS.find(d => d.category === item.category);
            if (matchedDefect && !defects.some(d => d.defectOptionId === matchedDefect.id)) {
              defects.push({ defectOptionId: matchedDefect.id, details: 'فشل الفحص أثناء التجميع التلقائي' });
            }
          }
        });
        
        // If still empty defects, add a random one
        if (defects.length === 0) {
          const randDef = DEFECT_OPTIONS[Math.floor(Math.random() * DEFECT_OPTIONS.length)];
          defects.push({ defectOptionId: randDef.id, details: 'تم الرصد يدويًا' });
        }
      }

      // If failed, supervisor has either approved them after repair (70% of older ones) or pending (newer ones)
      let supervisorApproved = undefined;
      let recheckStatus = undefined;
      let approvalTimestamp = undefined;
      
      if (!isPass) {
        if (d > 0) {
          // older ones are resolved
          if (Math.random() > 0.15) {
            supervisorApproved = true;
            recheckStatus = 'APPROVED_AFTER_REPAIR';
            approvalTimestamp = new Date(new Date(timestamp).getTime() + 2 * 60 * 60 * 1000).toISOString();
          } else {
            supervisorApproved = false;
            recheckStatus = 'SCRAPPED';
            approvalTimestamp = new Date(new Date(timestamp).getTime() + 3 * 60 * 60 * 1000).toISOString();
          }
        } else {
          // today's defects
          if (Math.random() > 0.5) {
            supervisorApproved = true;
            recheckStatus = 'APPROVED_AFTER_REPAIR';
            approvalTimestamp = new Date(new Date(timestamp).getTime() + 45 * 60 * 1000).toISOString();
          } else {
            recheckStatus = 'PENDING';
          }
        }
      }

      logs.push({
        id: `LOG-${dayDate.getDate()}-${c}-${Math.floor(Math.random() * 10000)}`,
        serialNumber: serial,
        modelId: model.id,
        lineId: line.id,
        inspectorSap: tech.sap,
        inspectorName: tech.name,
        timestamp,
        status: isPass ? 'PASS' : 'FAIL',
        checkedItems,
        defects,
        supervisorApproved,
        approvalTimestamp,
        recheckStatus
      });
    }

    // Add Process Quality audits once per day (Line Audits)
    if (d > 0) {
      PRODUCTION_LINES.forEach((line, idx) => {
        const sv = supervisors[idx];
        const auditTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 11, Math.floor(Math.random() * 60)).toISOString();
        
        // standard ranges
        // welding temp: 370-390
        // foam density: 36-40
        // gas pressure: 2.1 - 2.6
        // vacuum: 0.02 - 0.08
        const weldingTemp = 370 + Math.floor(Math.random() * 25);
        const foamingDensity = 36 + Math.floor(Math.random() * 5);
        const gasPressure = Math.round((2.1 + Math.random() * 0.5) * 10) / 10;
        const vacuum = Math.round((0.02 + Math.random() * 0.06) * 100) / 100;
        
        audits.push({
          id: `PA-${dayDate.getDate()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          lineId: line.id,
          auditorId: sv.id,
          auditorName: sv.name,
          timestamp: auditTime,
          weldingStationTemp: weldingTemp,
          weldingOK: weldingTemp >= 375 && weldingTemp <= 395,
          foamingDensity: foamingDensity,
          foamingOK: foamingDensity >= 37 && foamingDensity <= 41,
          gasChargingPressure: gasPressure,
          gasChargingOK: gasPressure >= 2.2 && gasPressure <= 2.5,
          vacuumLevel: vacuum,
          vacuumOK: vacuum <= 0.06,
          safetyGroundLeakageOK: true,
          notes: 'عمليات التفتيش المعيارية مطابقة لمواصفات شركة توشيبا العربي.'
        });
      });
    }
  }

  return { inspections: logs, audits };
}
