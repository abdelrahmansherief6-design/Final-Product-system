/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, ManagedUser } from '../types';
import { Wifi, WifiOff, Smartphone, ChevronRight, AlertCircle, Sparkles, Plus, CheckCircle, Info, Share2, HelpCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
  users: ManagedUser[];
}

export default function Login({ onLogin, users }: LoginProps) {
  // Network connection state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Selected Factory state: LINE_A | LINE_B | LINE_C | ALL
  const [selectedFactory, setSelectedFactory] = useState<'LINE_A' | 'LINE_B' | 'LINE_C' | 'ALL'>('LINE_A');
  const [sapNumber, setSapNumber] = useState('');
  const [error, setError] = useState('');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Monitor PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforebeforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleQuickLogin = (userObj: ManagedUser) => {
    setSapNumber(userObj.sapNumber);
    setError('');
    
    // Auto submit/login
    const matchedRole = userObj.role;
    onLogin({
      id: `USER-${userObj.sapNumber}`,
      name: userObj.name,
      role: matchedRole,
      sapNumber: userObj.sapNumber,
      code: userObj.sapNumber,
      factoryId: userObj.factoryId
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sapNumber.trim()) {
      setError('يرجى إدخال رقم الساب (SAP ID) أولاً.');
      return;
    }

    // Owner override
    if (sapNumber === '40016452') {
      onLogin({
        id: 'USER-40016452',
        name: 'عبد الرحمن شريف (مالك الموقع)',
        role: 'MANAGER',
        sapNumber: '40016452',
        code: '40016452',
        factoryId: 'ALL'
      });
      return;
    }

    // General Managers override
    if (sapNumber === '12345678') {
      onLogin({
        id: 'USER-12345678',
        name: 'المدير العام (صلاحية كاملة)',
        role: 'MANAGER',
        sapNumber: '12345678',
        code: '12345678',
        factoryId: 'ALL'
      });
      return;
    }

    // Normal user validation
    const matched = users.find(u => u.sapNumber === sapNumber);
    if (!matched) {
      setError('رقم الساب هذا غير مسجل في قاعدة البيانات. يرجى التواصل مع مالك الموقع لإضافته.');
      return;
    }

    // Check factory compatibility
    // If selectedFactory is ALL (Manager/Owner), user must be MANAGER role and factory ALL
    if (selectedFactory === 'ALL') {
      if (matched.role !== 'MANAGER' && matched.factoryId !== 'ALL') {
        setError('عذرًا، هذا المعرف ليس لديه صلاحيات الإدارة العامة. يرجى اختيار المصنع المناسب.');
        return;
      }
    } else {
      // If selected a specific factory, user must belong to that factory OR be a global manager
      if (matched.factoryId !== 'ALL' && matched.factoryId !== selectedFactory) {
        const factoryNames: Record<string, string> = {
          'LINE_A': 'مصنع A',
          'LINE_B': 'مصنع B',
          'LINE_C': 'مصنع C',
        };
        setError(`عذرًا، هذا المستخدم تابع لـ (${factoryNames[matched.factoryId] || matched.factoryId}) ولا يحق له الدخول لـ (${factoryNames[selectedFactory] || selectedFactory}).`);
        return;
      }
    }

    // Successful Login
    onLogin({
      id: `USER-${matched.sapNumber}`,
      name: matched.name,
      role: matched.role,
      sapNumber: matched.sapNumber,
      code: matched.sapNumber,
      factoryId: matched.factoryId
    });
  };

  // Filter users registered for currently selected factory to display in quick access list
  const filteredUsersForDisplay = users.filter(u => {
    if (u.sapNumber === '40016452') return true; // Show owner
    if (selectedFactory === 'ALL') {
      return u.role === 'MANAGER' || u.factoryId === 'ALL';
    }
    return u.factoryId === selectedFactory;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-800 flex flex-col justify-between p-4 relative font-sans antialiased" dir="rtl">
      {/* Background radial soft light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-50 -z-10" />

      {/* Top Header Branding Row */}
      <header className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b border-zinc-200/80">
        {/* Left: Online Status Indicator */}
        <div className="flex items-center gap-2 sm:order-1">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
            isOnline 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'} block`} />
            {isOnline ? (
              <span className="flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                متصل بالإنترنت
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff className="w-3.5 h-3.5 shrink-0 text-red-600" />
                غير متصل بالإنترنت
              </span>
            )}
          </div>
        </div>

        {/* Center: Refrigerator group Title */}
        <div className="text-center font-extrabold text-blue-900 text-lg sm:text-xl tracking-wider font-sans sm:order-2">
          Refrigerator group
        </div>

        {/* Right: Elaraby Group Logo */}
        <div className="flex items-center gap-3 sm:order-3">
          <div className="text-right">
            <span className="text-base font-extrabold tracking-tight text-blue-900 block font-sans">
              ELARABY Group
            </span>
            <span className="text-xs font-bold text-zinc-500 block leading-tight">
              صناع الثقة
            </span>
          </div>
          <div className="bg-blue-900 text-white font-black p-2.5 rounded-xl shadow-sm flex items-center justify-center text-lg tracking-widest w-12 h-12 select-none">
            QA
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 max-w-md w-full mx-auto">
        
        {/* Phone Installation Banner - exact replica of screenshot design */}
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#1e40af] text-white rounded-t-2xl p-4 flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold leading-snug">ثبت التطبيق على هاتفك</h3>
              <p className="text-[10px] text-blue-100 mt-0.5 font-sans">لسهولة الوصول وسرعة الفحص</p>
            </div>
          </div>
          <button
            onClick={handleInstallApp}
            className="bg-white text-blue-900 hover:bg-blue-50 text-[11px] font-extrabold px-4 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <span>تثبيت</span>
          </button>
        </motion.div>

        {/* Login White Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white border-x border-b border-zinc-200/80 rounded-b-2xl shadow-sm p-6 space-y-6"
        >
          {/* Lock Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-zinc-150">
              <span className="text-blue-600 font-extrabold text-base">👤</span>
            </div>
            <h2 className="text-lg font-black text-zinc-900">تسجيل الدخول</h2>
            <p className="text-xs text-zinc-500 font-sans">يرجى إدخال بيانات الوردية للمتابعة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Step 1: Select Factory (أولاً اختيار المصنع) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">الخطوة 1: اختر المصنع التابع له</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedFactory('LINE_A'); setError(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedFactory === 'LINE_A'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                  }`}
                >
                  مصنع A
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedFactory('LINE_B'); setError(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedFactory === 'LINE_B'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                  }`}
                >
                  مصنع B
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedFactory('LINE_C'); setError(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedFactory === 'LINE_C'
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                  }`}
                >
                  مصنع C
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedFactory('ALL'); setError(''); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    selectedFactory === 'ALL'
                      ? 'bg-blue-900 border-blue-950 text-white shadow-sm'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-650 hover:bg-zinc-100'
                  }`}
                >
                  المديرين
                </button>
              </div>
            </div>

            {/* Step 2: Input SAP Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700">الخطوة 2: رقم الساب (SAP ID)</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  value={sapNumber}
                  onChange={(e) => {
                    setSapNumber(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  placeholder="أدخل رقم الساب..."
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-center font-mono font-bold text-base text-zinc-950 placeholder:text-zinc-400 focus:outline-none transition-all"
                  required
                />
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                * أدخل رقم ساب المكون من 8 أرقام (مثال المالك: <strong className="text-blue-700 select-all font-mono">40016452</strong> أو المديرين: <strong className="text-blue-700 select-all font-mono">12345678</strong>).
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 border border-red-150 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-sm font-bold text-white py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>دخول بوابة توكيد الجودة</span>
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </motion.div>
      </main>

      {/* Dynamic PWA Custom Installation Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 bg-zinc-950/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-black text-zinc-950 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  تثبيت التطبيق على هاتف المحمول
                </h3>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-base font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-650">
                <p className="font-bold text-zinc-900">يمكنك تثبيت تطبيق العربي لتوكيد الجودة على هاتفك المحمول كشاشة رئيسية ليكون سريع العمل وسهل الاستخدام عن طريق الخطوات التالية:</p>

                {/* Android Chrome Instructions */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                  <h4 className="font-black text-zinc-900 flex items-center gap-1 text-xs">
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-sans">1</span>
                    هواتف الأندرويد (متصفح كروم):
                  </h4>
                  <p>اضغط على زر الخيارات (الثلاث نقاط المجاورة لشريط العنوان) ثم اختر <strong className="text-blue-700">"تثبيت التطبيق" (Install App)</strong> أو "إضافة إلى الشاشة الرئيسية".</p>
                </div>

                {/* iPhone Safari Instructions */}
                <div className="bg-slate-50 p-3 rounded-xl space-y-2">
                  <h4 className="font-black text-zinc-900 flex items-center gap-1 text-xs">
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-sans">2</span>
                    هواتف الآيفون (متصفح سفاري):
                  </h4>
                  <p>1. اضغط على زر <strong className="text-blue-700 flex items-center gap-0.5 inline-flex">مشاركة <Share2 className="w-3 h-3 text-blue-600" /></strong> في شريط السفاري السفلي.</p>
                  <p>2. اختر <strong className="text-blue-700">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong> من قائمة الخيارات المنسدلة.</p>
                </div>
              </div>

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                حسناً، فهمت الطريقة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Copyright */}
      <footer className="w-full text-center pb-4 text-zinc-400 text-[10px] font-sans">
        <p>© {new Date().getFullYear()} ELARABY QA ENGINE • REFRIGERATOR FACTORY QA/QC</p>
        <p className="mt-1">نظام العربي الرقمي المتكامل لتوكيد جودة الثلاجات</p>
      </footer>
    </div>
  );
}
