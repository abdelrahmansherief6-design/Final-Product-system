/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserRole } from '../types';
import { ShieldCheck, Award, Wrench, ChevronRight, Lock, KeyRound } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, identifier: string, name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [activeTab, setActiveTab] = useState<UserRole>('TECHNICIAN');
  const [sapNumber, setSapNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Predefined demo accounts to help the user test the interface quickly
  const demoTechnicians = [
    { sap: '20114059', name: 'أحمد الشناوي' },
    { sap: '20114092', name: 'محمود عبد السلام' },
    { sap: '20115011', name: 'مصطفى البحيري' },
  ];

  const handleDemoClick = (sap: string, name: string) => {
    onLogin('TECHNICIAN', sap, name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'TECHNICIAN') {
      if (!/^\d{8}$/.test(sapNumber)) {
        setError('يرجى إدخال رقم ساب (SAP) صحيح مكون من 8 أرقام فقط.');
        return;
      }
      // Simulate technician resolution
      const matched = demoTechnicians.find(t => t.sap === sapNumber);
      const name = matched ? matched.name : `فني جودة رقم ${sapNumber}`;
      onLogin('TECHNICIAN', sapNumber, name);
    } else if (activeTab === 'SUPERVISOR') {
      if (password === '1234' || password === 'SUP2026') {
        onLogin('SUPERVISOR', 'SUP_HANI', 'م. هاني العشري (مشرف الجودة)');
      } else {
        setError('رمز المرور غير صحيح. (تلميح للتجربة: 1234)');
      }
    } else if (activeTab === 'MANAGER') {
      if (password === '5678' || password === 'MGR2026') {
        onLogin('MANAGER', 'MGR_SHERIEF', 'م. ممدوح الشريف (مدير توكيد الجودة)');
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة. (تلميح للتجربة: 5678)');
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-zinc-800 flex flex-col justify-between p-4 selection:bg-red-500 selection:text-white relative" dir="rtl">
      {/* Dynamic Background Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-500/5 via-neutral-50 to-neutral-50 -z-10" />

      {/* Header Branding */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center pt-10 pb-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="bg-red-650 p-2.5 rounded-xl shadow-sm">
            <Award className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-[11px] font-sans tracking-widest text-red-600 font-extrabold block">ELARABY GROUP</span>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 font-sans">شركة العربي للصناعات الهندسية</h1>
          </div>
        </motion.div>
        <p className="text-zinc-500 text-xs font-sans text-center max-w-md mt-1">
          مصنع الثلاجات - البوابة الرقمية المتكاملة لتوكيد جودة المنتج النهائي (QA) وضبط العمليات (QC)
        </p>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Logo illustration or pattern */}
          <div className="bg-zinc-50/80 p-6 border-b border-zinc-200/50 flex flex-col items-center text-center">
            <span className="text-[11px] font-sans bg-blue-50 text-blue-600 border border-blue-150 px-3 py-0.5 rounded-full mb-3 uppercase font-bold">
              تأمين الوصول الموحد
            </span>
            <h2 className="text-base font-bold text-zinc-900">تسجيل الدخول للمنظومة</h2>
            <p className="text-xs text-zinc-500 mt-1">يرجى اختيار فئة الصلاحية الخاصة بك والمتابعة</p>
          </div>

          {/* User Role Switching tabs */}
          <div className="grid grid-cols-3 p-1.5 bg-zinc-50 border-b border-zinc-200/50 gap-1">
            <button
              onClick={() => { setActiveTab('TECHNICIAN'); setError(''); }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'TECHNICIAN'
                  ? 'bg-white text-blue-600 border border-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/45'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>فني الجودة</span>
            </button>
            <button
              onClick={() => { setActiveTab('SUPERVISOR'); setError(''); }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'SUPERVISOR'
                  ? 'bg-white text-blue-600 border border-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-805 hover:bg-white/45'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>مشرف الخط</span>
            </button>
            <button
              onClick={() => { setActiveTab('MANAGER'); setError(''); }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MANAGER'
                  ? 'bg-white text-blue-605 border border-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-805 hover:bg-white/45'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>المدير/المهندس</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {activeTab === 'TECHNICIAN' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-2">رقم الساب الوظيفي (SAP ID)</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={8}
                        value={sapNumber}
                        onChange={(e) => setSapNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="مثال: 20114059"
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-left font-mono font-bold text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono">
                        # SAP
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      يجب إدخال المعرف الوظيفي المتكامل في نظام ساب الخاص بالمجموعة (8 أرقام).
                    </p>
                  </div>

                  {/* Demo Speed Access */}
                  <div className="bg-zinc-50/70 rounded-xl p-3 border border-zinc-200/50">
                    <span className="text-[10px] text-zinc-500 uppercase font-sans tracking-wide font-bold block mb-2">
                      تسجيل دخول سريع بالفنيين الافتراضيين للتجربة:
                    </span>
                    <div className="space-y-1.5">
                      {demoTechnicians.map((tech) => (
                        <button
                          key={tech.sap}
                          type="button"
                          onClick={() => handleDemoClick(tech.sap, tech.name)}
                          className="w-full flex items-center justify-between text-xs bg-white border border-zinc-200 hover:border-blue-500/50 hover:bg-zinc-50 px-3 py-2 rounded-lg text-zinc-700 transition-all text-right"
                        >
                          <span className="font-bold text-zinc-800">{tech.name}</span>
                          <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-[10px] text-blue-650 font-bold">
                            {tech.sap}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'SUPERVISOR' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-2">رمز مرور مشرف الخط (Supervisor Code)</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل رمز المرور"
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-center font-mono text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all"
                        required
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                    <p className="text-[11px] text-blue-655 mt-1.5 font-sans">
                      رمز المرور للتجربة السريعة هو: <strong className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800 font-bold ml-1">1234</strong>
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'MANAGER' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 font-bold mb-2">كلمة مرور مهندس/مدير توكيد الجودة</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-center font-mono text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none transition-all"
                        required
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    </div>
                    <p className="text-[11px] text-blue-655 mt-1.5 font-sans">
                      كلمة المرور للتجربة السريعة هي: <strong className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800 font-bold ml-1">5678</strong>
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-150 text-red-700 text-xs px-3.5 py-2.5 rounded-xl font-sans"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white py-3 px-4 rounded-xl transition-all h-12 shadow-sm bg-blue-600 hover:bg-blue-700 shadow-blue-100"
              >
                <span>دخول بوابة توكيد الجودة</span>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Footer Credentials */}
      <div className="w-full text-center pb-6 text-zinc-400 text-[10px] font-sans select-none">
        <p>© {new Date().getFullYear()} ELARABY QA ENGINE • REFRIGERATOR FACTORY QA/QC</p>
        <p className="mt-1 text-zinc-400">قناة الاتصالات ومراقبة الجودة المؤمنة رقميًا</p>
      </div>
    </div>
  );
}
