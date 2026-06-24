/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog, UserRole, ManagedUser, RefrigeratorModel } from './types';
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

  // Keep localStorage sync'd
  useEffect(() => {
    localStorage.setItem('elaraby_qa_inspections', JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_process_audits', JSON.stringify(processAudits));
  }, [processAudits]);

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
          models={models}
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
        />
      )}
    </div>
  );
}
